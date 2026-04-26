import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wrench, Paperclip, AlertTriangle, CheckCircle2, Clock, Plus, X, ChevronDown, ChevronUp, Upload, Eye, Download, FileText, Image, File, Trash2, Archive } from 'lucide-react'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BUCKET = 'tradeshow-files'

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtBytes(b) {
  if (!b) return ''
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function fileIcon(mime) {
  if (!mime) return <File size={15} style={{ color: 'var(--text-3)' }} />
  if (mime.startsWith('image/')) return <Image size={15} style={{ color: 'var(--accent)' }} />
  if (mime === 'application/pdf') return <FileText size={15} style={{ color: 'var(--red)' }} />
  return <File size={15} style={{ color: 'var(--text-3)' }} />
}

const SEVERITY_STYLES = {
  cosmetic:   { bg: 'rgba(81,198,219,0.1)',  border: 'rgba(81,198,219,0.3)',  color: '#1188a0', label: 'Cosmetic'   },
  functional: { bg: 'rgba(176,106,0,0.1)',   border: 'rgba(176,106,0,0.3)',   color: '#b06a00', label: 'Functional' },
  critical:   { bg: 'rgba(200,50,50,0.1)',   border: 'rgba(200,50,50,0.3)',   color: '#c83232', label: 'Critical'   },
}
function SeverityBadge({ sev }) {
  const s = SEVERITY_STYLES[sev] || SEVERITY_STYLES.cosmetic
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}
function locBadge(loc) {
  const cls = loc === 'At the Show' ? 'b-green' : loc === 'Regal' ? 'b-blue' : 'b-grey'
  return <span className={`badge ${cls}`}>{loc || '—'}</span>
}

// ─── File preview modal ───────────────────────────────────────────────────
function PreviewModal({ file, url, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-hd" style={{ flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{file.file_name}</span>
          <div className="row gap-2">
            <a href={url} download={file.file_name} className="btn btn-secondary btn-sm"><Download size={12} /> Download</a>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '14px 20px 20px' }}>
          {file.mime_type?.startsWith('image/')
            ? <img src={url} alt={file.file_name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
            : <iframe src={url} title={file.file_name} style={{ width: '100%', height: '62vh', border: 'none', borderRadius: 8 }} />
          }
        </div>
      </div>
    </div>
  )
}

