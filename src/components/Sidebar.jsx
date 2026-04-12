import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, Package, Settings, LogOut, ChevronRight, ChevronLeft, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shows',    icon: Calendar,        label: 'Shows' },
  { to: '/equipment',icon: Package,         label: 'Equipment' },
]
const adminItems = [
  { to: '/audit',    icon: ClipboardList,   label: 'Audit Log' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''}`}>
      {expanded
        ? <div className="sidebar-logo">Fortress<span>.</span>Shows</div>
        : <div className="sidebar-logo-icon">🏭</div>
      }

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={!expanded ? label : undefined}
        >
          <Icon className="nav-icon" size={18} />
          {expanded && <span>{label}</span>}
        </NavLink>
      ))}

      {isAdmin && adminItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={!expanded ? label : undefined}
        >
          <Icon className="nav-icon" size={18} />
          {expanded && <span>{label}</span>}
        </NavLink>
      ))}

      <div className="sidebar-spacer" />

      <button className="sidebar-toggle" onClick={handleLogout} title="Log out">
        <LogOut size={18} />
        {expanded && <span>Log out</span>}
      </button>

      <button className="sidebar-toggle" onClick={() => setExpanded(e => !e)} title="Toggle sidebar">
        {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        {expanded && <span>Collapse</span>}
      </button>
    </aside>
  )
}
