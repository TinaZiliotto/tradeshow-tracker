import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Shows from './pages/Shows'
import ShowDetail from './pages/ShowDetail'
import Equipment from './pages/Equipment'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'
import Admin from './pages/Admin'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/shows"      element={<Shows />} />
          <Route path="/shows/:id"  element={<ShowDetail />} />
          <Route path="/equipment"  element={<Equipment />} />
          <Route path="/admin"      element={<AdminGuard />} />
          <Route path="/audit"      element={<AdminGuard page="audit" />} />
          <Route path="/settings"   element={<AdminGuard page="settings" />} />
        </Routes>
      </main>
    </div>
  )
}

function AdminGuard({ page }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  if (page === 'audit') return <AuditLog />
  if (page === 'settings') return <Settings />
  return <Admin />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span className="spinner" /></div>
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
