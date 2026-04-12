import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { key: 'equipment_name', label: 'Equipment Names' },
  { key: 'carrier',        label: 'Carriers' },
  { key: 'contact',        label: 'Show Contacts' },
  { key: 'show_status',    label: 'Show Statuses' },
  { key: 'supply_category',label: 'Supply Categories' },
]

function DropdownSection({ category, label }) {
  const [items, setItems] = useState([])
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetch() }, [category])

  async function fetch() {
    const { data } = await supabase.from('dropdown_options').select('*').eq('category', category).order('sort_order').order('value')
    setItems(data || [])
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newValue.trim()) return
    setAdding(true)
    await supabase.from('dropdown_options').insert({ category, value: newValue.trim(), sort_order: items.length + 1 })
    setNewValue('')
    setAdding(false)
    fetch()
  }

  async function handleDelete(id, value) {
    if (!confirm(`Remove "${value}" from ${label}?`)) return
    await supabase.from('dropdown_options').delete().eq('id', id)
    fetch()
  }

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div className="card-header"><h3 className="card-title">{label}</h3></div>
      <div className="card-body">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '4px 10px 4px 12px', fontSize: '13px'
            }}>
              {item.value}
              <button onClick={() => handleDelete(item.id, item.value)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                display: 'flex', alignItems: 'center', padding: '1px'
              }}>
                <X size={12} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-muted text-sm">No items yet.</p>}
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', maxWidth: '360px' }}>
          <input className="input" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={`Add new ${label.toLowerCase().replace(/s$/, '')}...`} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={adding || !newValue.trim()}>
            {adding ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role, created_at').order('created_at')
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  async function toggleRole(user) {
    const newRole = user.role === 'admin' ? 'viewer' : 'admin'
    if (!confirm(`Change ${user.full_name || user.id}'s role to "${newRole}"?`)) return
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    setUsers(us => us.map(u => u.id === user.id ? { ...u, role: newRole } : u))
  }

  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">User Roles</h3></div>
      <div className="card-body" style={{ padding: '12px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><span className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.full_name || '(no name)'}</td>
                    <td className="text-muted" style={{ fontSize: '11px', fontFamily: 'monospace' }}>{user.id.substring(0, 16)}...</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-blue' : 'badge-grey'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleRole(user)}>
                        Make {user.role === 'admin' ? 'Viewer' : 'Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-muted text-sm" style={{ marginTop: '12px' }}>
          New users are created directly in the Supabase Authentication dashboard. Their role defaults to Viewer.
        </p>
      </div>
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('dropdowns')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage dropdown options and user access</p>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${tab === 'dropdowns' ? 'active' : ''}`} onClick={() => setTab('dropdowns')}>Dropdown Options</button>
          <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users & Roles</button>
        </div>

        {tab === 'dropdowns' && CATEGORIES.map(c => (
          <DropdownSection key={c.key} category={c.key} label={c.label} />
        ))}

        {tab === 'users' && <UsersSection />}
      </div>
    </>
  )
}
