import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, X, Search, Package, Upload, Eye, Download, FileText, Image, File, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BUCKET = 'tradeshow-files'

// ─── File helpers ────────────────────────────────────────────
function fileIcon(mime) {
  if (!mime) return <File size={15} className="muted" />
  if (mime.startsWith('image/')) return <Image size={15} style={{ color: 'var(--accent)' }} />
  if (mime === 'application/pdf') return <FileText size={15} style={{ color: 'var(--red)' }} />
  return <File size={15} className="muted" />
}
function fmtBytes(b) {
  if (!b) return ''
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ─── Preview modal ───────────────────────────────────────────
function PreviewModal({ file, url, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-hd" style={{ flexShrink: 0 }}>
          <h2 className="modal-title" style={{ fontSize: 13, fontWeight: 500 }}>{file.file_name}</h2>
          <div className="row gap-2">
            <a href={url} download={file.file_name} className="btn btn-secondary btn-sm"><Download size={12} /> Download</a>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '14px 20px 20px' }}>
          {file.mime_type?.startsWith('image/') ? (
            <img src={url} alt={file.file_name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
          ) : file.mime_type === 'application/pdf' ? (
            <iframe src={url} title={file.file_name} style={{ width: '100%', height: '62vh', border: 'none', borderRadius: 8 }} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── System files section (inline inside row expand) ─────────
function SystemFiles({ systemId, systemName, isAdmin }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const { user } = useAuth()

  useEffect(() => { fetchFiles() }, [systemId])

  async function fetchFiles() {
    const { data } = await supabase.from('files')
      .select('*')
      .eq('entity_type', 'system')
      .eq('entity_id', systemId)
      .order('uploaded_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  async function handleUpload(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const f of Array.from(fileList)) {
      const path = `systems/${systemId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, f)
      if (error) { console.error(error); continue }
      const { data: rec } = await supabase.from('files').insert({
        entity_type: 'system', entity_id: systemId,
        file_name: f.name, storage_path: path,
        mime_type: f.type, size_bytes: f.size, uploaded_by: user.id,
      }).select().single()
      await logAudit({ action: 'upload', entityType: 'file', entityId: rec?.id, entityLabel: f.name, newValue: { system: systemName, file: f.name } })
    }
    setUploading(false)
    fetchFiles()
  }

  async function signedUrl(path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
    return data?.signedUrl
  }

  async function handlePreview(file) {
    const url = await signedUrl(file.storage_path)
    if (url) setPreview({ file, url })
  }

  async function handleDownload(file) {
    const url = await signedUrl(file.storage_path)
    if (url) { const a = document.createElement('a'); a.href = url; a.download = file.file_name; a.click() }
  }

  async function handleDelete(file) {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    await supabase.storage.from(BUCKET).remove([file.storage_path])
    await supabase.from('files').delete().eq('id', file.id)
    fetchFiles()
  }

  return (
    <div style={{ padding: '14px 16px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
      <div className="row-sb" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Attachments — {systemName}
        </span>
        <div className="row gap-2">
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
          <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <span className="spin spin-white" style={{ width: 13, height: 13 }} /> : <><Upload size={12} /> Upload File</>}
          </button>
        </div>
      </div>

      {loading ? <span className="spin" /> : files.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No files attached to this system yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(file => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              {fileIcon(file.mime_type)}
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0 }} className="trunc">{file.file_name}</span>
              <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>{fmtBytes(file.size_bytes)}</span>
              <div className="row gap-1">
                {(file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf') && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(file)} title="Preview"><Eye size={12} /></button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(file)} title="Download"><Download size={12} /></button>
                {isAdmin && <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(file)} title="Delete"><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && <PreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  )
}

// ─── Add/Edit System form ────────────────────────────────────
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
                  <option value="Regal">Regal</option>
                  <option value="Head Office (HO)">Head Office (HO)</option>
                  <option value="At the Show">At the Show</option>
                </select>
              </div>
              <div className="field">
                <label className="lbl">Dimensions</label>
                <input className="input" value={form.dimensions} onChange={set('dimensions')} placeholder='e.g. 96"L x 66"W' />
              </div>
              <div className="field fspan">
                <label className="lbl">Notes</label>
                <textarea className="ta" value={form.notes} onChange={set('notes')} rows={2} />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            {isEdit && (
              <div className="info-box">
                After saving, use the <strong>Files</strong> row expander in the table to upload drawings, PDFs, or images for this system.
              </div>
            )}
            {!isEdit && (
              <div className="info-box">
                After creating the system, expand its row in the table to upload files (drawings, PDFs, images).
              </div>
            )}
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

// ─── Main Systems page ───────────────────────────────────────
export default function Systems() {
  const [systems, setSystems] = useState([])
  const [equipmentNames, setEquipmentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const { isAdmin } = useAuth()

  const LOCATIONS = ['Regal', 'Head Office (HO)', 'At the Show']

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
    return (!q || s.equipment_name?.toLowerCase().includes(q) || s.serial_number?.toLowerCase().includes(q) || s.part_number?.toLowerCase().includes(q))
      && (locationFilter === 'all' || s.location === locationFilter)
  })

  const locBadge = loc => {
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
        <div className="row gap-3" style={{ marginBottom: 14 }}>
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
                    <th style={{ width: 32 }}></th>
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
                    <>
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                        <td style={{ color: 'var(--text-3)' }}>
                          {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                        <td><strong>{s.equipment_name}</strong>{s.notes && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.notes}</div>}</td>
                        <td className="mono">{s.serial_number}</td>
                        <td className="mono muted">{s.part_number || '—'}</td>
                        <td className="muted">{s.crate_number || '—'}</td>
                        <td className="muted">{s.dimensions || '—'}</td>
                        <td>{locBadge(s.location)}</td>
                        {isAdmin && (
                          <td onClick={e => e.stopPropagation()}>
                            <div className="row gap-2">
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditItem(s); setShowForm(true) }}><Pencil size={13} /></button>
                              <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(s)}><Trash2 size={13} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {expandedId === s.id && (
                        <tr key={`${s.id}-files`}>
                          <td colSpan={isAdmin ? 8 : 7} style={{ padding: 0, border: 'none' }}>
                            <SystemFiles systemId={s.id} systemName={`${s.equipment_name} (${s.serial_number})`} isAdmin={isAdmin} />
                          </td>
                        </tr>
                      )}
                    </>
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
