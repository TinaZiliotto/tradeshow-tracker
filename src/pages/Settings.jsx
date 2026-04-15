import { useEffect, useState } from 'react'
import { Plus, X, Trash2, UserPlus, Ban, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DROPDOWN_SECTIONS = [
  { key: 'equipment_name',   label: 'Equipment Names',           desc: 'Names available when creating systems.' },
  { key: 'contact',          label: 'Show Contacts',             desc: 'People selectable as show contact.' },
  { key: 'show_status',      label: 'Show Statuses',             desc: 'Status options for each show.' },
  { key: 'system_location',  label: 'System Locations',          desc: 'Location options on system records.' },
  { key: 'merchandise_item', label: 'Merchandise Items',         desc: 'Items in the Merchandise supply section.' },
  { key: 'cleaning_item',    label: 'Cleaning Supplies',         desc: 'Items in the Cleaning Supplies section.' },
  { key: 'office_item',      label: 'Office Supplies',           desc: 'Items in the Office Supplies section.' },
  { key: 'electrical_item',  label: 'Electrical Supplies',       desc: 'Items in the Electrical Supplies section.' },
  { key: 'misc_item',        label: 'Miscellaneous Supplies',    desc: 'Items in the Miscellaneous section.' },
  { key: 'brochure_item',    label: 'Brochure Names',            desc: 'Default brochures added to every new show.' },
  { key: 'checklist_item',   label: 'Checklist Items',           desc: 'Default checklist tasks for each show.' },
  { key: 'service_severity',  label: 'Service Issue Severities',  desc: 'Severity levels for system service log entries.' },
]

function DropSection({ category, label, desc }) {
  const [items, setItems] = useState([])
  const [newVal, setNewVal] = useState('')
  const [adding, setAdding] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { fetch() }, [category])

  async function fetch() {
    const { data } = await supabase.from('dropdown_options').select('*').eq('category', category).order('sort_order').order('value')
    setItems(data || []); setLoaded(true)
  }

  async function add(e) {
    e.preventDefault(); if (!newVal.trim()) return
    setAdding(true)
    await supabase.from('dropdown_options').insert({ category, value: newVal.trim(), sort_order: items.length + 1 })
    setNewVal(''); setAdding(false); fetch()
  }

  async function remove(id, val) {
    if (!confirm(`Remove "${val}"?`)) return
    await supabase.from('dropdown_options').delete().eq('id', id); fetch()
  }

  if (!loaded) return null

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-hd"><div><div className="card-title">{label}</div><div className="muted" style={{ fontSize:12, marginTop:2 }}>{desc}</div></div></div>
      <div className="card-bd">
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom: items.length ? 12 : 0 }}>
          {items.map(item => (
            <span key={item.id} style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:20, padding:'3px 10px 3px 12px', fontSize:13 }}>
              {item.value}
              <button onClick={() => remove(item.id, item.value)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', padding:1 }}
                onMouseOver={e=>e.currentTarget.style.color='var(--red)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-3)'}>
                <X size={12} />
              </button>
            </span>
          ))}
          {!items.length && <span className="muted" style={{ fontSize:13 }}>No items yet.</span>}
        </div>
        <form onSubmit={add} style={{ display:'flex', gap:8, maxWidth:360 }}>
          <input className="input" value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder={`Add ${label.toLowerCase().replace(/s$/,'').replace(' items','')}…`} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={adding || !newVal.trim()} style={{ flexShrink:0 }}>
            {adding ? <span className="spin spin-white" style={{ width:14, height:14 }} /> : <Plus size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}

