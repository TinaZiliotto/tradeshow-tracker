import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { supabase, logAudit } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ShowModal from '../components/ShowModal'
import EquipmentTab from '../components/tabs/EquipmentTab'
import CratesTab from '../components/tabs/CratesTab'
import ShippingTab from '../components/tabs/ShippingTab'
import SuppliesTab from '../components/tabs/SuppliesTab'
import FilesTab from '../components/tabs/FilesTab'

const TABS = ['Equipment', 'Crates', 'Shipping', 'Supplies', 'Files']

function statusBadge(status) {
  const map = { Confirmed: 'badge-blue', TBA: 'badge-amber', Cancelled: 'badge-red', Completed: 'badge-green' }
  return <span className={`badge ${map[status] || 'badge-grey'}`}>{status || 'Unknown'}</span>
}

function InfoPair({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="label" style={{ marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', whiteSpace: 'pre-line' }}>{value}</div>
    </div>
  )
}

export default function ShowDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Equipment')
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchShow() }, [id])

  async function fetchShow() {
    const { data } = await supabase.from('tradeshows').select('*').eq('id', id).single()
    setShow(data)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${show.show_name}"? This will remove all associated data.`)) return
    setDeleting(true)
    await supabase.from('tradeshows').delete().eq('id', id)
    await logAudit({ action: 'delete', entityType: 'tradeshow', entityId: id, entityLabel: show.show_name })
    navigate('/shows')
  }

  if (loading) return <div className="loading-screen"><span className="spinner" /></div>
  if (!show) return <div className="page-body"><p>Show not found.</p></div>

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shows')}>
            <ArrowLeft size={14} /> Shows
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title">{show.show_name}</h1>
              {statusBadge(show.status)}
            </div>
            <p className="page-subtitle">
              {show.dates_start
                ? `${new Date(show.dates_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${show.dates_end ? new Date(show.dates_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '?'}`
                : 'Dates TBA'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Edit size={14} /> Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>

      <div className="page-body">
        {/* Show info card */}
        <div className="card card-body mb-4" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
            <InfoPair label="Booth Number" value={show.booth_number} />
            <InfoPair label="Sales Order" value={show.sales_order} />
            <InfoPair label="Show Contact" value={show.show_contact} />
            <InfoPair label="Move In" value={show.move_in} />
            <InfoPair label="Move Out" value={show.move_out} />
            {show.notes && <InfoPair label="Notes" value={show.notes} />}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Equipment' && <EquipmentTab showId={id} isAdmin={isAdmin} />}
        {activeTab === 'Crates'    && <CratesTab    showId={id} isAdmin={isAdmin} />}
        {activeTab === 'Shipping'  && <ShippingTab  showId={id} isAdmin={isAdmin} />}
        {activeTab === 'Supplies'  && <SuppliesTab  showId={id} isAdmin={isAdmin} />}
        {activeTab === 'Files'     && <FilesTab     showId={id} showName={show.show_name} />}
      </div>

      {editing && (
        <ShowModal show={show} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); fetchShow() }} />
      )}
    </>
  )
}
