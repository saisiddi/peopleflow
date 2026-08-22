import { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'

  const link = ({ isActive }: any) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition ${
      isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 grid place-items-center text-white font-bold">D</div>
            <span className="font-semibold text-slate-800">Dayflow</span>
          </Link>
          <nav className="flex items-center gap-1">
            {isAdmin && <NavLink to="/admin" className={link} end>Overview</NavLink>}
            <NavLink to="/attendance" className={link}>Attendance</NavLink>
            <NavLink to="/leave" className={link}>Leave</NavLink>
            <NavLink to="/payroll" className={link}>Payroll</NavLink>
            <NavLink to="/profile" className={link}>Profile</NavLink>
            <button
              onClick={async () => { await signOut(); nav('/') }}
              className="ml-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
