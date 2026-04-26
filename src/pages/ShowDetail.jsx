import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { useRefreshTick } from '../context/RefreshContext'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ShowModal from '../components/ShowModal'
import EquipmentTab  from '../components/tabs/EquipmentTab'
import ShippingTab   from '../components/tabs/ShippingTab'
import SuppliesTab   from '../components/tabs/SuppliesTab'
import BrochuresTab  from '../components/tabs/BrochuresTab'
import FilesTab      from '../components/tabs/FilesTab'
import PortalTab     from '../components/tabs/PortalTab'
import ChecklistTab  from '../components/tabs/ChecklistTab'
import NotesTab      from '../components/tabs/NotesTab'

const TABS = ['Systems', 'Shipping', 'Supplies', 'Brochures', 'Files', 'Portal', 'Checklist', 'Notes']
const SB = { Confirmed:'b-blue', TBA:'b-amber', Cancelled:'b-red', Completed:'b-green', 'In Progress':'b-purple', Finished:'b-grey' }

function SBadge({ s }) { return <span className={`badge ${SB[s] || 'b-grey'}`}>{s || '—'}</span> }
function Pair({ label, value }) {
  if (!value) return null
  return <div><div className="lbl" style={{ marginBottom: 2 }}>{label}</div><div style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{value}</div></div>
}

export default function ShowDetail() {
  const tick = useRefreshTick()
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isEditor } = useAuth()
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Systems')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchShow() }, [id, tick])

  async function fetchShow() {
    const { data } = await supabase.from('tradeshows').select('*').eq('id', id).single()
    setShow(data); setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${show.show_name}"? All associated data will be removed.`)) return
    setDeleting(true)
    await supabase.from('tradeshows').delete().eq('id', id)
    await logAudit({ action: 'delete', entityType: 'tradeshow', entityId: id, entityLabel: show.show_name })
    navigate('/shows')
  }

  if (loading) return <div className="load-screen"><span className="spin" /></div>
  if (!show) return <div className="page-body"><p>Show not found.</p></div>

  return (
    <>
      <div className="page-head">
        <div className="row gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shows')}><ArrowLeft size={14} /> Shows</button>
          <div>
            <div className="row gap-2">
              <h1 className="page-title">{show.show_name}</h1>
              <SBadge s={show.status} />
            </div>
            <p className="page-sub">
              {show.dates_start
                ? `${new Date(show.dates_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${show.dates_end ? new Date(show.dates_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '?'}`
                : 'Dates TBA'}
            </p>
          </div>
        </div>
        {isEditor && (
          <div className="row gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Edit size={13} /> Edit</button>
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}><Trash2 size={13} /> Delete</button>}
          </div>
        )}
      </div>

      <div className="page-body">
        <div className="card card-bd" style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 18 }}>
            <Pair label="Booth Number"  value={show.booth_number} />
            <Pair label="Sales Order"   value={show.sales_order} />
            <Pair label="Show Contact"  value={show.show_contact} />
            <Pair label="Move In"       value={show.move_in} />
            <Pair label="Move Out"      value={show.move_out} />
            <Pair label="Booth Size"     value={show.booth_size} />
            <Pair label="Location"       value={show.location_city} />
            <Pair label="FTI Booth Type" value={show.fti_booth_type} />
            {show.notes && <Pair label="Notes" value={show.notes} />}
          </div>
        </div>

        <div className="tabs">
          {TABS.map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>

        {tab === 'Systems'   && <EquipmentTab  showId={id} isAdmin={isAdmin} isEditor={isEditor} />}
        {tab === 'Shipping'  && <ShippingTab   showId={id} isAdmin={isAdmin} isEditor={isEditor} />}
        {tab === 'Supplies'  && <SuppliesTab   showId={id} isAdmin={isAdmin} isEditor={isEditor} />}
        {tab === 'Brochures' && <BrochuresTab  showId={id} isAdmin={isAdmin} isEditor={isEditor} />}
        {tab === 'Files'     && <FilesTab      showId={id} showName={show.show_name} />}
        {tab === 'Portal'    && <PortalTab     showId={id} isAdmin={isAdmin} isEditor={isEditor} />}
        {tab === 'Checklist' && <ChecklistTab  showId={id} isAdmin={isAdmin} isEditor={isEditor} />}
        {tab === 'Notes'     && <NotesTab      showId={id} isEditor={isEditor} />}
      </div>

      {editing && <ShowModal show={show} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); fetchShow() }} />}
    </>
  )
}
