import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, AlertTriangle, CheckCircle2, Clock, ArrowRight, Search } from 'lucide-react'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase } from '../lib/supabase'

const SEVERITY_STYLES = {
  cosmetic:   { bg: 'rgba(81,198,219,0.1)',  border: 'rgba(81,198,219,0.3)',  color: '#1188a0', label: 'Cosmetic'   },
  functional: { bg: 'rgba(176,106,0,0.1)',   border: 'rgba(176,106,0,0.3)',   color: '#b06a00', label: 'Functional' },
  critical:   { bg: 'rgba(200,50,50,0.1)',   border: 'rgba(200,50,50,0.3)',   color: '#c83232', label: 'Critical'   },
}

function SeverityBadge({ sev }) {
  const s = SEVERITY_STYLES[sev] || SEVERITY_STYLES.cosmetic
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

function fmtDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Service() {
  const tick = useRefreshTick()
  const navigate = useNavigate()
  const [entries, setEntries]     = useState([])
  const [systems, setSystems]     = useState({}) // id -> system
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('open') // 'open' | 'all' | 'resolved'
  const [sevFilter, setSevFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('system_service_entries').select('*').order('reported_at', { ascending: false }),
      supabase.from('systems').select('id, equipment_name, serial_number, location'),
    ]).then(([{ data: ents }, { data: sys }]) => {
      setEntries(ents || [])
      const sysMap = {}
      sys?.forEach(s => { sysMap[s.id] = s })
      setSystems(sysMap)
      setLoading(false)
    })
  }, [tick])

  const open     = entries.filter(e => e.status === 'open')
  const critical = open.filter(e => e.severity === 'critical')
  const functional = open.filter(e => e.severity === 'functional')

  const filtered = entries.filter(e => {
    const sys = systems[e.system_id]
    const q = search.toLowerCase()
    const matchSearch = !q ||
      sys?.equipment_name?.toLowerCase().includes(q) ||
      sys?.serial_number?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    const matchStatus = filter === 'all' || e.status === filter
    const matchSev = sevFilter === 'all' || e.severity === sevFilter
    return matchSearch && matchStatus && matchSev
  })

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Service Requests</h1>
          <p className="page-sub">
            {open.length} open
            {critical.length > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}> · {critical.length} critical</span>}
            {functional.length > 0 && <span style={{ color: 'var(--amber)', fontWeight: 600 }}> · {functional.length} functional</span>}
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="row gap-3" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search system or description…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="row gap-2">
            {['open', 'all', 'resolved'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'open' && open.length > 0 && (
                  <span style={{ marginLeft: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>
                    {open.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <select className="sel" style={{ width: 160 }} value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="functional">Functional</option>
            <option value="cosmetic">Cosmetic</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon"><CheckCircle2 size={28} style={{ color: 'var(--green)' }} /></div>
              <p style={{ color: filter === 'open' ? 'var(--green)' : 'var(--text-3)', fontWeight: 500 }}>
                {filter === 'open' ? 'No open service requests' : 'No entries found'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(entry => {
              const sys = systems[entry.system_id]
              const sev = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.cosmetic
              const isOpen = entry.status === 'open'
              return (
                <div
                  key={entry.id}
                  style={{
                    border: `1px solid ${isOpen ? sev.border : 'var(--border)'}`,
                    borderLeft: `4px solid ${isOpen ? sev.color : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: isOpen ? sev.bg : 'var(--surface-2)',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    opacity: isOpen ? 1 : 0.65,
                    transition: 'opacity var(--ease)',
                  }}
                  onClick={() => navigate(`/systems/${entry.system_id}`)}
                >
                  <div className="row-sb" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                      <SeverityBadge sev={entry.severity} />
                      {isOpen
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}><Clock size={12} /> Open</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}><CheckCircle2 size={12} /> Resolved</span>
                      }
                    </div>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                      {sys && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{sys.equipment_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>S/N: {sys.serial_number}</div>
                        </div>
                      )}
                      <ArrowRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {entry.description.length > 200 ? entry.description.slice(0, 200) + '…' : entry.description}
                  </p>

                  {entry.resolution_note && !isOpen && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                        <strong>Resolution:</strong> {entry.resolution_note}
                      </p>
                    </div>
                  )}

                  <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Reported by {entry.reported_by} · {fmtDateTime(entry.reported_at)}
                    </span>
                    {!isOpen && entry.resolved_by && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Resolved by {entry.resolved_by} · {fmtDateTime(entry.resolved_at)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
