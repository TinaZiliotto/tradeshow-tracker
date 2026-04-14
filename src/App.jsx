import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Shows from './pages/Shows'
import ShowDetail from './pages/ShowDetail'
import Systems from './pages/Systems'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'

function AdminOnly({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/" replace />
}

function Layout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="load-screen"><span className="spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/shows"      element={<Shows />} />
          <Route path="/shows/:id"  element={<ShowDetail />} />
          <Route path="/systems"    element={<Systems />} />
          <Route path="/audit"      element={<AdminOnly><AuditLog /></AdminOnly>} />
          <Route path="/settings"   element={<AdminOnly><Settings /></AdminOnly>} />
        </Routes>
      </main>
    </div>
  )
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="load-screen"><span className="spin" /></div>
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/*"     element={<Layout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
