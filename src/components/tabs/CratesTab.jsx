import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase, logAudit } from '../../lib/supabase'

function CrateForm({ showId, item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    crate_number: item?.crate_number || '',
    dimensions: item?.dimensions || '',
    weight: item?.weight || '',
    equipment_list: item?.equipment_list || '',
    spare_parts: item?.spare_parts || '',
    notes: item?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, tradeshow_id: showId }
    if (isEdit) {
      await supabase.from('crates').update(form).eq('id', item.id)
      await logAudit({ action: 'update', entityType: 'crate', entityId: item.id, entityLabel: `Crate ${form.crate_number}`, oldValue: item, newValue: form })
    } else {
      const { data } = await supabase.from('crates').insert(payload).select().single()
      await logAudit({ action: 'create', entityType: 'crate', entityId: data?.id, entityLabel: `Crate ${form.crate_number}`, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Crate' : 'Add Crate'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="label">Crate Number</label>
                <input className="input" value={form.crate_number} onChange={set('crate_number')} required />
              </div>
              <div className="input-group">
                <label className="label">Weight</label>
                <input className="input" value={form.weight} onChange={set('weight')} placeholder="e.g. 1500 lbs" />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Dimensions</label>
                <input className="input" value={form.dimensions} onChange={set('dimensions')} placeholder='e.g. 96"l x 66"w x 72"h' />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Equipment in Crate</label>
                <textarea className="textarea" value={form.equipment_list} onChange={set('equipment_list')} rows={3} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Spare Parts</label>
                <textarea className="textarea" value={form.spare_parts} onChange={set('spare_parts')} rows={2} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={set('notes')} rows={2} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : isEdit ? 'Save' : 'Add Crate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CratesTab({ showId, isAdmin }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { fetchItems() }, [showId])

  async function fetchItems() {
    const { data } = await supabase.from('crates').select('*').eq('tradeshow_id', showId).order('crate_number')
    setItems(data || [])
    setLoading(false)
  }

  async function handleDelete(item) {
    if (!confirm(`Delete Crate ${item.crate_number}?`)) return
    await supabase.from('crates').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'crate', entityId: item.id, entityLabel: `Crate ${item.crate_number}` })
    fetchItems()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: '16px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Crate</button>
        </div>
      )}
      <div className="card">
        {items.length === 0 ? (
          <div className="empty"><div className="empty-icon">📦</div><p>No crates added yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Crate #</th>
                  <th>Dimensions</th>
                  <th>Weight</th>
                  <th>Equipment</th>
                  <th>Spare Parts</th>
                  <th>Notes</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.crate_number}</strong></td>
                    <td className="text-muted">{item.dimensions || '—'}</td>
                    <td className="text-muted">{item.weight || '—'}</td>
                    <td className="text-muted" style={{ maxWidth: '200px' }}>{item.equipment_list || '—'}</td>
                    <td className="text-muted">{item.spare_parts || '—'}</td>
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

      {(showAdd || modalItem) && (
        <CrateForm
          showId={showId}
          item={modalItem}
          onClose={() => { setShowAdd(false); setModalItem(null) }}
          onSaved={() => { setShowAdd(false); setModalItem(null); fetchItems() }}
        />
      )}
    </div>
  )
}
