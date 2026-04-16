import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ShowModal from '../components/ShowModal'

const STATUS_BADGE = { Confirmed:'b-blue', TBA:'b-amber', Cancelled:'b-red', Completed:'b-green', 'In Progress':'b-purple', Finished:'b-grey' }
function SBadge({ status }) { return <span className={`badge ${STATUS_BADGE[status] || 'b-grey'}`}>{status || '—'}</span> }

function SortIcon({ col, sortCol, dir }) {
  if (sortCol !== col) return <ArrowUp size={11} style={{ opacity: 0.25, marginLeft: 3 }} />
  return dir === 'asc' ? <ArrowUp size={11} style={{ color: 'var(--purple)', marginLeft: 3 }} /> : <ArrowDown size={11} style={{ color: 'var(--purple)', marginLeft: 3 }} />
}

export default function Shows() {
  const tick = useRefreshTick()
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [sortCol, setSortCol] = useState('dates_start')
  const [sortDir, setSortDir] = useState('asc')
  const [showModal, setShowModal] = useState(false)
  const { isAdmin, isEditor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(location.search)
    return params.get('filter') === 'upcoming' ? 'upcoming' : 'all'
  })

  useEffect(() => { fetchShows() }, [tick])

  async function fetchShows() {
    const { data } = await supabase.from('tradeshows').select('*')
    setShows(data || [])
    setLoading(false)
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const years = [...new Set(shows.map(s => s.year))].sort((a, b) => b - a)

  const filtered = shows
    .filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q || s.show_name?.toLowerCase().includes(q) || s.show_contact?.toLowerCase().includes(q)
      const matchYear = yearFilter === 'all' || s.year === parseInt(yearFilter)
      const matchStatus = statusFilter === 'all' || (statusFilter === 'upcoming' && s.status !== 'Finished')
      return matchSearch && matchYear && matchStatus
    })
    .sort((a, b) => {
      let va, vb
      if (sortCol === 'show_name') { va = a.show_name || ''; vb = b.show_name || '' }
      else { va = a.dates_start || ''; vb = b.dates_start || '' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Shows</h1>
          <p className="page-sub">{shows.length} tradeshow{shows.length !== 1 ? 's' : ''} total</p>
        </div>
        {isEditor && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> Add Show</button>}
      </div>

      <div className="page-body">
        <div className="row gap-3" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} className="search-icon" />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search shows…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="row gap-2">
            {[['all','All Shows'],['upcoming','Upcoming']].map(([val, lbl]) => (
              <button key={val} className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(val)}>{lbl}</button>
            ))}
          </div>
          <select className="sel" style={{ width: 140 }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">📅</div><p>No shows found</p></div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => toggleSort('show_name')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        Show Name <SortIcon col="show_name" sortCol={sortCol} dir={sortDir} />
                      </span>
                    </th>
                    <th className="sortable" onClick={() => toggleSort('dates_start')}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        Dates <SortIcon col="dates_start" sortCol={sortCol} dir={sortDir} />
                      </span>
                    </th>
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
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                        {show.dates_start
                          ? `${new Date(show.dates_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${show.dates_end ? new Date(show.dates_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '?'}`
                          : 'TBA'}
                      </td>
                      <td className="muted">{show.booth_number || '—'}</td>
                      <td className="muted">{show.sales_order || '—'}</td>
                      <td className="muted">{show.show_contact || '—'}</td>
                      <td><SBadge status={show.status} /></td>
                      <td><ArrowRight size={14} className="muted" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && <ShowModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchShows() }} />}
    </>
  )
}
