import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ExternalLink, KeyRound } from 'lucide-react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const PORTAL_TYPES = ['Trade Show Website','Lead Retrieval','Electrical','Furniture','Freight / Shipping','AV / Technology','Catering','Venue','Other']
const TYPE_BADGE = { 'Lead Retrieval':'b-purple', 'Trade Show Website':'b-blue', 'Electrical':'b-amber', 'Furniture':'b-green' }

function PortalForm({ showId, item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({ portal_name: item?.portal_name||'', portal_type: item?.portal_type||'', url: item?.url||'', username: item?.username||'', password: item?.password||'', notes: item?.notes||'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
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
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd"><h2 className="modal-title">{isEdit ? 'Edit Entry' : 'Add Portal Entry'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button></div>
        <form onSubmit={handleSave}>
          <div className="modal-bd" style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div className="fg2">
              <div className="field"><label className="lbl">Portal Name *</label><input className="input" value={form.portal_name} onChange={set('portal_name')} required /></div>
              <div className="field"><label className="lbl">Type</label>
                <select className="sel" value={form.portal_type} onChange={set('portal_type')}>
                  <option value="">— Select —</option>
                  {PORTAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field fspan"><label className="lbl">URL</label><input className="input" type="url" value={form.url} onChange={set('url')} placeholder="https://…" /></div>
              <div className="field"><label className="lbl">Username / Email</label><input className="input" value={form.username} onChange={set('username')} /></div>
              <div className="field"><label className="lbl">Password</label><input className="input" value={form.password} onChange={set('password')} autoComplete="off" /></div>
              <div className="field fspan"><label className="lbl">Notes</label><textarea className="ta" value={form.notes} onChange={set('notes')} rows={2} /></div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <div className="warn-box">Credentials are stored as plain text visible to all logged-in users.</div>
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spin spin-white" /> : isEdit ? 'Save' : 'Add Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PortalCard({ entry, isAdmin, isEditor, onEdit, onDelete }) {
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(null)
  function copy(text, key) { navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000) }) }

  return (
    <div className="card" style={{ marginBottom: 12, padding: '16px 18px' }}>
      <div className="row-sb" style={{ marginBottom: 12 }}>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <KeyRound size={15} style={{ color: 'var(--purple)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{entry.portal_name}</span>
          {entry.portal_type && <span className={`badge ${TYPE_BADGE[entry.portal_type] || 'b-grey'}`}>{entry.portal_type}</span>}
        </div>
        <div className="row gap-2">
          {entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open"><ExternalLink size={13} /></a>}
          {(isAdmin || isEditor) && <button className="btn btn-ghost btn-sm" onClick={() => onEdit(entry)}><Pencil size={13} /></button>}
          {isAdmin && <button className="btn btn-ghost btn-sm danger" onClick={() => onDelete(entry)}><Trash2 size={13} /></button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {entry.url && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="lbl" style={{ marginBottom: 2 }}>URL</div>
            <div className="row gap-2">
              <span style={{ fontSize: 13, color: 'var(--purple)', wordBreak: 'break-all' }}>{entry.url}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => copy(entry.url, 'url')}>{copied==='url'?'✓':'Copy'}</button>
            </div>
          </div>
        )}
        {entry.username && (
          <div>
            <div className="lbl" style={{ marginBottom: 2 }}>Username</div>
            <div className="row gap-2">
              <span className="mono">{entry.username}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => copy(entry.username, 'user')}>{copied==='user'?'✓':'Copy'}</button>
            </div>
          </div>
        )}
        {entry.password && (
          <div>
            <div className="lbl" style={{ marginBottom: 2 }}>Password</div>
            <div className="row gap-2">
              <span className="mono" style={{ letterSpacing: showPw ? 0 : 2 }}>{showPw ? entry.password : '••••••••'}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowPw(s => !s)}>{showPw ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
              <button className="btn btn-ghost btn-xs" onClick={() => copy(entry.password, 'pw')}>{copied==='pw'?'✓':'Copy'}</button>
            </div>
          </div>
        )}
      </div>
      {entry.notes && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div className="lbl" style={{ marginBottom: 2 }}>Notes</div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-line', margin: 0 }}>{entry.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function PortalTab({ showId, isAdmin, isEditor }) {
  const tick = useRefreshTick()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filter, setFilter] = useState('all')
  // isAdmin comes from prop

  useEffect(() => { fetch() }, [showId])

  async function fetch() {
    const { data } = await supabase.from('portal_entries').select('*').eq('tradeshow_id', showId).order('portal_type').order('portal_name')
    setEntries(data || []); setLoading(false)
  }

  async function handleDelete(entry) {
    if (!confirm(`Delete "${entry.portal_name}"?`)) return
    await supabase.from('portal_entries').delete().eq('id', entry.id)
    await logAudit({ action: 'delete', entityType: 'portal_entry', entityId: entry.id, entityLabel: entry.portal_name })
    fetch()
  }

  const types = ['all', ...new Set(entries.map(e => e.portal_type).filter(Boolean))]
  const filtered = filter === 'all' ? entries : entries.filter(e => e.portal_type === filter)

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:32 }}><span className="spin" /></div>

  return (
    <div>
      <div className="row-sb" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          {types.map(t => (
            <button key={t} className={`btn btn-sm ${filter===t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(t)}>
              {t === 'all' ? `All (${entries.length})` : t}
            </button>
          ))}
        </div>
        {(isAdmin || isEditor) && <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowForm(true) }}><Plus size={13}/> Add Entry</button>}
      </div>
      {filtered.length === 0
        ? <div className="card"><div className="empty"><div className="empty-icon"><KeyRound size={26}/></div><p>{entries.length===0?'No portal entries yet':'No entries for this type'}</p></div></div>
        : filtered.map(e => <PortalCard key={e.id} entry={e} isAdmin={isAdmin} isEditor={isEditor} onEdit={i=>{setEditItem(i);setShowForm(true)}} onDelete={handleDelete} />)
      }
      {showForm && <PortalForm showId={showId} item={editItem} onClose={()=>{setShowForm(false);setEditItem(null)}} onSaved={()=>{setShowForm(false);setEditItem(null);fetch()}} />}
    </div>
  )
}
