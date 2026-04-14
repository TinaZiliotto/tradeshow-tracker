import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function EquipmentTab({ showId }) {
  const [systems, setSystems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('show_systems')
      .select('system_id, systems(*)')
      .eq('tradeshow_id', showId)
      .then(({ data }) => {
        setSystems(data?.map(r => r.systems).filter(Boolean) || [])
        setLoading(false)
      })
  }, [showId])

  const locationBadge = loc => {
    const cls = loc === 'At the Show' ? 'b-green' : loc === 'Regal' ? 'b-blue' : 'b-grey'
    return <span className={`badge ${cls}`}>{loc || '—'}</span>
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div className="card">
      {systems.length === 0 ? (
        <div className="empty"><div className="empty-icon"><Package size={26} /></div><p>No systems assigned to this show</p></div>
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Serial Number</th>
                <th>Part Number</th>
                <th>Crate</th>
                <th>Dimensions</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {systems.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.equipment_name}</strong>{s.notes && <div className="muted" style={{ fontSize:11, marginTop:2 }}>{s.notes}</div>}</td>
                  <td className="mono">{s.serial_number}</td>
                  <td className="mono muted">{s.part_number || '—'}</td>
                  <td className="muted">{s.crate_number || '—'}</td>
                  <td className="muted">{s.dimensions || '—'}</td>
                  <td>{locationBadge(s.location)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
