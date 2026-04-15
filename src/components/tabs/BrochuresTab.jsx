import { useEffect, useState } from 'react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase } from '../../lib/supabase'

export default function BrochuresTab({ showId, isAdmin, isEditor }) {
  const tick = useRefreshTick()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [showId])

  async function init() {
    // Load master list
    const { data: opts } = await supabase.from('dropdown_options').select('value').eq('category', 'brochure_item').order('sort_order')
    const master = opts?.map(o => o.value) || []

    // Load saved quantities
    const { data: saved } = await supabase.from('show_brochures').select('*').eq('tradeshow_id', showId)
    setRows(master.map(item => {
      const found = saved?.find(r => r.brochure_name === item)
      return { name: item, quantity: found?.quantity || '', db_id: found?.id || null }
    }))
    setLoading(false)
  }

  function setQty(name, qty) {
    setRows(prev => prev.map(r => r.name === name ? { ...r, quantity: qty } : r))
  }

  async function handleSave() {
    setSaving(true)
    for (const row of rows) {
      if (row.db_id) {
        await supabase.from('show_brochures').update({ quantity: row.quantity }).eq('id', row.db_id)
      } else if (row.quantity) {
        await supabase.from('show_brochures').insert({ tradeshow_id: showId, brochure_name: row.name, quantity: row.quantity })
      }
    }
    setSaving(false)
    init()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div>
      <div className="card">
        <div className="card-hd"><h3 className="card-title">Brochure Quantities</h3></div>
        <div className="card-bd">
          {rows.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No brochures configured. Add them in Settings.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {rows.map(row => (
                <div key={row.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'7px 10px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)' }}>
                  <span style={{ fontSize: 13 }}>{row.name}</span>
                  <input
                    className="input"
                    style={{ width: 80, textAlign: 'center' }}
                    placeholder="qty"
                    value={row.quantity}
                    onChange={e => setQty(row.name, e.target.value)}
                    readOnly={!isAdmin}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {isAdmin && (
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spin spin-white" /> : 'Save Quantities'}
          </button>
        </div>
      )}
    </div>
  )
}
