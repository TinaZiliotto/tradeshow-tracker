import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase, logAudit } from '../../lib/supabase'

function EquipmentForm({ showId, item, equipmentNames, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    item_no: item?.item_no || '',
    equipment_name: item?.equipment_name || '',
    serial_numbers: item?.serial_numbers || '',
    part_numbers: item?.part_numbers || '',
    crate_number: item?.crate_number || '',
    notes: item?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, tradeshow_id: showId }
    if (isEdit) {
      await supabase.from('equipment').update(form).eq('id', item.id)
      await logAudit({ action: 'update', entityType: 'equipment', entityId: item.id, entityLabel: form.equipment_name, oldValue: item, newValue: form })
    } else {
      const { data } = await supabase.from('equipment').insert(payload).select().single()
      await logAudit({ action: 'create', entityType: 'equipment', entityId: data?.id, entityLabel: form.equipment_name, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Equipment' : 'Add Equipment'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="label">Item No.</label>
                <input className="input" value={form.item_no} onChange={set('item_no')} />
              </div>
              <div className="input-group">
                <label className="label">Crate #</label>
                <input className="input" value={form.crate_number} onChange={set('crate_number')} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Equipment Name *</label>
                <select className="select" value={form.equipment_name} onChange={set('equipment_name')} required>
                  <option value="">— Select equipment —</option>
                  {equipmentNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Serial Numbers</label>
                <input className="input" value={form.serial_numbers} onChange={set('serial_numbers')} placeholder="e.g. CD32054, CW00130" />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Part Numbers</label>
                <input className="input" value={form.part_numbers} onChange={set('part_numbers')} placeholder="e.g. D-SSHR14X7S-EPH" />
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
              {saving ? <span className="spinner" /> : isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EquipmentTab({ showId, isAdmin }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [equipmentNames, setEquipmentNames] = useState([])
  const [modalItem, setModalItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetchItems()
    supabase.from('dropdown_options').select('value').eq('category', 'equipment_name').order('sort_order')
      .then(({ data }) => setEquipmentNames(data?.map(d => d.value) || []))
  }, [showId])

  async function fetchItems() {
    const { data } = await supabase.from('equipment').select('*').eq('tradeshow_id', showId).order('item_no')
    setItems(data || [])
    setLoading(false)
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.equipment_name}"?`)) return
    await supabase.from('equipment').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'equipment', entityId: item.id, entityLabel: item.equipment_name })
    fetchItems()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: '16px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Equipment</button>
        </div>
      )}
      <div className="card">
        {items.length === 0 ? (
          <div className="empty"><div className="empty-icon">📦</div><p>No equipment added yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipment Name</th>
                  <th>Serial Numbers</th>
                  <th>Part Numbers</th>
                  <th>Crate</th>
                  <th>Notes</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="text-muted">{item.item_no || '—'}</td>
                    <td><strong>{item.equipment_name}</strong></td>
                    <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.serial_numbers || '—'}</td>
                    <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '12px', maxWidth: '200px' }} className="truncate">{item.part_numbers || '—'}</td>
                    <td className="text-muted">{item.crate_number || '—'}</td>
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
        <EquipmentForm
          showId={showId}
          item={modalItem}
          equipmentNames={equipmentNames}
          onClose={() => { setShowAdd(false); setModalItem(null) }}
          onSaved={() => { setShowAdd(false); setModalItem(null); fetchItems() }}
        />
      )}
    </div>
  )
}
