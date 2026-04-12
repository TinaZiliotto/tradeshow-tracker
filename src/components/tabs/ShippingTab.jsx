import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase, logAudit } from '../../lib/supabase'

function ShippingForm({ showId, item, carriers, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    direction: item?.direction || 'pre-show',
    carrier: item?.carrier || '',
    ship_date: item?.ship_date || '',
    notes: item?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, tradeshow_id: showId }
    if (isEdit) {
      await supabase.from('shipping').update(form).eq('id', item.id)
      await logAudit({ action: 'update', entityType: 'shipping', entityId: item.id, entityLabel: `${form.direction} – ${form.carrier}`, oldValue: item, newValue: form })
    } else {
      const { data } = await supabase.from('shipping').insert(payload).select().single()
      await logAudit({ action: 'create', entityType: 'shipping', entityId: data?.id, entityLabel: `${form.direction} – ${form.carrier}`, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Shipment' : 'Add Shipment'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="label">Direction</label>
                <select className="select" value={form.direction} onChange={set('direction')}>
                  <option value="pre-show">Pre-Show</option>
                  <option value="post-show">Post-Show</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Carrier</label>
                <select className="select" value={form.carrier} onChange={set('carrier')}>
                  <option value="">— Select —</option>
                  {carriers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Ship Date</label>
                <input className="input" type="date" value={form.ship_date} onChange={set('ship_date')} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={set('notes')} rows={3} placeholder="e.g. Hold in Vegas for PELV" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : isEdit ? 'Save' : 'Add Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ShippingTab({ showId, isAdmin }) {
  const [items, setItems] = useState([])
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetchItems()
    supabase.from('dropdown_options').select('value').eq('category', 'carrier').order('sort_order')
      .then(({ data }) => setCarriers(data?.map(d => d.value) || []))
  }, [showId])

  async function fetchItems() {
    const { data } = await supabase.from('shipping').select('*').eq('tradeshow_id', showId).order('ship_date')
    setItems(data || [])
    setLoading(false)
  }

  async function handleDelete(item) {
    if (!confirm('Delete this shipment record?')) return
    await supabase.from('shipping').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'shipping', entityId: item.id, entityLabel: `${item.direction} – ${item.carrier}` })
    fetchItems()
  }

  const preShow = items.filter(i => i.direction === 'pre-show')
  const postShow = items.filter(i => i.direction === 'post-show')

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>

  function ShippingTable({ rows, title }) {
    return (
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
        <div className="card-body" style={{ padding: '12px 24px' }}>
          {rows.length === 0 ? (
            <p className="text-muted text-sm">No shipments recorded.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Carrier</th>
                    <th>Ship Date</th>
                    <th>Notes</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.carrier || '—'}</strong></td>
                      <td className="text-muted">{item.ship_date ? new Date(item.ship_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className="text-muted">{item.notes || '—'}</td>
                      {isAdmin && (
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => setModalItem(item)}><Pencil size={13} /></button>
                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: '16px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Shipment</button>
        </div>
      )}
      <ShippingTable rows={preShow} title="Pre-Show Shipping" />
      <ShippingTable rows={postShow} title="Post-Show Shipping" />

      {(showAdd || modalItem) && (
        <ShippingForm
          showId={showId}
          item={modalItem}
          carriers={carriers}
          onClose={() => { setShowAdd(false); setModalItem(null) }}
          onSaved={() => { setShowAdd(false); setModalItem(null); fetchItems() }}
        />
      )}
    </div>
  )
}
