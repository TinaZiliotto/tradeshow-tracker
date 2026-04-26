import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, Eye, Download, X, FileText, Image, File, FolderOpen, Folder, ChevronDown, ChevronUp } from 'lucide-react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const BUCKET = 'tradeshow-files'

// Default folders — overridden by dropdown_options category 'file_folder'
const DEFAULT_FOLDERS = ['Booth', 'Badges', 'Electrical', 'Furniture', 'Lead Retrieval', 'Other']

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

// ── Single folder section ──────────────────────────────────────────────────
function FolderSection({ folder, files, canWrite, isAdmin, showId, showName, onUploaded, onDeleted }) {
  const [open, setOpen]       = useState(true)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const { user } = useAuth()

  async function handleUpload(fileList) {
    if (!fileList?.length) return
    setUploading(true)
    for (const f of Array.from(fileList)) {
      const path = `${showId}/folders/${folder}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: storageErr } = await supabase.storage.from(BUCKET).upload(path, f)
      if (storageErr) { console.error(storageErr); continue }
      const { data: rec } = await supabase.from('files').insert({
        entity_type: 'tradeshow', entity_id: showId,
        file_name: f.name, storage_path: path,
        mime_type: f.type, size_bytes: f.size,
        uploaded_by: user.id, uploader_email: user.email,
        folder: folder,
      }).select().single()
      await logAudit({ action: 'upload', entityType: 'file', entityId: rec?.id, entityLabel: f.name, newValue: { show: showName, folder, file: f.name } })
    }
    setUploading(false)
    onUploaded()
  }

  async function signedUrl(storagePath) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 300)
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
    onDeleted()
  }

  const hasFiles = files.length > 0

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 10 }}>
      {/* Folder header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: open ? 'var(--surface)' : 'var(--surface-2)', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {open
            ? <FolderOpen size={16} style={{ color: 'var(--purple)', flexShrink: 0 }} />
            : <Folder     size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          }
          <span style={{ fontWeight: 600, fontSize: 13, color: open ? 'var(--text-1)' : 'var(--text-2)' }}>{folder}</span>
          {hasFiles && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 7px' }}>
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Upload button — only for editors/admins, stop propagation so it doesn't toggle folder */}
          {canWrite && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11 }}
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              disabled={uploading}
            >
              {uploading
                ? <span className="spin" style={{ width: 12, height: 12 }} />
                : <><Upload size={12} /> Upload</>
              }
            </button>
          )}
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />

      {/* Folder body */}
      {open && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            background: dragging ? 'var(--purple-dim)' : 'var(--surface)',
            transition: 'background var(--ease)',
            minHeight: 56,
          }}
          onDragOver={e => { if (!canWrite) return; e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { if (!canWrite) return; e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files) }}
        >
          {files.length === 0 ? (
            <div style={{ padding: '18px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {canWrite ? `Drop files here or click Upload to add files to ${folder}.` : 'No files in this folder yet.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '7px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>File</th>
                  <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Size</th>
                  <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Uploaded by</th>
                  <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Date</th>
                  <th style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {fileIcon(file.mime_type)}
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{file.file_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-3)' }}>{fmtBytes(file.size_bytes)}</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-3)' }}>{file.uploader_email || '—'}</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(file)} title="Preview"><Eye size={13} /></button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(file)} title="Download"><Download size={13} /></button>
                        {(isAdmin || canWrite) && (
                          <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(file)} title="Delete"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {preview && <PreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} />}
    </div>
  )
}

// ── Main FilesTab ──────────────────────────────────────────────────────────
export default function FilesTab({ showId, showName }) {
  const tick = useRefreshTick()
  const [files, setFiles]     = useState([])
  const [folders, setFolders] = useState(DEFAULT_FOLDERS)
  const [loading, setLoading] = useState(true)
  const { isAdmin, isEditor, user } = useAuth()
  const canWrite = isAdmin || isEditor

  useEffect(() => {
    Promise.all([
      supabase.from('files')
        .select('id, file_name, storage_path, mime_type, size_bytes, uploaded_at, uploader_email, folder')
        .eq('entity_type', 'tradeshow').eq('entity_id', showId)
        .order('uploaded_at', { ascending: false }),
      supabase.from('dropdown_options')
        .select('value').eq('category', 'file_folder').order('sort_order'),
    ]).then(([{ data: f }, { data: d }]) => {
      setFiles(f || [])
      if (d?.length) setFolders(d.map(x => x.value))
      setLoading(false)
    })
  }, [showId, tick])

  function refetch() {
    supabase.from('files')
      .select('id, file_name, storage_path, mime_type, size_bytes, uploaded_at, uploader_email, folder')
      .eq('entity_type', 'tradeshow').eq('entity_id', showId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => setFiles(data || []))
  }

  // Files not assigned to any known folder go to "Other"
  function filesForFolder(folder) {
    if (folder === 'Other') {
      return files.filter(f => !f.folder || !folders.includes(f.folder) || f.folder === 'Other')
    }
    return files.filter(f => f.folder === folder)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div>
      {!canWrite && (
        <div className="info-box" style={{ marginBottom: 14 }}>
          You have view-only access. Contact an Admin or Editor to upload files.
        </div>
      )}
      {folders.map(folder => (
        <FolderSection
          key={folder}
          folder={folder}
          files={filesForFolder(folder)}
          canWrite={canWrite}
          isAdmin={isAdmin}
          showId={showId}
          showName={showName}
          onUploaded={refetch}
          onDeleted={refetch}
        />
      ))}
    </div>
  )
}