function InviteModal({ onClose, onSaved }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: null,   // suppress confirmation email
      }
    })
    if (error) { setError(error.message); setSaving(false); return }
    // If Supabase returns identities=[] the email already exists
    if (data?.user?.identities?.length === 0) {
      setError('An account with this email already exists.'); setSaving(false); return
    }
    if (!data?.user) { setError('User creation failed — check Supabase auth settings.'); setSaving(false); return }
    // Allow trigger to fire then update role + name
    await new Promise(r => setTimeout(r, 1000))
    const { error: profileErr } = await supabase.from('profiles')
      .update({ role, full_name: fullName.trim() })
      .eq('id', data.user.id)
    if (profileErr) console.error('Profile update error:', profileErr)
    onSaved()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd"><h2 className="modal-title">Create New User</h2><button className="btn btn-ghost btn-sm" onClick={onClose}><X size={15} /></button></div>
        <form onSubmit={handleSave}>
          <div className="modal-bd" style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div className="field"><label className="lbl">Full Name *</label><input className="input" type="text" value={fullName} onChange={e=>setFullName(e.target.value)} required autoFocus placeholder="e.g. Steve Mason" /></div>
            <div className="field"><label className="lbl">Email *</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
            <div className="field"><label className="lbl">Password *</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="min. 6 characters" /></div>
            <div className="field"><label className="lbl">Role</label>
              <select className="sel" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="viewer">Viewer — read only, can upload files</option>
                <option value="editor">Editor — can edit shows &amp; systems, no Settings access</option>
                <option value="admin">Admin — full access including Settings</option>
              </select>
            </div>
            {error && <p style={{ color:'var(--red)', fontSize:13 }}>{error}</p>}
            <div className="info-box">The user will be able to log in immediately with these credentials. Share them securely.</div>
          </div>
          <div className="modal-ft">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spin spin-white" /> : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, role, suspended, created_at').order('created_at')
    setUsers(data || []); setLoading(false)
  }

  async function toggleRole(user) {
    const cycle = { viewer: 'editor', editor: 'admin', admin: 'viewer' }
    const newRole = cycle[user.role] || 'viewer'
    if (!confirm(`Change ${user.full_name || user.id}'s role to "${newRole}"?`)) return
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    if (error) { alert(`Failed to update role: ${error.message}`); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
  }

  async function toggleSuspend(user) {
    const suspend = !user.suspended
    if (!confirm(`${suspend ? 'Suspend' : 'Reactivate'} this user?`)) return
    const { error } = await supabase.from('profiles').update({ suspended: suspend }).eq('id', user.id)
    if (error) { alert(`Failed to update: ${error.message}`); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: suspend } : u))
  }

  async function deleteUser(user) {
    if (!confirm(`Permanently delete user "${user.full_name || user.id}"? This cannot be undone.`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', user.id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    setUsers(prev => prev.filter(u => u.id !== user.id))
  }

  return (
    <div className="card">
      <div className="card-hd">
        <div><div className="card-title">Users & Roles</div><div className="muted" style={{ fontSize:12, marginTop:2 }}>Manage user access levels and accounts</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}><UserPlus size={13} /> Create User</button>
      </div>
      <div className="card-bd" style={{ padding:'12px 20px' }}>
        {loading ? <span className="spin" /> : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Name / Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.suspended ? 0.5 : 1 }}>
                  <td>{u.full_name || <span className="muted">(no name)</span>}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'b-purple' : u.role === 'editor' ? 'b-blue' : 'b-grey'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.suspended ? 'b-red' : 'b-green'}`}>{u.suspended ? 'Suspended' : 'Active'}</span></td>
                  <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row gap-2">
                      <button className="btn btn-secondary btn-xs" onClick={() => toggleRole(u)}>Make {u.role === 'admin' ? 'Viewer' : u.role === 'editor' ? 'Admin' : 'Editor'}</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => toggleSuspend(u)} title={u.suspended ? 'Reactivate' : 'Suspend'}>
                        {u.suspended ? <RotateCcw size={12} /> : <Ban size={12} />}
                      </button>
                      <button className="btn btn-ghost btn-xs danger" onClick={() => deleteUser(u)} title="Delete user"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <p className="muted" style={{ fontSize:12, marginTop:12, lineHeight:1.6 }}>
          Suspended users retain their data but cannot log in. Deleted users are permanently removed.
        </p>
      </div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSaved={() => { setShowInvite(false); fetchUsers() }} />}
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('dropdowns')

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Settings</h1><p className="page-sub">Manage dropdown options and user access</p></div>
      </div>
      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${tab === 'dropdowns' ? 'active' : ''}`} onClick={() => setTab('dropdowns')}>Dropdown Options</button>
          <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users & Roles</button>
        </div>
        {tab === 'dropdowns' && DROPDOWN_SECTIONS.map(s => <DropSection key={s.key} category={s.key} label={s.label} desc={s.desc} />)}
        {tab === 'users' && <UsersSection />}
      </div>
    </>
  )
}
