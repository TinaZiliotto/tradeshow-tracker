import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ExternalLink, KeyRound } from 'lucide-react'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const PORTAL_TYPES = [
  'Trade Show Website',
  'Lead Retrieval',
  'Electrical',
  'Furniture',
  'Freight / Shipping',
  'AV / Technology',
  'Catering',
  'Venue',
  'Other',
]

function PortalForm({ showId, item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    portal_name: item?.portal_name || '',
    portal_type: item?.portal_type || '',
    url: item?.url || '',
    username: item?.username || '',
    password: item?.password || '',
    notes: item?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, tradeshow_id: showId }
    if (isEdit) {
      const { error } = await supabase.from('portal_entries').update(form).eq('id', item.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'update', entityType: 'portal_entry', entityId: item.id, entityLabel: form.portal_name, oldValue: item, newValue: form })
    } else {
      const { data, error } = await supabase.from('portal_entries').insert(payload).select().single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'create', entityType: 'portal_entry', entityId: data?.id, entityLabel: form.portal_name, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Portal Entry' : 'Add Portal Entry'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="label">Portal Name *</label>
                <input className="input" value={form.portal_name} onChange={set('portal_name')} placeholder="e.g. Lead Retrieval Login" required />
              </div>
              <div className="input-group">
                <label className="label">Type</label>
                <select className="select" value={form.portal_type} onChange={set('portal_type')}>
                  <option value="">— Select type —</option>
                  {PORTAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">URL</label>
                <input className="input" type="url" value={form.url} onChange={set('url')} placeholder="https://..." />
              </div>
              <div className="input-group">
                <label className="label">Username / Email</label>
                <input className="input" value={form.username} onChange={set('username')} placeholder="username or email" />
              </div>
              <div className="input-group">
                <label className="label">Password</label>
                <input className="input" value={form.password} onChange={set('password')} placeholder="password" autoComplete="off" />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional — account numbers, PIN, instructions..." />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
            <div style={{ padding: '10px 12px', background: 'rgba(196,122,0,0.07)', border: '1px solid rgba(196,122,0,0.18)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--amber)', lineHeight: 1.6 }}>
              Credentials are stored as plain text and visible to all logged-in users. Do not store highly sensitive passwords here.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : isEdit ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PortalCard({ entry, isAdmin, onEdit, onDelete }) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(null)

  function copyToClipboard(text, field) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const typeColor = {
    'Lead Retrieval': 'badge-purple',
    'Trade Show Website': 'badge-blue',
    'Electrical': 'badge-amber',
    'Furniture': 'badge-green',
  }

  return (
    <div className="card" style={{ marginBottom: '12px' }}>
      <div style={{ padding: '16px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <KeyRound size={16} style={{ color: 'var(--purple)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{entry.portal_name}</span>
            {entry.portal_type && (
              <span className={`badge ${typeColor[entry.portal_type] || 'badge-grey'}`}>{entry.portal_type}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open URL">
                <ExternalLink size={13} />
              </a>
            )}
            {isAdmin && <>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(entry)} title="Edit"><Pencil size={13} /></button>
              <button className="btn btn-ghost btn-sm text-danger" onClick={() => onDelete(entry)} title="Delete"><Trash2 size={13} /></button>
            </>}
          </div>
        </div>

        {/* Credentials grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {entry.url && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="label" style={{ marginBottom: '3px' }}>URL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--purple)', wordBreak: 'break-all' }}>{entry.url}</span>
                <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => copyToClipboard(entry.url, 'url')}>
                  {copied === 'url' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {entry.username && (
            <div>
              <div className="label" style={{ marginBottom: '3px' }}>Username / Email</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{entry.username}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(entry.username, 'user')}>
                  {copied === 'user' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {entry.password && (
            <div>
              <div className="label" style={{ marginBottom: '3px' }}>Password</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', letterSpacing: showPassword ? '0' : '2px' }}>
                  {showPassword ? entry.password : '••••••••'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPassword(s => !s)} title={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(entry.password, 'pass')}>
                  {copied === 'pass' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {entry.notes && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom: '3px' }}>Notes</div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PortalTab({ showId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const { isAdmin } = useAuth()

  useEffect(() => { fetchEntries() }, [showId])

  async function fetchEntries() {
    const { data } = await supabase
      .from('portal_entries')
      .select('*')
      .eq('tradeshow_id', showId)
      .order('portal_type')
      .order('portal_name')
    setEntries(data || [])
    setLoading(false)
  }

  async function handleDelete(entry) {
    if (!confirm(`Delete "${entry.portal_name}"?`)) return
    await supabase.from('portal_entries').delete().eq('id', entry.id)
    await logAudit({ action: 'delete', entityType: 'portal_entry', entityId: entry.id, entityLabel: entry.portal_name })
    fetchEntries()
  }

  const types = ['all', ...new Set(entries.map(e => e.portal_type).filter(Boolean))]
  const filtered = filterType === 'all' ? entries : entries.filter(e => e.portal_type === filterType)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
            >
              {t === 'all' ? `All (${entries.length})` : t}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowForm(true) }}>
            <Plus size={14} /> Add Entry
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><KeyRound size={28} /></div>
            <p>{entries.length === 0 ? 'No portal entries yet' : 'No entries for this type'}</p>
          </div>
        </div>
      ) : (
        filtered.map(entry => (
          <PortalCard
            key={entry.id}
            entry={entry}
            isAdmin={isAdmin}
            onEdit={item => { setEditItem(item); setShowForm(true) }}
            onDelete={handleDelete}
          />
        ))
      )}

      {showForm && (
        <PortalForm
          showId={showId}
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); fetchEntries() }}
        />
      )}
    </div>
  )
}
