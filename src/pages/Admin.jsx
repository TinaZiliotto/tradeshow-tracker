import { useEffect, useState } from 'react'
import { Plus, X, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

// All dropdown categories that admins can manage live
const SECTIONS = [
  {
    key: 'equipment_name',
    label: 'System / Equipment Names',
    description: 'Names available when assigning systems to shows.',
  },
  {
    key: 'carrier',
    label: 'Shipping Carriers',
    description: 'Carrier options shown in the shipping tab.',
  },
  {
    key: 'contact',
    label: 'Show Contacts',
    description: 'People available as the show contact.',
  },
  {
    key: 'show_status',
    label: 'Show Statuses',
    description: 'Status options for each tradeshow entry.',
  },
  {
    key: 'supply_category',
    label: 'Supply Categories',
    description: 'Categories shown in the supplies tab.',
  },
  {
    key: 'merchandise_item',
    label: 'Merchandise Items',
    description: 'Items under Merchandise in the supplies tab.',
  },
  {
    key: 'cleaning_item',
    label: 'Cleaning Supplies Items',
    description: 'Items under Cleaning Supplies in the supplies tab.',
  },
  {
    key: 'office_item',
    label: 'Office Supplies Items',
    description: 'Items under Office Supplies in the supplies tab.',
  },
  {
    key: 'electrical_item',
    label: 'Electrical Supplies Items',
    description: 'Items under Electrical Supplies in the supplies tab.',
  },
  {
    key: 'misc_item',
    label: 'Miscellaneous Supplies Items',
    description: 'Items under Miscellaneous in the supplies tab.',
  },
  {
    key: 'system_location',
    label: 'System Locations',
    description: 'Possible current locations for a system (e.g. Regal, HO, Trade Show).',
  },
  {
    key: 'checklist_item',
    label: 'Checklist Items',
    description: 'Default checklist tasks added to every new show.',
  },
  {
    key: 'brochure_item',
    label: 'Brochure Names',
    description: 'Default brochures added to every new show.',
  },
]

function AdminSection({ category, label, description }) {
  const [items, setItems] = useState([])
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchItems() }, [category])

  async function fetchItems() {
    const { data } = await supabase.from('dropdown_options')
      .select('*').eq('category', category).order('sort_order').order('value')
    setItems(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newValue.trim()) return
    setAdding(true)
    await supabase.from('dropdown_options').insert({
      category,
      value: newValue.trim(),
      sort_order: items.length + 1,
    })
    setNewValue('')
    setAdding(false)
    fetchItems()
  }

  async function handleDelete(id, value) {
    if (!confirm(`Remove "${value}"?`)) return
    await supabase.from('dropdown_options').delete().eq('id', id)
    fetchItems()
  }

  return (
    <div className="card" style={{ marginBottom: '14px' }}>
      <div className="card-header">
        <div>
          <div className="card-title">{label}</div>
          <div className="text-muted text-sm" style={{ marginTop: '2px' }}>{description}</div>
        </div>
      </div>
      <div className="card-body">
        {loading ? (
          <span className="spinner" />
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: items.length ? '14px' : '0' }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: '20px', padding: '4px 10px 4px 12px', fontSize: '13px',
                }}>
                  <span>{item.value}</span>
                  <button onClick={() => handleDelete(item.id, item.value)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: '1px',
                    borderRadius: '50', transition: 'color 120ms',
                  }}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {items.length === 0 && <p className="text-muted text-sm">No items yet.</p>}
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', maxWidth: '380px' }}>
              <input
                className="input"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder={`Add new ${label.toLowerCase().replace(/s$/, '').replace(' items', ' item')}...`}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={adding || !newValue.trim()} style={{ flexShrink: 0 }}>
                {adding ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} /> : <Plus size={14} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function Admin() {
  const [search, setSearch] = useState('')
  const filtered = SECTIONS.filter(s =>
    !search || s.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--purple)' }} />
            <h1 className="page-title">Admin Panel</h1>
          </div>
          <p className="page-subtitle">Manage dropdown options and lists across the entire app in real time</p>
        </div>
        <input
          className="input"
          style={{ maxWidth: '240px' }}
          placeholder="Filter sections..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="page-body">
        {filtered.map(section => (
          <AdminSection
            key={section.key}
            category={section.key}
            label={section.label}
            description={section.description}
          />
        ))}
        {filtered.length === 0 && (
          <div className="empty"><div className="empty-icon">🔍</div><p>No sections match your search</p></div>
        )}
      </div>
    </>
  )
}
