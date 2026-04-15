import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase, logAudit } from '../lib/supabase'
import SystemPicker from './SystemPicker'

export default function ShowModal({ show, onClose, onSaved }) {
  const isEdit = !!show
  const [contacts, setContacts] = useState([])
  const [statuses, setStatuses] = useState([])
  const [selectedSystems, setSelectedSystems] = useState([])
  const [form, setForm] = useState({
    show_name:    show?.show_name    || '',
    year:         show?.year         || new Date().getFullYear(),
    status:       show?.status       || '',
    booth_number:     show?.booth_number     || '',
    booth_size:       show?.booth_size       || '',
    location_city:    show?.location_city    || '',
    fti_booth_type:   show?.fti_booth_type   || '',
    sales_order:  show?.sales_order  || '',
    show_contact: show?.show_contact || '',
    dates_start:  show?.dates_start  || '',
    dates_end:    show?.dates_end    || '',
    move_in:      show?.move_in      || '',
    move_out:     show?.move_out     || '',
    notes:        show?.notes        || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  useEffect(() => {
    // Load contacts and statuses from database — never hardcoded
    supabase.from('dropdown_options').select('value').eq('category', 'contact').order('sort_order')
      .then(({ data }) => setContacts(data?.map(d => d.value) || []))
    supabase.from('dropdown_options').select('value').eq('category', 'show_status').order('sort_order')
      .then(({ data }) => {
        const vals = data?.map(d => d.value) || []
        setStatuses(vals)
        // Set default status to first option if creating a new show
        if (!isEdit && vals.length > 0) setForm(p => ({ ...p, status: vals[0] }))
      })
    if (isEdit) {
      supabase.from('show_systems').select('system_id, systems(*)').eq('tradeshow_id', show.id)
        .then(({ data }) => { if (data) setSelectedSystems(data.map(r => r.systems).filter(Boolean)) })
    }
  }, [])

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    const payload = { ...form, year: parseInt(form.year) }
    let showId = show?.id
    if (isEdit) {
      const { error } = await supabase.from('tradeshows').update(payload).eq('id', show.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'update', entityType: 'tradeshow', entityId: show.id, entityLabel: form.show_name, oldValue: show, newValue: payload })
    } else {
      const { data, error } = await supabase.from('tradeshows').insert(payload).select().single()
      if (error) { setError(error.message); setSaving(false); return }
      showId = data.id
      await logAudit({ action: 'create', entityType: 'tradeshow', entityId: data.id, entityLabel: form.show_name, newValue: payload })
    }
    await supabase.from('show_systems').delete().eq('tradeshow_id', showId)
    if (selectedSystems.length > 0) {
      await supabase.from('show_systems').insert(selectedSystems.map(s => ({ tradeshow_id: showId, system_id: s.id })))
    }
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hd">
          <h2 className="modal-title">{isEdit ? 'Edit Show' : 'New Tradeshow'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-bd" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div className="fg2">
              <div className="field fspan"><label className="lbl">Show Name *</label><input className="input" value={form.show_name} onChange={set('show_name')} required /></div>
              <div className="field"><label className="lbl">Start Date</label><input className="input" type="date" value={form.dates_start} onChange={set('dates_start')} /></div>
              <div className="field"><label className="lbl">End Date</label><input className="input" type="date" value={form.dates_end} onChange={set('dates_end')} /></div>
              <div className="field"><label className="lbl">Booth Number</label><input className="input" value={form.booth_number} onChange={set('booth_number')} /></div>
              <div className="field"><label className="lbl">Booth Size</label><input className="input" value={form.booth_size} onChange={set('booth_size')} placeholder="e.g. 20x20" /></div>
              <div className="field"><label className="lbl">Location (City &amp; State)</label><input className="input" value={form.location_city} onChange={set('location_city')} placeholder="e.g. Las Vegas, NV" /></div>
              <div className="field"><label className="lbl">FTI Booth Type</label><input className="input" value={form.fti_booth_type} onChange={set('fti_booth_type')} placeholder="e.g. 10ft pop up" /></div>
              <div className="field"><label className="lbl">Sales Order</label><input className="input" value={form.sales_order} onChange={set('sales_order')} /></div>
              <div className="field">
                <label className="lbl">Contact</label>
                <select className="sel" value={form.show_contact} onChange={set('show_contact')}>
                  <option value="">— Select —</option>
                  {contacts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="lbl">Status</label>
                <select className="sel" value={form.status} onChange={set('status')}>
                  <option value="">— Select —</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field fspan"><label className="lbl">Move In Details</label><textarea className="ta" value={form.move_in} onChange={set('move_in')} rows={2} /></div>
              <div className="field fspan"><label className="lbl">Move Out Details</label><textarea className="ta" value={form.move_out} onChange={set('move_out')} rows={2} /></div>
              <div className="field fspan">
                <label className="lbl">Assign Systems</label>
                <SystemPicker value={selectedSystems} onChange={setSelectedSystems} />
                <span className="muted" style={{ fontSize: 11, marginTop: 3 }}>Search and click to assign systems from the global registry.</span>
              </div>
              <div className="field fspan"><label className="lbl">Notes</label><textarea className="ta" value={form.notes} onChange={set('notes')} rows={2} /></div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spin spin-white" /> : isEdit ? 'Save Changes' : 'Create Show'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
