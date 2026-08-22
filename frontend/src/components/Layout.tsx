import { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'
import NotificationBell from './NotificationBell'
import WaveLogo from './WaveLogo'

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'

  const link = ({ isActive }: any) =>
    `px-3 py-2 rounded-xl text-sm font-semibold transition ${
      isActive ? 'bg-[#0B2740] text-white' : 'text-[#0B2740]/70 hover:bg-[#EDF4F9]'
    }`

  return (
    <div className="min-h-screen bg-[#F4F9FC] font-body">
      <header className="bg-white/90 backdrop-blur border-b border-[#0B2740]/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 min-h-16 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2.5">
            <WaveLogo size={30} />
            <span className="font-display font-bold text-slate-900 tracking-tight">Dayflow</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {isAdmin && <NavLink to="/admin" className={link} end>Overview</NavLink>}
            {isAdmin && <NavLink to="/geofence" className={link}>Geofence</NavLink>}
            <NavLink to="/attendance" className={link}>Attendance</NavLink>
            <NavLink to="/leave" className={link}>Leave</NavLink>
            <NavLink to="/meetings" className={link}>Meetings</NavLink>
            <NavLink to="/reports" className={link}>Reports</NavLink>
            <NavLink to="/payroll" className={link}>Payroll</NavLink>
            <NavLink to="/profile" className={link}>Profile</NavLink>
            <NotificationBell />
            <button
              onClick={async () => { await signOut(); nav('/') }}
              className="ml-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#0B2740]/60 hover:bg-[#EDF4F9]"
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
