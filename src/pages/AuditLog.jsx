import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase } from '../lib/supabase'

const ACTION_BADGE = { create: 'b-green', update: 'b-blue', delete: 'b-red', upload: 'b-amber' }

function summarizeChanges(oldVal, newVal) {
  if (!oldVal || !newVal) return ''
  const changes = Object.keys(newVal).filter(k => !['updated_at','created_at'].includes(k) && String(oldVal[k]||'') !== String(newVal[k]||''))
  if (!changes.length) return 'No field changes'
  return `Changed: ${changes.slice(0,4).join(', ')}${changes.length > 4 ? ` +${changes.length-4} more` : ''}`
}

export default function AuditLog() {
  const tick = useRefreshTick()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(500)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [tick])

  const filtered = logs.filter(log => {
    const q = search.toLowerCase()
    return (!q || log.entity_label?.toLowerCase().includes(q) || log.user_email?.toLowerCase().includes(q) || log.entity_type?.toLowerCase().includes(q))
      && (actionFilter === 'all' || log.action === actionFilter)
  })

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Audit Log</h1><p className="page-sub">Complete history of all changes</p></div>
      </div>
      <div className="page-body">
        <div className="row gap-3" style={{ marginBottom: 14 }}>
          <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by user or entity…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sel" style={{ width: 160 }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="upload">Upload</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><p>No log entries found</p></div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr><th>Time</th><th>User</th><th>Action</th><th>Type</th><th>Entity</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id}>
                      <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{log.user_email || '—'}</td>
                      <td><span className={`badge ${ACTION_BADGE[log.action] || 'b-grey'}`}>{log.action}</span></td>
                      <td className="muted" style={{ fontSize: 12, textTransform: 'capitalize' }}>{log.entity_type}</td>
                      <td style={{ fontWeight: 500 }}>{log.entity_label || '—'}</td>
                      <td className="muted" style={{ fontSize: 12, maxWidth: 260 }}>
                        {log.action === 'update' ? summarizeChanges(log.old_value, log.new_value)
                          : log.action === 'upload' ? `Uploaded to ${log.new_value?.show || ''}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
