import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Eye, Download, X, FileText, Image, File } from 'lucide-react'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const BUCKET = 'tradeshow-files'

function fileIcon(mime) {
  if (!mime) return <File size={18} />
  if (mime.startsWith('image/')) return <Image size={18} style={{ color: 'var(--accent)' }} />
  if (mime === 'application/pdf') return <FileText size={18} style={{ color: 'var(--red)' }} />
  return <File size={18} style={{ color: 'var(--text-3)' }} />
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function canPreview(mime) {
  return mime && (mime.startsWith('image/') || mime === 'application/pdf')
}

function PreviewModal({ file, url, onClose }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 className="modal-title" style={{ fontSize: '14px', fontWeight: 500 }}>{file.file_name}</h2>
          <div className="flex gap-2">
            <a href={url} download={file.file_name} className="btn btn-secondary btn-sm">
              <Download size={13} /> Download
            </a>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '16px 24px 24px' }}>
          {file.mime_type?.startsWith('image/') ? (
            <img
              src={url}
              alt={file.file_name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
          ) : file.mime_type === 'application/pdf' ? (
            <iframe
              src={url}
              title={file.file_name}
              style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function FilesTab({ showId, showName }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)   // { file, url }
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const { isAdmin, user } = useAuth()

  useEffect(() => { fetchFiles() }, [showId])

  async function fetchFiles() {
    const { data } = await supabase.from('files')
      .select('*, uploader:uploaded_by(email)')
      .eq('entity_type', 'tradeshow')
      .eq('entity_id', showId)
      .order('uploaded_at', { ascending: false })
    setFiles(data || [])
    setLoading(false)
  }

  async function handleUpload(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop()
      const path = `${showId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
      if (uploadError) { console.error(uploadError); continue }
      const { data: record } = await supabase.from('files').insert({
        entity_type: 'tradeshow',
        entity_id: showId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user.id,
      }).select().single()
      await logAudit({ action: 'upload', entityType: 'file', entityId: record?.id, entityLabel: file.name, newValue: { show: showName, file: file.name } })
    }
    setUploading(false)
    fetchFiles()
  }

  async function getSignedUrl(storagePath) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 300)
    return data?.signedUrl
  }

  async function handlePreview(file) {
    const url = await getSignedUrl(file.storage_path)
    if (url) setPreview({ file, url })
  }

  async function handleDownload(file) {
    const url = await getSignedUrl(file.storage_path)
    if (url) { const a = document.createElement('a'); a.href = url; a.download = file.file_name; a.click() }
  }

  async function handleDelete(file) {
    if (!confirm(`Delete "${file.file_name}"?`)) return
    await supabase.storage.from(BUCKET).remove([file.storage_path])
    await supabase.from('files').delete().eq('id', file.id)
    await logAudit({ action: 'delete', entityType: 'file', entityId: file.id, entityLabel: file.file_name })
    fetchFiles()
  }

  const dropZoneStyle = {
    border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    background: dragOver ? 'var(--accent-dim)' : 'var(--surface-2)',
    marginBottom: '20px',
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><span className="spinner" /></div>

  return (
    <div>
      {/* Upload zone */}
      <div
        style={dropZoneStyle}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
      >
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--accent)' }}>
            <span className="spinner" /> <span>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={24} style={{ color: 'var(--text-3)', marginBottom: '10px' }} />
            <p style={{ fontWeight: 500, color: 'var(--text-1)', marginBottom: '4px' }}>Drop files here or click to upload</p>
            <p className="text-muted text-sm">Images, PDFs, Word docs, Excel files — up to 50MB each</p>
          </>
        )}
      </div>

      {/* Files list */}
      {files.length === 0 ? (
        <div className="card">
          <div className="empty"><div className="empty-icon">📎</div><p>No files attached yet</p></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Size</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {fileIcon(file.mime_type)}
                        <span style={{ fontWeight: 500 }}>{file.file_name}</span>
                      </div>
                    </td>
                    <td className="text-muted">{formatBytes(file.size_bytes)}</td>
                    <td className="text-muted">{file.uploader?.email || '—'}</td>
                    <td className="text-muted">{new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <div className="flex gap-2">
                        {canPreview(file.mime_type) && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(file)} title="Preview">
                            <Eye size={13} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(file)} title="Download">
                          <Download size={13} />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(file)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && (
        <PreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} />
      )}
    </div>
  )
}
