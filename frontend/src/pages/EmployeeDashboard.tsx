import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { useGeofence, GeofenceIndicator } from '../lib/useGeofence'
import { Card, Badge, StatusBadge } from '../components/ui'
import { User, Clock, Palmtree, Wallet } from 'lucide-react'

type LeaveRow = { id: string; leave_type: string; status: string; start_date: string; end_date: string; updated_at: string }
type AttRow = { date: string; status: string; entry_time: string | null; exit_time: string | null }

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const { gf, pingNow } = useGeofence(profile?.role === 'employee')
  const [leaves, setLeaves] = useState<LeaveRow[]>([])
  const [attendance, setAttendance] = useState<AttRow[]>([])

  useEffect(() => {
    api<LeaveRow[]>('/leave/me').then(setLeaves).catch(() => {})
    api<AttRow[]>('/attendance/me').then(setAttendance).catch(() => {})
  }, [])

  const recent = [
    ...leaves.slice(0, 3).map((l) => ({
      when: l.updated_at,
      text: `Leave request (${l.leave_type}, ${l.start_date}) — ${l.status}`,
    })),
    ...attendance
      .filter((a) => a.entry_time)
      .slice(0, 3)
      .map((a) => ({
        when: a.date,
        text: `Attendance ${a.date}: ${a.status}${a.exit_time ? ' (checked out)' : ''}`,
      })),
  ].slice(0, 5)

  const monthStart = new Date().toISOString().slice(0, 8)
  const monthRows = attendance.filter((a) => a.date.startsWith(monthStart))
  const mc = (s: string) => monthRows.filter((a) => a.status === s).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Good day, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-slate-500 text-sm">{profile?.job_title || 'Employee'}{profile?.department ? ` · ${profile.department}` : ''}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-full bg-white border border-slate-100 text-xs font-medium text-slate-600">
          This month: <strong className="text-emerald-600">{mc('present')} present</strong>
        </span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-slate-100 text-xs font-medium text-slate-600">
          <strong className="text-sky-600">{mc('on_leave')} on leave</strong>
        </span>
        <span className="px-3 py-1.5 rounded-full bg-white border border-slate-100 text-xs font-medium text-slate-600">
          <strong className="text-amber-600">{mc('half_day')} half-days</strong>
        </span>
        <Link to="/reports" className="px-3 py-1.5 rounded-full bg-[#EAF4FB] text-xs font-medium text-[#0B6FA8] hover:bg-[#E1EEF7]">
          Full report →
        </Link>
      </div>

      {profile?.role === 'employee' && (
        <Card className="!bg-gradient-to-r !from-[#0B2740] !to-[#061524] !border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[#BFD9E8] text-xs uppercase tracking-wider font-semibold">Live attendance</p>
              <div className="mt-2 [&_span]:!text-white">
                <GeofenceIndicator gf={gf} />
              </div>
              {gf.error && <p className="text-xs text-[#9FB8C8] mt-1">{gf.error}</p>}
              {gf.checked_in && (
                <p className="text-xs text-emerald-200 mt-1">✓ Checked in — you entered the office geofence</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-[#9FB8C8] text-xs max-w-xs">
                Fully GPS: entering the office radius checks you in automatically — leaving it (after a grace window) checks you out.
              </p>
              <button
                onClick={pingNow}
                className="px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition"
              >
                Check my location now
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Profile', '/profile', User, 'text-[#0B6FA8]'],
          ['Attendance', '/attendance', Clock, 'text-emerald-500'],
          ['Leave Requests', '/leave', Palmtree, 'text-amber-500'],
          ['Payroll', '/payroll', Wallet, 'text-sky-500'],
        ].map(([label, to, Icon, color]: any) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer text-center">
              <Icon size={26} className={`mx-auto ${color}`} strokeWidth={1.8} />
              <p className="mt-2 font-medium text-slate-700">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="font-display font-semibold text-slate-900 mb-3">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing yet — apply for leave or check in to see activity here.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{r.text}</span>
                <Badge>{new Date(r.when).toLocaleDateString()}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-slate-900 mb-3">
          My leave status <span className="text-xs font-normal text-slate-400">(live)</span>
        </h2>
        {leaves.length > 0 && (
          <div className="flex gap-2 mb-3 text-xs">
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{leaves.filter((l) => l.status === 'pending').length} pending</span>
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{leaves.filter((l) => l.status === 'approved').length} approved</span>
            <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 font-medium">{leaves.filter((l) => l.status === 'rejected').length} rejected</span>
          </div>
        )}
        {leaves.length === 0 ? (
          <p className="text-sm text-slate-400">No leave requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {leaves.slice(0, 4).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
                <span className="capitalize text-slate-600">{l.leave_type} · {l.start_date} → {l.end_date}</span>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
