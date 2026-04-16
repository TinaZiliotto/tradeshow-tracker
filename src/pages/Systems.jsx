import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, X, Search, Package, Upload, Eye, Download, FileText, Image, File, ChevronDown, ChevronUp, Paperclip, ArrowUp, ArrowDown } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BUCKET = 'tradeshow-files'

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
      .select('id, file_name, storage_path, mime_type, size_bytes, uploaded_at, uploader_email')
      .eq('entity_type', 'system').eq('entity_id', systemId)
      .order('uploaded_at', { ascending: false })
    setFiles(data || []); setLoading(false)
  }

  async function handleUpload(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const f of Array.from(fileList)) {
      const path = `systems/${systemId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, f)
      if (error) { console.error(error); continue }
      await supabase.from('files').insert({
        entity_type: 'system', entity_id: systemId,
        file_name: f.name, storage_path: path,
        mime_type: f.type, size_bytes: f.size,
        uploaded_by: user.id, uploader_email: user.email,
      })
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
                  <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(file)}><Eye size={12} /></button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(file)}><Download size={12} /></button>
                {isAdmin && <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(file)}><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && <PreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  )
}

function SystemForm({ item, equipmentNames, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    equipment_name: item?.equipment_name || '',
    serial_number:  item?.serial_number  || '',
    part_number:    item?.part_number    || '',
    crate_number:   item?.crate_number   || '',
    location:       item?.location       || 'Regal',
    dimensions:       item?.dimensions       || '',
    equipment_weight: item?.equipment_weight || '',
    crate_weight:     item?.crate_weight     || '',
    notes:            item?.notes            || '',
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
              <div className="field"><label className="lbl">Serial Number *</label><input className="input" value={form.serial_number} onChange={set('serial_number')} required placeholder="e.g. CD32054" /></div>
              <div className="field"><label className="lbl">Part Number</label><input className="input" value={form.part_number} onChange={set('part_number')} placeholder="e.g. D-SSHR14X7S-EPH" /></div>
              <div className="field"><label className="lbl">Crate Number</label><input className="input" value={form.crate_number} onChange={set('crate_number')} /></div>
              <div className="field">
                <label className="lbl">Current Location</label>
                <select className="sel" value={form.location} onChange={set('location')}>
                  <option value="Regal">Regal</option>
                  <option value="Head Office (HO)">Head Office (HO)</option>
                  <option value="At the Show">At the Show</option>
                </select>
              </div>
              <div className="field"><label className="lbl">Dimensions</label><input className="input" value={form.dimensions} onChange={set('dimensions')} placeholder='e.g. 96"L x 66"W' /></div>
              <div className="field"><label className="lbl">Equipment Weight</label><input className="input" value={form.equipment_weight} onChange={set('equipment_weight')} placeholder="e.g. 450 lbs" /></div>
              <div className="field"><label className="lbl">Crate Weight</label><input className="input" value={form.crate_weight} onChange={set('crate_weight')} placeholder="e.g. 1500 lbs" /></div>
              <div className="field fspan"><label className="lbl">Notes</label><textarea className="ta" value={form.notes} onChange={set('notes')} rows={2} /></div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <div className="info-box">After saving, expand the system row in the table to upload drawings, PDFs, or images.</div>
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

function SortIcon({ col, sortCol, dir }) {
  if (sortCol !== col) return <ArrowUp size={11} style={{ opacity: 0.25, marginLeft: 3 }} />
  return dir === 'asc'
    ? <ArrowUp size={11} style={{ color: 'var(--purple)', marginLeft: 3 }} />
    : <ArrowDown size={11} style={{ color: 'var(--purple)', marginLeft: 3 }} />
}

export default function Systems() {
  const tick = useRefreshTick()
  const [systems, setSystems] = useState([])
  const [equipmentNames, setEquipmentNames] = useState([])
  const [fileCounts, setFileCounts] = useState({}) // { systemId: count }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [sortCol, setSortCol] = useState('equipment_name')
  const [sortDir, setSortDir] = useState('asc')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const { isAdmin, isEditor } = useAuth()
  const location = useLocation()

  // Auto-expand a system when navigated from a show entry
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const highlight = params.get('highlight')
    if (highlight) setExpandedId(highlight)
  }, [location.search])

  const LOCATIONS = ['Regal', 'Head Office (HO)', 'At the Show']

  useEffect(() => { fetchSystems(); fetchNames() }, [tick])

  async function fetchSystems() {
    const { data } = await supabase.from('systems').select('*')
    setSystems(data || [])
    setLoading(false)
    // Load file counts for all systems
    if (data?.length) {
      const ids = data.map(s => s.id)
      const { data: files } = await supabase.from('files')
        .select('entity_id').eq('entity_type', 'system').in('entity_id', ids)
      const counts = {}
      files?.forEach(f => { counts[f.entity_id] = (counts[f.entity_id] || 0) + 1 })
      setFileCounts(counts)
    }
  }

  async function fetchNames() {
    const { data } = await supabase.from('dropdown_options').select('value').eq('category', 'equipment_name').order('sort_order')
    setEquipmentNames(data?.map(d => d.value) || [])
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.equipment_name} (${item.serial_number})"?`)) return
    await supabase.from('systems').delete().eq('id', item.id)
    await logAudit({ action: 'delete', entityType: 'system', entityId: item.id, entityLabel: item.equipment_name })
    fetchSystems()
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = systems
    .filter(s => {
      const q = search.toLowerCase()
      return (!q || s.equipment_name?.toLowerCase().includes(q) || s.serial_number?.toLowerCase().includes(q) || s.part_number?.toLowerCase().includes(q))
        && (locationFilter === 'all' || s.location === locationFilter)
    })
    .sort((a, b) => {
      const va = (sortCol === 'serial_number' ? a.serial_number : a.equipment_name) || ''
      const vb = (sortCol === 'serial_number' ? b.serial_number : b.equipment_name) || ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
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
        {isEditor && (
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
                    <th className="sortable" onClick={() => toggleSort('equipment_name')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>Equipment <SortIcon col="equipment_name" sortCol={sortCol} dir={sortDir} /></span>
                    </th>
                    <th className="sortable" onClick={() => toggleSort('serial_number')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>Serial Number <SortIcon col="serial_number" sortCol={sortCol} dir={sortDir} /></span>
                    </th>
                    <th>Part Number</th>
                    <th>Crate</th>
                    <th>Dimensions</th>
                    <th>Eq. Weight</th>
                    <th>Crate Weight</th>
                    <th>Location</th>
                    <th title="Has file attachments">Attachments</th>
                    {isEditor && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <>
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/systems/${s.id}`)}>
                        <td onClick={e => e.stopPropagation()} style={{ color: 'var(--text-3)', cursor: 'pointer' }}
                          title="Expand attachments"
                          onClick={e => { e.stopPropagation(); setExpandedId(expandedId === s.id ? null : s.id) }}>
                          {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-1)' }}>{s.equipment_name}</strong>
                          {s.notes && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.notes}</div>}
                        </td>
                        <td className="mono">{s.serial_number}</td>
                        <td className="mono muted">{s.part_number || '—'}</td>
                        <td className="muted">{s.crate_number || '—'}</td>
                        <td className="muted">{s.dimensions || '—'}</td>
                        <td className="muted">{s.equipment_weight || '—'}</td>
                        <td className="muted">{s.crate_weight || '—'}</td>
                        <td>{locBadge(s.location)}</td>
                        <td>
                          {fileCounts[s.id] > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--purple)', fontSize: 12 }}>
                              <Paperclip size={13} />
                              <span>{fileCounts[s.id]}</span>
                            </span>
                          )}
                        </td>
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
                          <td colSpan={isEditor ? 11 : 10} style={{ padding: 0, border: 'none' }}>
                            <SystemFiles
                              systemId={s.id}
                              systemName={`${s.equipment_name} (${s.serial_number})`}
                              isAdmin={isAdmin}
                            />
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
