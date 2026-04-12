import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ACTION_BADGE = {
  create: 'badge-green',
  update: 'badge-blue',
  delete: 'badge-red',
  upload: 'badge-amber',
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    supabase.from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [])

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.entity_label?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === 'all' || log.action === actionFilter
    return matchSearch && matchAction
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Complete history of all changes</p>
        </div>
      </div>

      <div className="page-body">
        <div className="flex gap-3" style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: '32px' }} placeholder="Search by user, entity..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: '160px' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="upload">Upload</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><p>No log entries found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Type</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="text-muted" style={{ fontSize: '12px' }}>{log.user_email || '—'}</td>
                      <td><span className={`badge ${ACTION_BADGE[log.action] || 'badge-grey'}`}>{log.action}</span></td>
                      <td className="text-muted" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{log.entity_type}</td>
                      <td style={{ fontWeight: 500 }}>{log.entity_label || '—'}</td>
                      <td className="text-muted" style={{ fontSize: '12px', maxWidth: '260px' }}>
                        {log.action === 'update' && log.old_value && log.new_value
                          ? summarizeChanges(log.old_value, log.new_value)
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

function summarizeChanges(oldVal, newVal) {
  if (!oldVal || !newVal) return ''
  const changes = []
  for (const key of Object.keys(newVal)) {
    if (key === 'updated_at' || key === 'created_at') continue
    if (String(oldVal[key] || '') !== String(newVal[key] || '')) {
      changes.push(key.replace(/_/g, ' '))
    }
  }
  if (changes.length === 0) return 'No field changes'
  return `Changed: ${changes.slice(0, 4).join(', ')}${changes.length > 4 ? ` +${changes.length - 4} more` : ''}`
}
