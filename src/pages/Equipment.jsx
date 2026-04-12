import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Equipment() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('equipment')
      .select('*, tradeshow:tradeshow_id(id, show_name, dates_start, status)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [])

  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.equipment_name?.toLowerCase().includes(q) ||
      item.serial_numbers?.toLowerCase().includes(q) ||
      item.part_numbers?.toLowerCase().includes(q) ||
      item.tradeshow?.show_name?.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipment</h1>
          <p className="page-subtitle">All equipment across all shows</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ marginBottom: '16px', maxWidth: '360px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: '32px' }} placeholder="Search by name, serial, part number..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">📦</div><p>No equipment found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Serial Numbers</th>
                    <th>Part Numbers</th>
                    <th>Crate</th>
                    <th>Show</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shows/${item.tradeshow?.id}`)}>
                      <td><strong>{item.equipment_name}</strong></td>
                      <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.serial_numbers || '—'}</td>
                      <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '12px', maxWidth: '200px' }}>{item.part_numbers || '—'}</td>
                      <td className="text-muted">{item.crate_number || '—'}</td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{item.tradeshow?.show_name}</div>
                          <div className="text-muted text-sm">{item.tradeshow?.dates_start ? new Date(item.tradeshow.dates_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'TBA'}</div>
                        </div>
                      </td>
                      <td><ArrowRight size={14} style={{ color: 'var(--text-3)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
