import { useEffect, useState } from 'react'
import { Package, ExternalLink, Pencil, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// Inline edit modal — opens the system form directly from the show
function SystemEditModal({ system, equipmentNames, onClose, onSaved }) {
  const [form, setForm] = useState({
    equipment_name:   system.equipment_name   || '',
    serial_number:    system.serial_number    || '',
    part_number:      system.part_number      || '',
    crate_number:     system.crate_number     || '',
    location:         system.location         || 'Regal',
    dimensions:       system.dimensions       || '',
    equipment_weight: system.equipment_weight || '',
    crate_weight:     system.crate_weight     || '',
    notes:            system.notes            || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error } = await supabase.from('systems').update(form).eq('id', system.id)
    if (error) { setError(error.message); setSaving(false); return }
    await logAudit({ action: 'update', entityType: 'system', entityId: system.id, entityLabel: form.equipment_name, oldValue: system, newValue: form })
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-title">Edit System — {system.equipment_name}</h2>
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
              <div className="field"><label className="lbl">Serial Number *</label><input className="input" value={form.serial_number} onChange={set('serial_number')} required /></div>
              <div className="field"><label className="lbl">Part Number</label><input className="input" value={form.part_number} onChange={set('part_number')} /></div>
              <div className="field"><label className="lbl">Crate Number</label><input className="input" value={form.crate_number} onChange={set('crate_number')} /></div>
              <div className="field">
                <label className="lbl">Current Location</label>
                <select className="sel" value={form.location} onChange={set('location')}>
                  <option value="Regal">Regal</option>
                  <option value="Head Office (HO)">Head Office (HO)</option>
                  <option value="At the Show">At the Show</option>
                </select>
              </div>
              <div className="field"><label className="lbl">Dimensions</label><input className="input" value={form.dimensions} onChange={set('dimensions')} /></div>
              <div className="field"><label className="lbl">Equipment Weight</label><input className="input" value={form.equipment_weight} onChange={set('equipment_weight')} placeholder="e.g. 450 lbs" /></div>
              <div className="field"><label className="lbl">Crate Weight</label><input className="input" value={form.crate_weight} onChange={set('crate_weight')} placeholder="e.g. 1500 lbs" /></div>
              <div className="field fspan"><label className="lbl">Notes</label><textarea className="ta" value={form.notes} onChange={set('notes')} rows={2} /></div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spin spin-white" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EquipmentTab({ showId, isAdmin, isEditor }) {
  const tick = useRefreshTick()
  const [systems, setSystems]       = useState([])
  const [equipmentNames, setNames]  = useState([])
  const [loading, setLoading]       = useState(true)
  const [editSystem, setEditSystem] = useState(null)
  const navigate = useNavigate()
  const { isEditor: ctxEditor } = useAuth()
  // accept either prop-passed or context isEditor
  const canEdit = isEditor ?? ctxEditor

  useEffect(() => {
    supabase.from('show_systems')
      .select('system_id, systems(*)')
      .eq('tradeshow_id', showId)
      .then(({ data }) => {
        setSystems(data?.map(r => r.systems).filter(Boolean) || [])
        setLoading(false)
      })
    supabase.from('dropdown_options').select('value').eq('category', 'equipment_name').order('sort_order')
      .then(({ data }) => setNames(data?.map(d => d.value) || []))
  }, [showId, tick])

  const locBadge = loc => {
    const cls = loc === 'At the Show' ? 'b-green' : loc === 'Regal' ? 'b-blue' : 'b-grey'
    return <span className={`badge ${cls}`}>{loc || '—'}</span>
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div className="card">
      {systems.length === 0 ? (
        <div className="empty"><div className="empty-icon"><Package size={26} /></div><p>No systems assigned to this show</p></div>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {systems.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.equipment_name}</strong>{s.notes && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.notes}</div>}</td>
                  <td className="mono">{s.serial_number}</td>
                  <td className="mono muted">{s.part_number || '—'}</td>
                  <td className="muted">{s.crate_number || '—'}</td>
                  <td className="muted">{s.dimensions || '—'}</td>
                  <td>{locBadge(s.location)}</td>
                  <td>
                    <div className="row gap-2">
                      {/* Quick edit inline */}
                      {canEdit && (
                        <button className="btn btn-ghost btn-sm" title="Edit system" onClick={() => setEditSystem(s)}>
                          <Pencil size={13} />
                        </button>
                      )}
                      {/* Navigate to full system page */}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Open system page"
                        onClick={() => navigate(`/systems?highlight=${s.id}`)}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editSystem && (
        <SystemEditModal
          system={editSystem}
          equipmentNames={equipmentNames}
          onClose={() => setEditSystem(null)}
          onSaved={() => {
            setEditSystem(null)
            // Re-fetch
            supabase.from('show_systems').select('system_id, systems(*)').eq('tradeshow_id', showId)
              .then(({ data }) => setSystems(data?.map(r => r.systems).filter(Boolean) || []))
          }}
        />
      )}
    </div>
  )
}
