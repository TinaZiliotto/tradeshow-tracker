import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase, logAudit } from '../../lib/supabase'

function ShipForm({ showId, item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({ direction: item?.direction || 'pre-show', ship_date: item?.ship_date || '', notes: item?.notes || '' })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, tradeshow_id: showId }
    if (isEdit) {
      await supabase.from('shipping').update(form).eq('id', item.id)
      await logAudit({ action: 'update', entityType: 'shipping', entityId: item.id, entityLabel: form.direction, oldValue: item, newValue: form })
    } else {
      const { data } = await supabase.from('shipping').insert(payload).select().single()
      await logAudit({ action: 'create', entityType: 'shipping', entityId: data?.id, entityLabel: form.direction, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd"><h2 className="modal-title">{isEdit ? 'Edit Shipment' : 'Add Shipment'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button></div>
        <form onSubmit={handleSave}>
          <div className="modal-bd" style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div className="fg2">
              <div className="field"><label className="lbl">Direction</label>
                <select className="sel" value={form.direction} onChange={set('direction')}>
                  <option value="pre-show">Pre-Show</option>
                  <option value="post-show">Post-Show</option>
                </select>
              </div>
              <div className="field"><label className="lbl">Ship Date</label><input className="input" type="date" value={form.ship_date} onChange={set('ship_date')} /></div>
              <div className="field fspan"><label className="lbl">Notes</label><textarea className="ta" value={form.notes} onChange={set('notes')} rows={3} placeholder="e.g. Hold in Vegas for PELV" /></div>
            </div>
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spin spin-white" /> : isEdit ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ShipSection({ title, rows, isAdmin, isEditor, onEdit, onDelete }) {
  return (
    <div className="card mb-3" style={{ marginBottom: 14 }}>
      <div className="card-hd"><h3 className="card-title">{title}</h3></div>
      <div className="card-bd" style={{ padding: '12px 20px' }}>
        {rows.length === 0 ? <p className="muted" style={{ fontSize:13 }}>None recorded.</p> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Ship Date</th><th>Notes</th>{(isAdmin || isEditor) && <th></th>}</tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td>{r.ship_date ? new Date(r.ship_date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}</td>
                <td className="muted">{r.notes || '—'}</td>
                {(isAdmin || isEditor) && <td><div className="row gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(r)}><Pencil size={13} /></button>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => onDelete(r)}><Trash2 size={13} /></button>
                </div></td>}
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}

export default function ShippingTab({ showId, isAdmin, isEditor }) {
  const tick = useRefreshTick()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  useEffect(() => { fetch() }, [showId])

  async function fetch() {
    const { data } = await supabase.from('shipping').select('*').eq('tradeshow_id', showId).order('ship_date')
    setItems(data || []); setLoading(false)
  }

  async function handleDelete(item) {
    if (!confirm('Delete this shipment?')) return
    await supabase.from('shipping').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'shipping', entityId: item.id, entityLabel: item.direction })
    fetch()
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:32 }}><span className="spin" /></div>

  return (
    <div>
      {(isAdmin || isEditor) && <div style={{ marginBottom: 14 }}><button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowForm(true) }}><Plus size={14} /> Add Shipment</button></div>}
      <ShipSection title="Pre-Show" rows={items.filter(i => i.direction === 'pre-show')} isAdmin={isAdmin} isEditor={isEditor} onEdit={i => { setEditItem(i); setShowForm(true) }} onDelete={handleDelete} />
      <ShipSection title="Post-Show" rows={items.filter(i => i.direction === 'post-show')} isAdmin={isAdmin} isEditor={isEditor} onEdit={i => { setEditItem(i); setShowForm(true) }} onDelete={handleDelete} />
      {showForm && <ShipForm showId={showId} item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={() => { setShowForm(false); setEditItem(null); fetch() }} />}
    </div>
  )
}
