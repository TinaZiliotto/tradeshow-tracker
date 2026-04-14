import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Search, Package } from 'lucide-react'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LOCATIONS = ['Regal', 'Head Office (HO)', 'At the Show']

function SystemForm({ item, equipmentNames, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    equipment_name: item?.equipment_name || '',
    serial_number:  item?.serial_number  || '',
    part_number:    item?.part_number    || '',
    crate_number:   item?.crate_number   || '',
    location:       item?.location       || 'Regal',
    dimensions:     item?.dimensions     || '',
    notes:          item?.notes          || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    if (isEdit) {
      const { error } = await supabase.from('systems').update(form).eq('id', item.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'update', entityType: 'system', entityId: item.id, entityLabel: form.equipment_name, oldValue: item, newValue: form })
    } else {
      // Check unique serial number
      const { data: existing } = await supabase.from('systems').select('id').eq('serial_number', form.serial_number.trim()).maybeSingle()
      if (existing) { setError(`Serial number "${form.serial_number}" already exists.`); setSaving(false); return }
      const { data, error } = await supabase.from('systems').insert(form).select().single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAudit({ action: 'create', entityType: 'system', entityId: data.id, entityLabel: form.equipment_name, newValue: form })
    }
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-title">{isEdit ? 'Edit System' : 'Add System'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-bd" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div className="fg2">
              <div className="field fspan">
                <label className="lbl">Equipment Name *</label>
                <select className="sel" value={form.equipment_name} onChange={set('equipment_name')} required>
                  <option value="">— Select —</option>
                  {equipmentNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="lbl">Serial Number *</label>
                <input className="input" value={form.serial_number} onChange={set('serial_number')} required placeholder="e.g. CD32054" />
              </div>
              <div className="field">
                <label className="lbl">Part Number</label>
                <input className="input" value={form.part_number} onChange={set('part_number')} placeholder="e.g. D-SSHR14X7S-EPH" />
              </div>
              <div className="field">
                <label className="lbl">Crate Number</label>
                <input className="input" value={form.crate_number} onChange={set('crate_number')} />
              </div>
              <div className="field">
                <label className="lbl">Current Location</label>
                <select className="sel" value={form.location} onChange={set('location')}>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="lbl">Dimensions</label>
                <input className="input" value={form.dimensions} onChange={set('dimensions')} placeholder='e.g. 96"L x 66"W x 72"H' />
              </div>
              <div className="field fspan">
                <label className="lbl">Notes</label>
                <textarea className="ta" value={form.notes} onChange={set('notes')} rows={2} />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spin spin-white" /> : isEdit ? 'Save Changes' : 'Add System'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Systems() {
  const [systems, setSystems] = useState([])
  const [equipmentNames, setEquipmentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const { isAdmin } = useAuth()

  useEffect(() => { fetchSystems(); fetchNames() }, [])

  async function fetchSystems() {
    const { data } = await supabase.from('systems').select('*').order('equipment_name').order('serial_number')
    setSystems(data || [])
    setLoading(false)
  }

  async function fetchNames() {
    const { data } = await supabase.from('dropdown_options').select('value').eq('category', 'equipment_name').order('sort_order')
    setEquipmentNames(data?.map(d => d.value) || [])
  }

  async function handleDelete(item) {
    if (!confirm(`Delete system "${item.equipment_name} (${item.serial_number})"? This cannot be undone.`)) return
    await supabase.from('systems').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'system', entityId: item.id, entityLabel: item.equipment_name })
    fetchSystems()
  }

  const filtered = systems.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.equipment_name?.toLowerCase().includes(q) || s.serial_number?.toLowerCase().includes(q) || s.part_number?.toLowerCase().includes(q)
    const matchLoc = locationFilter === 'all' || s.location === locationFilter
    return matchSearch && matchLoc
  })

  const locationBadge = loc => {
    if (loc === 'At the Show') return <span className="badge b-green">{loc}</span>
    if (loc === 'Regal') return <span className="badge b-blue">{loc}</span>
    return <span className="badge b-grey">{loc || '—'}</span>
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Systems</h1>
          <p className="page-sub">{systems.length} system{systems.length !== 1 ? 's' : ''} in the registry</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}>
            <Plus size={14} /> Add System
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="row gap-3 mb-4" style={{ marginBottom: 14 }}>
          <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search name, serial, part number…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sel" style={{ width: 180 }} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
            <option value="all">All Locations</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon"><Package size={28} /></div><p>No systems found</p></div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Serial Number</th>
                    <th>Part Number</th>
                    <th>Crate</th>
                    <th>Dimensions</th>
                    <th>Location</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.equipment_name}</strong>{s.notes && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.notes}</div>}</td>
                      <td className="mono">{s.serial_number}</td>
                      <td className="mono muted">{s.part_number || '—'}</td>
                      <td className="muted">{s.crate_number || '—'}</td>
                      <td className="muted">{s.dimensions || '—'}</td>
                      <td>{locationBadge(s.location)}</td>
                      {isAdmin && (
                        <td>
                          <div className="row gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditItem(s); setShowForm(true) }}><Pencil size={13} /></button>
                            <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(s)}><Trash2 size={13} /></button>
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

      {showForm && (
        <SystemForm
          item={editItem}
          equipmentNames={equipmentNames}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); fetchSystems() }}
        />
      )}
    </>
  )
}