// ─── Service entry form ───────────────────────────────────────────────────
function ServiceEntryForm({ systemId, shows, severities, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ description: '', severity: severities[0] || 'cosmetic', show_id: '' })
  const [pendingFiles, setPendingFiles] = useState([])  // files staged before save
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const imgRef = useRef(null)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  function handleFileStage(e) {
    const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    setPendingFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }
  function removeStaged(idx) { setPendingFiles(prev => prev.filter((_, i) => i !== idx)) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('system_service_entries').insert({
      system_id:   systemId,
      show_id:     form.show_id || null,
      description: form.description.trim(),
      severity:    form.severity,
      status:      'open',
      reported_by: user.email,
      reported_at: new Date().toISOString(),
    }).select().single()
    if (error) { setError(error.message); setSaving(false); return }

    // Upload any staged images — store as entity_type 'service_entry'
    for (const f of pendingFiles) {
      const path = `service/${data.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f)
      if (upErr) continue
      await supabase.from('files').insert({
        entity_type: 'service_entry', entity_id: data.id,
        file_name: f.name, storage_path: path,
        mime_type: f.type, size_bytes: f.size,
        uploaded_by: user.id, uploader_email: user.email,
      })
    }

    await logAudit({ action: 'create', entityType: 'service_entry', entityId: data.id, entityLabel: form.severity, newValue: form })
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-title">Report Service Issue</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-bd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="lbl">Severity</label>
              <select className="sel" value={form.severity} onChange={set('severity')}>
                {severities.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Related Show (optional)</label>
              <select className="sel" value={form.show_id} onChange={set('show_id')}>
                <option value="">— None / Not show-related —</option>
                {shows.map(s => <option key={s.id} value={s.id}>{s.show_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Description *</label>
              <textarea className="ta" rows={4} value={form.description} onChange={set('description')}
                placeholder="Describe the issue in detail — what was found, where, and any relevant context…" />
            </div>
            <div className="field">
              <label className="lbl">Attach Images / Photos (optional)</label>
              <input ref={imgRef} type="file" multiple accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileStage} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => imgRef.current?.click()}>
                <Image size={13} /> Add Photos or Files
              </button>
              {pendingFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                  {pendingFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      {f.type.startsWith('image/') ? <Image size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} /> : <FileText size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 4px' }} onClick={() => removeStaged(i)}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>Images will be stored with this service request and only visible when viewing it.</p>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spin spin-white" /> : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Resolve entry form ───────────────────────────────────────────────────
function ResolveForm({ entry, onClose, onSaved }) {
  const { user } = useAuth()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleResolve(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('system_service_entries').update({
      status:          'resolved',
      resolved_by:     user.email,
      resolved_at:     new Date().toISOString(),
      resolution_note: note.trim() || null,
    }).eq('id', entry.id)
    await logAudit({ action: 'update', entityType: 'service_entry', entityId: entry.id, entityLabel: 'resolved', newValue: { resolved_by: user.email } })
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-title">Mark as Resolved</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleResolve}>
          <div className="modal-bd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-1)' }}>Issue:</strong> {entry.description}
            </div>
            <div className="field">
              <label className="lbl">Resolution Note (optional)</label>
              <textarea className="ta" rows={4} value={note} onChange={e => setNote(e.target.value)}
                placeholder="What was done to fix this issue?" />
            </div>
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? <span className="spin spin-white" /> : <><CheckCircle2 size={14} /> Confirm Resolved</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Service entry card ───────────────────────────────────────────────────
function ServiceCard({ entry, showName, isEditor, isAdmin, onResolve, onDelete }) {
  const isOpen = entry.status === 'open'
  const sev = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.cosmetic

  return (
    <div style={{
      border: `1px solid ${isOpen ? sev.border : 'var(--border)'}`,
      borderLeft: `4px solid ${isOpen ? sev.color : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      background: isOpen ? sev.bg : 'var(--surface-2)',
      padding: '14px 16px',
      opacity: isOpen ? 1 : 0.7,
    }}>
      <div className="row-sb" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <SeverityBadge sev={entry.severity} />
          {isOpen
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}><Clock size={12} /> Open</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}><CheckCircle2 size={12} /> Resolved</span>
          }
          {showName && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {showName}</span>}
        </div>
        <div className="row gap-2">
          {isEditor && isOpen && (
            <button className="btn btn-sm" style={{ background: 'rgba(26,122,80,0.1)', color: 'var(--green)', border: '1px solid rgba(26,122,80,0.2)' }} onClick={() => onResolve(entry)}>
              <CheckCircle2 size={13} /> Resolve
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-ghost btn-sm danger" onClick={() => onDelete(entry)} title="Delete"><Trash2 size={13} /></button>
          )}
        </div>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{entry.description}</p>

      {entry.resolution_note && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 3px', fontWeight: 500 }}>RESOLUTION</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{entry.resolution_note}</p>
        </div>
      )}

      {/* Attached images/files - only visible when viewing this service entry */}
      {entryFiles.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {entryFiles.map(f => (
            f.mime_type?.startsWith('image/')
              ? <div key={f.id}
                  style={{ width: 80, height: 80, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface-2)' }}
                  onClick={() => handleImgPreview(f)}>
                  <ServiceImage file={f} signedUrl={signedUrl} />
                </div>
              : <button key={f.id} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => handleImgPreview(f)}>
                  <FileText size={12} /> {f.file_name}
                </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Reported by {entry.reported_by} · {fmtDateTime(entry.reported_at)}</span>
        {!isOpen && entry.resolved_by && (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Resolved by {entry.resolved_by} · {fmtDateTime(entry.resolved_at)}</span>
        )}
      </div>
      {preview && <PreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  )
}

// Lazy-loading image component for service entry attachments
function ServiceImage({ file, signedUrl }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { signedUrl(file.storage_path).then(u => u && setSrc(u)) }, [file.id])
  if (!src) return <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spin" style={{ width: 16, height: 16 }} /></div>
  return <img src={src} alt={file.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}

// ─── Files section ────────────────────────────────────────────────────────
function SystemFilesSection({ systemId, isAdmin }) {
  const tick = useRefreshTick()
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    supabase.from('files').select('id,file_name,storage_path,mime_type,size_bytes,uploaded_at,uploader_email')
      .eq('entity_type', 'system').eq('entity_id', systemId).order('uploaded_at', { ascending: false })
      .then(({ data }) => setFiles(data || []))
  }, [systemId, tick])

  async function handleUpload(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const f of Array.from(fileList)) {
      const path = `systems/${systemId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, f)
      if (error) continue
      await supabase.from('files').insert({ entity_type: 'system', entity_id: systemId, file_name: f.name, storage_path: path, mime_type: f.type, size_bytes: f.size, uploaded_by: user.id, uploader_email: user.email })
    }
    setUploading(false)
    supabase.from('files').select('id,file_name,storage_path,mime_type,size_bytes,uploaded_at,uploader_email')
      .eq('entity_type', 'system').eq('entity_id', systemId).order('uploaded_at', { ascending: false })
      .then(({ data }) => setFiles(data || []))
  }

  async function signedUrl(path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
    return data?.signedUrl
  }
  async function handlePreview(file) { const u = await signedUrl(file.storage_path); if (u) setPreview({ file, url: u }) }
  async function handleDownload(file) { const u = await signedUrl(file.storage_path); if (u) { const a = document.createElement('a'); a.href = u; a.download = file.file_name; a.click() } }
  async function handleDelete(file) {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    await supabase.storage.from(BUCKET).remove([file.storage_path])
    await supabase.from('files').delete().eq('id', file.id)
    setFiles(prev => prev.filter(f => f.id !== file.id))
  }

  return (
    <div>
      <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)', marginBottom: 14 }}
        onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        {uploading
          ? <div className="row gap-2" style={{ justifyContent: 'center', color: 'var(--purple)' }}><span className="spin" /> Uploading…</div>
          : <><Upload size={18} style={{ color: 'var(--text-3)', marginBottom: 6 }} /><p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Drop files or click to upload</p><p style={{ fontSize: 12, color: 'var(--text-3)' }}>Images, PDFs, drawings — up to 50 MB</p></>
        }
      </div>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(file => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              {fileIcon(file.mime_type)}
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{fmtBytes(file.size_bytes)}</span>
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

// ─── Main System Detail Page ──────────────────────────────────────────────
export default function SystemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tick = useRefreshTick()
  const { isAdmin, isEditor } = useAuth()

  const [system, setSystem]           = useState(null)
  const [entries, setEntries]         = useState([])
  const [shows, setShows]             = useState([])
  const [severities, setSeverities]   = useState([])
  const [showNames, setShowNames]     = useState({}) // id -> name
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('service')
  const [showForm, setShowForm]       = useState(false)
  const [resolveEntry, setResolveEntry] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { fetchAll() }, [id, tick])

  async function fetchAll() {
    const [sysRes, entriesRes, showsRes, sevRes] = await Promise.all([
      supabase.from('systems').select('*').eq('id', id).single(),
      supabase.from('system_service_entries').select('*').eq('system_id', id).order('reported_at', { ascending: false }),
      supabase.from('tradeshows').select('id, show_name').order('dates_start', { ascending: false }),
      supabase.from('dropdown_options').select('value').eq('category', 'service_severity').order('sort_order'),
    ])
    setSystem(sysRes.data)
    setEntries(entriesRes.data || [])
    setShows(showsRes.data || [])
    // Build show name lookup
    const names = {}
    showsRes.data?.forEach(s => { names[s.id] = s.show_name })
    setShowNames(names)
    // Severities — fallback to defaults if not configured yet
    const sevs = sevRes.data?.map(d => d.value.toLowerCase())
    setSeverities(sevs?.length ? sevs : ['cosmetic', 'functional', 'critical'])
    setLoading(false)
  }

  async function handleDelete(entry) {
    if (!confirm('Permanently delete this service entry? This cannot be undone.')) return
    await supabase.from('system_service_entries').delete().eq('id', entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  if (loading) return <div className="load-screen"><span className="spin" /></div>
  if (!system) return <div className="page-body"><p>System not found.</p></div>

  const openEntries     = entries.filter(e => e.status === 'open')
  const resolvedEntries = entries.filter(e => e.status === 'resolved')
  const hasCritical     = openEntries.some(e => e.severity === 'critical')
  const hasFunctional   = openEntries.some(e => e.severity === 'functional')

  const statusColor = hasCritical ? 'var(--red)' : hasFunctional ? 'var(--amber)' : openEntries.length ? '#1188a0' : 'var(--green)'
  const statusLabel = hasCritical ? 'Critical Issues' : hasFunctional ? 'Functional Issues' : openEntries.length ? 'Cosmetic Issues' : 'All Clear'
  const statusIcon  = openEntries.length ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />

  return (
    <>
      {/* ── Header ── */}
      <div className="page-head">
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/systems')}><ArrowLeft size={14} /> Systems</button>
          <div>
            <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <h1 className="page-title">{system.equipment_name}</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${statusColor}15`, border: `1px solid ${statusColor}40`, color: statusColor, fontSize: 11, fontWeight: 600 }}>
                {statusIcon} {statusLabel}
              </span>
            </div>
            <p className="page-sub">S/N: {system.serial_number}{system.part_number ? ` · ${system.part_number}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* ── System info card ── */}
        <div className="card card-bd" style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
            <div><div className="lbl" style={{ marginBottom: 2 }}>Location</div>{locBadge(system.location)}</div>
            {system.crate_number  && <div><div className="lbl" style={{ marginBottom: 2 }}>Crate</div><span style={{ fontSize: 13 }}>{system.crate_number}</span></div>}
            {system.dimensions    && <div><div className="lbl" style={{ marginBottom: 2 }}>Dimensions</div><span style={{ fontSize: 13 }}>{system.dimensions}</span></div>}
            {system.equipment_weight && <div><div className="lbl" style={{ marginBottom: 2 }}>Eq. Weight</div><span style={{ fontSize: 13 }}>{system.equipment_weight}</span></div>}
            {system.crate_weight  && <div><div className="lbl" style={{ marginBottom: 2 }}>Crate Weight</div><span style={{ fontSize: 13 }}>{system.crate_weight}</span></div>}
            {system.notes         && <div style={{ gridColumn: '1 / -1' }}><div className="lbl" style={{ marginBottom: 2 }}>Notes</div><span style={{ fontSize: 13 }}>{system.notes}</span></div>}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          <button className={`tab ${tab === 'service' ? 'active' : ''}`} onClick={() => setTab('service')}>
            Service Log
            {openEntries.length > 0 && (
              <span style={{ marginLeft: 6, background: hasCritical ? 'var(--red)' : 'var(--amber)', color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 10, fontWeight: 700 }}>
                {openEntries.length}
              </span>
            )}
          </button>
          <button className={`tab ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
            Files
          </button>
        </div>

        {/* ── Service log tab ── */}
        {tab === 'service' && (
          <div>
            <div className="row-sb" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                {openEntries.length === 0 ? 'No open issues.' : `${openEntries.length} open issue${openEntries.length !== 1 ? 's' : ''}`}
                {resolvedEntries.length > 0 && ` · ${resolvedEntries.length} archived`}
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Report Issue
              </button>
            </div>

            {/* Open entries */}
            {openEntries.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <div className="empty-icon"><CheckCircle2 size={28} style={{ color: 'var(--green)' }} /></div>
                  <p style={{ color: 'var(--green)', fontWeight: 500 }}>No open issues</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>This system is clear for use.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {openEntries.map(entry => (
                  <ServiceCard key={entry.id} entry={entry} showName={showNames[entry.show_id]}
                    isEditor={isEditor} isAdmin={isAdmin}
                    onResolve={setResolveEntry} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {/* Archived toggle */}
            {resolvedEntries.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowArchived(s => !s)}
                  style={{ color: 'var(--text-3)', gap: 6 }}
                >
                  <Archive size={13} />
                  {showArchived ? 'Hide' : 'Show'} {resolvedEntries.length} archived entr{resolvedEntries.length !== 1 ? 'ies' : 'y'}
                  {showArchived ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {showArchived && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {resolvedEntries.map(entry => (
                      <ServiceCard key={entry.id} entry={entry} showName={showNames[entry.show_id]}
                        isEditor={isEditor} isAdmin={isAdmin}
                        onResolve={setResolveEntry} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Files tab ── */}
        {tab === 'files' && <SystemFilesSection systemId={id} isAdmin={isAdmin} />}
      </div>

      {showForm && (
        <ServiceEntryForm systemId={id} shows={shows} severities={severities}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchAll() }} />
      )}
      {resolveEntry && (
        <ResolveForm entry={resolveEntry}
          onClose={() => setResolveEntry(null)}
          onSaved={() => { setResolveEntry(null); fetchAll() }} />
      )}
    </>
  )
}
