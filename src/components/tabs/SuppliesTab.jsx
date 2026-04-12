import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase, logAudit } from '../../lib/supabase'

function SupplyForm({ showId, item, categories, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    category: item?.category || '',
    item: item?.item || '',
    quantity: item?.quantity || '',
    notes: item?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, tradeshow_id: showId }
    if (isEdit) {
      await supabase.from('supplies').update(form).eq('id', item.id)
      await logAudit({ action: 'update', entityType: 'supply', entityId: item.id, entityLabel: form.item, oldValue: item, newValue: form })
    } else {
      const { data } = await supabase.from('supplies').insert(payload).select().single()
      await logAudit({ action: 'create', entityType: 'supply', entityId: data?.id, entityLabel: form.item, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Supply Item' : 'Add Supply Item'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid">
              <div className="input-group">
                <label className="label">Category</label>
                <select className="select" value={form.category} onChange={set('category')} required>
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Quantity</label>
                <input className="input" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 150 units" />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Item *</label>
                <input className="input" value={form.item} onChange={set('item')} required placeholder="e.g. Tote bags" />
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
              {saving ? <span className="spinner" /> : isEdit ? 'Save' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SuppliesTab({ showId, isAdmin }) {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetchItems()
    supabase.from('dropdown_options').select('value').eq('category', 'supply_category').order('sort_order')
      .then(({ data }) => setCategories(data?.map(d => d.value) || []))
  }, [showId])

  async function fetchItems() {
    const { data } = await supabase.from('supplies').select('*').eq('tradeshow_id', showId).order('category').order('item')
    setItems(data || [])
    setLoading(false)
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.item}"?`)) return
    await supabase.from('supplies').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'supply', entityId: item.id, entityLabel: item.item })
    fetchItems()
  }

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: '16px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Item</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card">
          <div className="empty"><div className="empty-icon">🛍️</div><p>No supplies added yet</p></div>
        </div>
      ) : (
        Object.entries(grouped).map(([category, rows]) => (
          <div key={category} className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h3 className="card-title">{category}</h3>
            </div>
            <div className="card-body" style={{ padding: '12px 24px' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Notes</th>
                      {isAdmin && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(item => (
                      <tr key={item.id}>
                        <td>{item.item}</td>
                        <td className="text-muted">{item.quantity || '—'}</td>
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
            </div>
          </div>
        ))
      )}

      {(showAdd || modalItem) && (
        <SupplyForm
          showId={showId}
          item={modalItem}
          categories={categories}
          onClose={() => { setShowAdd(false); setModalItem(null) }}
          onSaved={() => { setShowAdd(false); setModalItem(null); fetchItems() }}
        />
      )}
    </div>
  )
}
