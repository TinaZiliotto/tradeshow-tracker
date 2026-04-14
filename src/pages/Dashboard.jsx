import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Package, Truck, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB = { Confirmed:'b-blue', TBA:'b-amber', Cancelled:'b-red', Completed:'b-green', 'In Progress':'b-purple', Finished:'b-grey' }
function SBadge({ s }) { return <span className={`badge ${SB[s] || 'b-grey'}`}>{s || '—'}</span> }

export default function Dashboard() {
  const [shows, setShows] = useState([])
  const [systems, setSystems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      supabase.from('tradeshows').select('*').order('dates_start', { ascending: true }),
      supabase.from('systems').select('id, location'),
    ]).then(([{ data: s }, { data: sys }]) => {
      setShows(s || [])
      setSystems(sys || [])
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const upcoming = shows.filter(s => s.dates_start && new Date(s.dates_start + 'T00:00:00') >= now)
  const tba      = shows.filter(s => !s.dates_start)
  const atShow   = systems.filter(s => s.location === 'At the Show').length

  const stats = [
    { label: 'Total Shows',    value: shows.length,    icon: Calendar, color: 'var(--purple)' },
    { label: 'Upcoming',       value: upcoming.length, icon: Truck,    color: 'var(--green)'  },
    { label: 'Systems at Show',value: atShow,          icon: Package,  color: 'var(--accent)' },
    { label: 'TBA',            value: tba.length,      icon: Calendar, color: 'var(--amber)'  },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of all tradeshow activity</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card card-bd" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={19} style={{ color }} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{loading ? '—' : value}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-hd">
            <h2 className="card-title">Upcoming Shows</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shows')}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-bd" style={{ padding: '12px 20px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spin" /></div>
            ) : upcoming.length === 0 ? (
              <div className="empty"><div className="empty-icon">📅</div><p>No upcoming shows</p></div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr><th>Show</th><th>Dates</th><th>Booth</th><th>Contact</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {upcoming.slice(0, 8).map(show => (
                      <tr key={show.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shows/${show.id}`)}>
                        <td><strong>{show.show_name}</strong></td>
                        <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                          {new Date(show.dates_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {show.dates_end ? ` – ${new Date(show.dates_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        </td>
                        <td className="muted">{show.booth_number || '—'}</td>
                        <td className="muted">{show.show_contact || '—'}</td>
                        <td><SBadge s={show.status} /></td>
                        <td><ArrowRight size={13} className="muted" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
