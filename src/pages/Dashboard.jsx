import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Package, Truck, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

function statusBadge(status) {
  const map = { Confirmed: 'badge-blue', TBA: 'badge-amber', Cancelled: 'badge-red', Completed: 'badge-green' }
  return <span className={`badge ${map[status] || 'badge-grey'}`}>{status || 'Unknown'}</span>
}

export default function Dashboard() {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('tradeshows')
      .select('*')
      .order('dates_start', { ascending: true })
      .then(({ data }) => { setShows(data || []); setLoading(false) })
  }, [])

  const now = new Date()
  const upcoming = shows.filter(s => s.dates_start && new Date(s.dates_start) >= now)
  const past = shows.filter(s => s.dates_start && new Date(s.dates_start) < now)
  const tba = shows.filter(s => !s.dates_start)

  const stats = [
    { label: 'Total Shows', value: shows.length, icon: Calendar, color: 'var(--accent)' },
    { label: 'Upcoming', value: upcoming.length, icon: Truck, color: 'var(--green)' },
    { label: 'TBA / Pending', value: tba.length, icon: Package, color: 'var(--amber)' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of all tradeshow activity</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, lineHeight: 1 }}>{loading ? '—' : value}</div>
                <div className="text-muted text-sm" style={{ marginTop: '3px' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming shows */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Shows</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shows')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '16px 24px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><span className="spinner" /></div>
            ) : upcoming.length === 0 ? (
              <div className="empty"><div className="empty-icon">📅</div><p>No upcoming shows</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Show</th>
                      <th>Dates</th>
                      <th>Booth</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.slice(0, 8).map(show => (
                      <tr key={show.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shows/${show.id}`)}>
                        <td><strong>{show.show_name}</strong></td>
                        <td className="text-muted">
                          {show.dates_start ? new Date(show.dates_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          {show.dates_end && show.dates_end !== show.dates_start
                            ? ` – ${new Date(show.dates_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : show.dates_start ? `, ${new Date(show.dates_start).getFullYear()}` : ''}
                        </td>
                        <td className="text-muted">{show.booth_number || '—'}</td>
                        <td className="text-muted">{show.show_contact || '—'}</td>
                        <td>{statusBadge(show.status)}</td>
                        <td><ArrowRight size={14} style={{ color: 'var(--text-3)' }} /></td>
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
