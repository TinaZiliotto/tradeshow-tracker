import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, Eye, Download, X, FileText, Image, File } from 'lucide-react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const BUCKET = 'tradeshow-files'

function fileIcon(mime) {
  if (!mime) return <File size={16} className="muted" />
  if (mime.startsWith('image/')) return <Image size={16} style={{ color: 'var(--accent)' }} />
  if (mime === 'application/pdf') return <FileText size={16} style={{ color: 'var(--red)' }} />
  return <File size={16} className="muted" />
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

export default function FilesTab({ showId, showName }) {
  const tick = useRefreshTick()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  const { isAdmin, user } = useAuth()

  useEffect(() => { fetchFiles() }, [showId])

  async function fetchFiles() {
    // Do NOT join on uploader — auth.users is not accessible via anon key
    // uploader_email is stored directly in the files row
    const { data, error } = await supabase
      .from('files')
      .select('id, file_name, storage_path, mime_type, size_bytes, uploaded_at, uploader_email')
      .eq('entity_type', 'tradeshow')
      .eq('entity_id', showId)
      .order('uploaded_at', { ascending: false })
    if (error) console.error('Files fetch error:', error)
    setFiles(data || [])
    setLoading(false)
  }

  async function handleUpload(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const f of Array.from(fileList)) {
      const path = `${showId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: storageErr } = await supabase.storage.from(BUCKET).upload(path, f)
      if (storageErr) { console.error('Storage upload error:', storageErr); continue }
      const { data: rec, error: dbErr } = await supabase.from('files').insert({
        entity_type: 'tradeshow',
        entity_id: showId,
        file_name: f.name,
        storage_path: path,
        mime_type: f.type,
        size_bytes: f.size,
        uploaded_by: user.id,
        uploader_email: user.email,  // store email directly — no join needed
      }).select().single()
      if (dbErr) console.error('DB insert error:', dbErr)
      await logAudit({ action: 'upload', entityType: 'file', entityId: rec?.id, entityLabel: f.name, newValue: { show: showName, file: f.name } })
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
    await logAudit({ action: 'delete', entityType: 'file', entityId: file.id, entityLabel: file.file_name })
    fetchFiles()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div>
      <div
        style={{ border: `2px dashed ${dragOver ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 28, textAlign: 'center', cursor: 'pointer', transition: 'all var(--ease)', background: dragOver ? 'var(--purple-dim)' : 'var(--surface-2)', marginBottom: 16 }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        {uploading
          ? <div className="row gap-2" style={{ justifyContent: 'center', color: 'var(--purple)' }}><span className="spin" /> Uploading…</div>
          : <><Upload size={22} className="muted" style={{ margin: '0 auto 8px' }} /><p style={{ fontWeight: 500, marginBottom: 3 }}>Drop files here or click to upload</p><p className="muted" style={{ fontSize: 12 }}>Images, PDFs, Word, Excel — up to 50 MB each</p></>
        }
      </div>

      {files.length === 0 ? (
        <div className="card"><div className="empty"><div className="empty-icon">📎</div><p>No files attached yet</p></div></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>File</th><th>Size</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id}>
                    <td><div className="row gap-2">{fileIcon(file.mime_type)}<span style={{ fontWeight: 500 }}>{file.file_name}</span></div></td>
                    <td className="muted">{fmtBytes(file.size_bytes)}</td>
                    <td className="muted">{file.uploader_email || '—'}</td>
                    <td className="muted">{new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <div className="row gap-2">
                        {(file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(file)} title="Preview"><Eye size={13} /></button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(file)} title="Download"><Download size={13} /></button>
                        {isAdmin && <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(file)} title="Delete"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && <PreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  )
}
