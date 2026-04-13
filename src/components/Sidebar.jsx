import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, Package, Settings, LogOut, ChevronRight, ChevronLeft, ClipboardList, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/shows',     icon: Calendar,        label: 'Shows' },
  { to: '/equipment', icon: Package,         label: 'Systems' },
]
const adminItems = [
  { to: '/admin',     icon: ShieldCheck,     label: 'Admin' },
  { to: '/audit',     icon: ClipboardList,   label: 'Audit Log' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
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
      <div className="sidebar-logo-wrap">
        {expanded
          ? <img src="/fortress_logo.png" alt="Fortress Technology" className="sidebar-logo-img" />
          : <span className="sidebar-logo-icon">🏭</span>
        }
      </div>

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={!expanded ? label : undefined}
        >
          <Icon className="nav-icon" size={17} />
          {expanded && <span>{label}</span>}
        </NavLink>
      ))}

      {isAdmin && adminItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={!expanded ? label : undefined}
        >
          <Icon className="nav-icon" size={17} />
          {expanded && <span>{label}</span>}
        </NavLink>
      ))}

      <div className="sidebar-spacer" />

      <button className="sidebar-toggle" onClick={handleLogout} title="Log out">
        <LogOut size={16} />
        {expanded && <span>Log out</span>}
      </button>

      <button className="sidebar-toggle" onClick={() => setExpanded(e => !e)} title="Toggle sidebar">
        {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        {expanded && <span>Collapse</span>}
      </button>
    </aside>
  )
}
