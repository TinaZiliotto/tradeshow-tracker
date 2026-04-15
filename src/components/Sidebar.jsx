import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Calendar, Package, Settings, LogOut, ChevronRight, ChevronLeft, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shows',    icon: Calendar,        label: 'Shows' },
  { to: '/systems',  icon: Package,         label: 'Systems' },
]
const ADMIN_NAV = [
  { to: '/audit',    icon: ClipboardList,   label: 'Audit Log' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sb-logo">
        <img
          src="/logo_full.png"
          alt="Fortress Technology"
          style={{ height: open ? 40 : 28, width: 'auto', maxWidth: open ? 160 : 36, objectFit: 'contain', transition: 'all 180ms ease' }}
        />
      </div>
      <nav className="sb-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `sb-item ${isActive ? 'active' : ''}`}
            title={!open ? label : undefined}
          >
            <Icon size={17} />
            {open && <span className="sb-label">{label}</span>}
          </NavLink>
        ))}
        {/* Audit log and Settings only visible to admins */}
        {isAdmin && ADMIN_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sb-item ${isActive ? 'active' : ''}`}
            title={!open ? label : undefined}
          >
            <Icon size={17} />
            {open && <span className="sb-label">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sb-footer">
        <button className="sb-toggle" onClick={logout} title="Log out"><LogOut size={16} />{open && <span>Log out</span>}</button>
        <button className="sb-toggle" onClick={() => setOpen(o => !o)} title={open ? 'Collapse' : 'Expand'}>
          {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {open && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
