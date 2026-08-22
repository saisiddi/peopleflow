import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './lib/store'
import Auth from './pages/Auth'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDetail from './pages/EmployeeDetail'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import ProfilePage from './pages/ProfilePage'
import Payroll from './pages/Payroll'
import Layout from './components/Layout'

function Protected({ children, adminOnly = false }: any) {
  const { profile, loading } = useAuth()
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center text-slate-400">
        Loading…
      </div>
    )
  if (!profile) return <Navigate to="/" replace />
  if (adminOnly && profile.role !== 'admin')
    return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const { profile } = useAuth()
  return (
    <Routes>
      <Route
        path="/"
        element={profile ? <Navigate to="/dashboard" replace /> : <Auth />}
      />
      <Route path="/dashboard" element={<Protected><Layout><EmployeeDashboard /></Layout></Protected>} />
      <Route path="/admin" element={<Protected adminOnly><Layout><AdminDashboard /></Layout></Protected>} />
      <Route path="/admin/employee/:id" element={<Protected adminOnly><Layout><EmployeeDetail /></Layout></Protected>} />
      <Route path="/attendance" element={<Protected><Layout><Attendance /></Layout></Protected>} />
      <Route path="/leave" element={<Protected><Layout><Leave /></Layout></Protected>} />
      <Route path="/profile" element={<Protected><Layout><ProfilePage /></Layout></Protected>} />
      <Route path="/payroll" element={<Protected><Layout><Payroll /></Layout></Protected>} />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
