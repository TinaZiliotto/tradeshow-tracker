import { useEffect, useState } from 'react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase } from '../../lib/supabase'

const SUPPLY_SECTIONS = [
  { key: 'merchandise_item', label: 'Merchandise',          editable: true  },
  { key: 'cleaning_item',    label: 'Cleaning Supplies',    editable: false },
  { key: 'office_item',      label: 'Office Supplies',      editable: false },
  { key: 'electrical_item',  label: 'Electrical Supplies',  editable: false },
  { key: 'misc_item',        label: 'Miscellaneous',        editable: false },
]

export default function SuppliesTab({ showId, isAdmin, isEditor }) {
  const tick = useRefreshTick()
  const [data, setData] = useState({})   // { category: [{item, quantity, id?}] }
  const [masterLists, setMasterLists] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [showId])

  async function init() {
    // Load master lists from dropdown_options
    const ml = {}
    for (const s of SUPPLY_SECTIONS) {
      const { data: opts } = await supabase.from('dropdown_options').select('value').eq('category', s.key).order('sort_order')
      ml[s.key] = opts?.map(o => o.value) || []
    }
    setMasterLists(ml)

    // Load saved quantities for this show
    const { data: saved } = await supabase.from('show_supplies').select('*').eq('tradeshow_id', showId)
    const byKey = {}
    for (const s of SUPPLY_SECTIONS) {
      const savedRows = saved?.filter(r => r.category === s.key) || []
      byKey[s.key] = ml[s.key].map(item => {
        const found = savedRows.find(r => r.item === item)
        return { item, quantity: found?.quantity || '', db_id: found?.id || null }
      })
    }
    setData(byKey)
    setLoading(false)
  }

  function setQty(category, item, qty) {
    setData(prev => ({
      ...prev,
      [category]: prev[category].map(r => r.item === item ? { ...r, quantity: qty } : r)
    }))
  }

  async function handleSave() {
    setSaving(true)
    for (const s of SUPPLY_SECTIONS) {
      const rows = data[s.key] || []
      for (const row of rows) {
        if (row.db_id) {
          await supabase.from('show_supplies').update({ quantity: row.quantity }).eq('id', row.db_id)
        } else if (row.quantity) {
          await supabase.from('show_supplies').insert({ tradeshow_id: showId, category: s.key, item: row.item, quantity: row.quantity })
        }
      }
    }
    setSaving(false)
    init()
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:32 }}><span className="spin" /></div>

  return (
    <div>
      {SUPPLY_SECTIONS.map(({ key, label }) => (
        <div key={key} className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd"><h3 className="card-title">{label}</h3></div>
          <div className="card-bd" style={{ padding: '12px 20px' }}>
            {(data[key] || []).length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No items configured. Add them in Settings.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                {(data[key] || []).map(row => (
                  <div key={row.item} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'7px 10px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)' }}>
                    <span style={{ fontSize:13 }}>{row.item}</span>
                    <input
                      className="input"
                      style={{ width: 80, textAlign:'center' }}
                      placeholder="qty"
                      value={row.quantity}
                      onChange={e => setQty(key, row.item, e.target.value)}
                      readOnly={!isAdmin}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {isAdmin && (
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spin spin-white" /> : 'Save Quantities'}
        </button>
      )}
    </div>
  )
}
