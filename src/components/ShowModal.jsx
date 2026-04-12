import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase, logAudit } from '../lib/supabase'

const STATUSES = ['Confirmed', 'TBA', 'Cancelled', 'Completed']

export default function ShowModal({ show, onClose, onSaved }) {
  const isEdit = !!show
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState({
    show_name: show?.show_name || '',
    year: show?.year || new Date().getFullYear(),
    status: show?.status || 'Confirmed',
    booth_number: show?.booth_number || '',
    sales_order: show?.sales_order || '',
    show_contact: show?.show_contact || '',
    dates_start: show?.dates_start || '',
    dates_end: show?.dates_end || '',
    move_in: show?.move_in || '',
    move_out: show?.move_out || '',
    notes: show?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('dropdown_options').select('value').eq('category', 'contact').order('sort_order')
      .then(({ data }) => setContacts(data?.map(d => d.value) || []))
  }, [])

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, year: parseInt(form.year) }
    if (isEdit) {
      const { error } = await supabase.from('tradeshows').update(payload).eq('id', show.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'update', entityType: 'tradeshow', entityId: show.id, entityLabel: form.show_name, oldValue: show, newValue: payload })
    } else {
      const { data, error } = await supabase.from('tradeshows').insert(payload).select().single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'create', entityType: 'tradeshow', entityId: data.id, entityLabel: form.show_name, newValue: payload })
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Show' : 'Add New Show'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid">
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Show Name *</label>
                <input className="input" value={form.show_name} onChange={set('show_name')} required />
              </div>
              <div className="input-group">
                <label className="label">Start Date</label>
                <input className="input" type="date" value={form.dates_start} onChange={set('dates_start')} />
              </div>
              <div className="input-group">
                <label className="label">End Date</label>
                <input className="input" type="date" value={form.dates_end} onChange={set('dates_end')} />
              </div>
              <div className="input-group">
                <label className="label">Booth Number</label>
                <input className="input" value={form.booth_number} onChange={set('booth_number')} />
              </div>
              <div className="input-group">
                <label className="label">Sales Order</label>
                <input className="input" value={form.sales_order} onChange={set('sales_order')} />
              </div>
              <div className="input-group">
                <label className="label">Contact</label>
                <select className="select" value={form.show_contact} onChange={set('show_contact')}>
                  <option value="">— Select —</option>
                  {contacts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Status</label>
                <select className="select" value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="label">Year</label>
                <input className="input" type="number" value={form.year} onChange={set('year')} min="2020" max="2030" />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Move In Details</label>
                <textarea className="textarea" value={form.move_in} onChange={set('move_in')} rows={2} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Move Out Details</label>
                <textarea className="textarea" value={form.move_out} onChange={set('move_out')} rows={2} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Notes</label>
                <textarea className="textarea" value={form.notes} onChange={set('notes')} />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Create Show'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
