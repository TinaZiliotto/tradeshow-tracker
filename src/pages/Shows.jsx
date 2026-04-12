import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowRight, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ShowModal from '../components/ShowModal'

function statusBadge(status) {
  const map = { Confirmed: 'badge-blue', TBA: 'badge-amber', Cancelled: 'badge-red', Completed: 'badge-green' }
  return <span className={`badge ${map[status] || 'badge-grey'}`}>{status || 'Unknown'}</span>
}

export default function Shows() {
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { fetchShows() }, [])

  async function fetchShows() {
    const { data } = await supabase.from('tradeshows').select('*').order('dates_start', { ascending: true, nullsFirst: false })
    setShows(data || [])
    setLoading(false)
  }

  const years = [...new Set(shows.map(s => s.year))].sort((a, b) => b - a)

  const filtered = shows.filter(s => {
    const matchSearch = !search || s.show_name?.toLowerCase().includes(search.toLowerCase()) || s.show_contact?.toLowerCase().includes(search.toLowerCase())
    const matchYear = yearFilter === 'all' || s.year === parseInt(yearFilter)
    return matchSearch && matchYear
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shows</h1>
          <p className="page-subtitle">{shows.length} tradeshow{shows.length !== 1 ? 's' : ''} total</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add Show
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex gap-3 mb-4" style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: '32px' }} placeholder="Search shows..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: '140px' }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><span className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty"><div className="empty-icon"><Calendar size={32} /></div><p>No shows found</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Show Name</th>
                    <th>Dates</th>
                    <th>Move In</th>
                    <th>Booth</th>
                    <th>Sales Order</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(show => (
                    <tr key={show.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/shows/${show.id}`)}>
                      <td><strong>{show.show_name}</strong></td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {show.dates_start
                          ? `${new Date(show.dates_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${show.dates_end ? new Date(show.dates_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '?'}`
                          : 'TBA'}
                      </td>
                      <td className="text-muted">{show.move_in ? show.move_in.substring(0, 40) : '—'}</td>
                      <td className="text-muted">{show.booth_number || '—'}</td>
                      <td className="text-muted">{show.sales_order || '—'}</td>
                      <td className="text-muted">{show.show_contact || '—'}</td>
                      <td>{statusBadge(show.status)}</td>
                      <td><ArrowRight size={14} style={{ color: 'var(--text-3)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ShowModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchShows() }} />
      )}
    </>
  )
}
