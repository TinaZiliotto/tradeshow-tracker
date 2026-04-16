import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Package, Truck, ArrowRight, Wrench, AlertTriangle } from 'lucide-react'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase } from '../lib/supabase'

const SB = { Confirmed:'b-blue', TBA:'b-amber', Cancelled:'b-red', Completed:'b-green', 'In Progress':'b-purple', Finished:'b-grey' }
function SBadge({ s }) { return <span className={`badge ${SB[s] || 'b-grey'}`}>{s || '—'}</span> }

const SEV = {
  cosmetic:   { color: '#1188a0', bg: 'rgba(81,198,219,0.1)',  border: 'rgba(81,198,219,0.3)'  },
  functional: { color: 'var(--amber)', bg: 'rgba(176,106,0,0.1)', border: 'rgba(176,106,0,0.3)' },
  critical:   { color: 'var(--red)',   bg: 'rgba(200,50,50,0.1)', border: 'rgba(200,50,50,0.3)'  },
}

export default function Dashboard() {
  const tick = useRefreshTick()
  const [shows, setShows]           = useState([])
  const [systems, setSystems]       = useState([])
  const [openEntries, setOpenEntries] = useState([])
  const [systemMap, setSystemMap]   = useState({})
  const [loading, setLoading]       = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      supabase.from('tradeshows').select('*').order('dates_start', { ascending: true }),
      supabase.from('systems').select('id, equipment_name, serial_number, location'),
      supabase.from('system_service_entries').select('*').eq('status', 'open').order('reported_at', { ascending: false }),
    ]).then(([{ data: s }, { data: sys }, { data: svc }]) => {
      setShows(s || [])
      setSystems(sys || [])
      setOpenEntries(svc || [])
      const map = {}
      sys?.forEach(s => { map[s.id] = s })
      setSystemMap(map)
      setLoading(false)
    })
  }, [tick])

  const now      = new Date()
  const upcoming = shows.filter(s => s.dates_start && new Date(s.dates_start + 'T00:00:00') >= now)
  const tba      = shows.filter(s => !s.dates_start)
  const atShow   = systems.filter(s => s.location === 'At the Show').length
  const critical = openEntries.filter(e => e.severity === 'critical')
  const serviceColor = critical.length > 0 ? 'var(--red)' : openEntries.length > 0 ? 'var(--amber)' : 'var(--green)'

  const stats = [
    { label: 'Total Shows',     value: shows.length,        icon: Calendar,       color: 'var(--purple)', to: '/shows'   },
    { label: 'Upcoming',        value: upcoming.length,     icon: Truck,          color: 'var(--green)',  to: '/shows'   },
    { label: 'Systems at Show', value: atShow,              icon: Package,        color: 'var(--accent)', to: '/systems' },
    { label: 'TBA',             value: tba.length,          icon: Calendar,       color: 'var(--amber)',  to: '/shows'   },
    { label: 'Open Service',    value: openEntries.length,  icon: openEntries.length > 0 ? AlertTriangle : Wrench, color: serviceColor, to: '/service', highlight: openEntries.length > 0 },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of all tradeshow activity</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          {stats.map(({ label, value, icon: Icon, color, to, highlight }) => (
            <div key={label}
              className="card card-bd"
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'box-shadow var(--ease)', outline: highlight ? `2px solid ${color}` : 'none' }}
              onClick={() => navigate(to)}
              onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ width: 42, height: 42, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={19} style={{ color }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: highlight ? color : 'var(--text-1)' }}>
                  {loading ? '—' : value}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: openEntries.length > 0 ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
          {/* Upcoming shows */}
          <div className="card">
            <div className="card-hd">
              <h2 className="card-title">Upcoming Shows</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shows')}>
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="card-bd" style={{ padding: '12px 20px' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spin" /></div>
              ) : upcoming.length === 0 ? (
                <div className="empty"><div className="empty-icon">📅</div><p>No upcoming shows</p></div>
              ) : (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr><th>Show</th><th>Dates</th><th>Booth</th><th>Contact</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {upcoming.slice(0, 8).map(show => (
                        <tr key={show.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shows/${show.id}`)}>
                          <td><strong>{show.show_name}</strong></td>
                          <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                            {new Date(show.dates_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {show.dates_end ? ` – ${new Date(show.dates_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                          </td>
                          <td className="muted">{show.booth_number || '—'}</td>
                          <td className="muted">{show.show_contact || '—'}</td>
                          <td><SBadge s={show.status} /></td>
                          <td><ArrowRight size={13} className="muted" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Open service requests panel — only shows when there are open items */}
          {openEntries.length > 0 && (
            <div className="card">
              <div className="card-hd">
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <AlertTriangle size={15} style={{ color: critical.length > 0 ? 'var(--red)' : 'var(--amber)' }} />
                  Open Service Issues
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/service')}>
                  View all <ArrowRight size={13} />
                </button>
              </div>
              <div className="card-bd" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openEntries.slice(0, 6).map(entry => {
                  const sys = systemMap[entry.system_id]
                  const sev = SEV[entry.severity] || SEV.cosmetic
                  return (
                    <div key={entry.id}
                      style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: sev.bg, border: `1px solid ${sev.border}`, borderLeft: `3px solid ${sev.color}`, cursor: 'pointer' }}
                      onClick={() => navigate(`/systems/${entry.system_id}`)}
                    >
                      <div className="row-sb" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sev.color }}>{(entry.severity || '').charAt(0).toUpperCase() + (entry.severity || '').slice(1)}</span>
                        {sys && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{sys.equipment_name}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {entry.description}
                      </p>
                    </div>
                  )
                })}
                {openEntries.length > 6 && (
                  <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'center', color: 'var(--text-3)' }} onClick={() => navigate('/service')}>
                    +{openEntries.length - 6} more open issues
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
