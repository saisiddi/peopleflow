import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Card, Button, Input, Badge, StatusBadge } from '../components/ui'

type Profile = { id: string; full_name: string; employee_id: string; email: string; role: string; department?: string }
type LeaveRow = { id: string; leave_type: string; status: string; start_date: string; end_date: string; employee_id: string; remarks?: string; profiles?: { full_name: string } }
type AttRow = { id: string; date: string; status: string; entry_time: string | null; entry_source: string; exit_time: string | null; exit_source: string; employee_id: string; profiles?: { full_name: string } }

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [employees, setEmployees] = useState<Profile[]>([])
  const [leaves, setLeaves] = useState<LeaveRow[]>([])
  const [attendance, setAttendance] = useState<AttRow[]>([])
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    api<Profile[]>('/profiles').then(setEmployees).catch(() => {})
    api<LeaveRow[]>('/leave/all').then(setLeaves).catch(() => {})
    api<AttRow[]>('/attendance/all').then(setAttendance).catch(() => {})
  }, [])
  useEffect(load, [load])

  // realtime refresh when leave requests change
  useEffect(() => {
    const channel = supabase
      .channel('admin-leave')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const pending = leaves.filter((l) => l.status === 'pending')
  const filtered = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id?.toLowerCase().includes(search.toLowerCase())
  )

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  // today's attendance row per employee — drives the ✓ checked-in state
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time
  const todayByEmployee = new Map(
    attendance.filter((a) => a.date === today).map((a) => [a.employee_id, a])
  )

  const simulatePunch = async (employeeId: string, name: string) => {
    await api('/attendance/entry-simulate', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    })
    setMsg(`Fingerprint punch simulated for ${name}`)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Admin Overview</h1>
          <p className="text-slate-500 text-sm">{profile?.full_name} · HR Control Center</p>
        </div>
        <Badge color="indigo">{pending.length} pending approval{pending.length === 1 ? '' : 's'}</Badge>
      </div>

      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        {(() => {
          const m = new Date().toISOString().slice(0, 8)
          const mr = attendance.filter((a) => a.date.startsWith(m))
          const c = (s: string) => mr.filter((a) => a.status === s).length
          const chips: [string, string, string][] = [
            ['present', 'present', 'text-emerald-600'],
            ['on_leave', 'on leave', 'text-sky-600'],
            ['half_day', 'half-days', 'text-amber-600'],
          ]
          return (
            <>
              {chips.map(([s, label, color]) => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-white border border-slate-100 text-xs font-medium text-slate-600">
                  This month: <strong className={color}>{c(s)} {label}</strong>
                </span>
              ))}
              <Link to="/reports" className="px-3 py-1.5 rounded-full bg-[#EAF4FB] text-xs font-medium text-[#0B6FA8] hover:bg-[#E1EEF7]">
                Full report →
              </Link>
            </>
          )
        })()}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={async () => {
          const r = await api<{ finalized: number }>('/attendance/finalize-pending', { method: 'POST' })
          setMsg(`Finalized ${r.finalized} pending exit(s) — server-side safety net`)
          load()
        }}>
          Run exit-finalizer now (normally every 5 min)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-slate-900">Employees ({filtered.length})</h2>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="!w-40" />
          </div>
          <ul className="divide-y divide-slate-50 max-h-72 overflow-auto">
            {filtered.map((e) => {
              const att = todayByEmployee.get(e.id)
              return (
                <li key={e.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{e.full_name || e.email}</p>
                    <p className="text-xs text-slate-400">{e.employee_id} · {e.role === 'admin' ? 'Admin' : 'Employee'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {att?.entry_time ? (
                      <>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          att.exit_time ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <span className={att.exit_time ? '' : 'animate-pulse'}>✓</span>
                          {att.exit_time
                            ? `Entered ${fmtTime(att.entry_time)} · exited ${fmtTime(att.exit_time)}`
                            : `Checked in ${fmtTime(att.entry_time)}`}
                        </span>
                        <Button variant="ghost" onClick={() => simulatePunch(e.id, e.full_name)}>
                          Check in again
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" onClick={() => simulatePunch(e.id, e.full_name)}>
                        Manual check-in (demo)
                      </Button>
                    )}
                    <Link to={`/admin/employee/${e.id}`}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-[#0B2740] text-white hover:bg-[#061524] transition">
                      View
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-slate-900">Leave Approvals Queue</h2>
            <Link to="/leave" className="text-sm text-[#0B6FA8] hover:underline">Manage all →</Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-400">No pending requests. 🎉</p>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-auto">
              {pending.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{l.profiles?.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{l.leave_type} · {l.start_date} → {l.end_date}</p>
                    {l.remarks && <p className="text-xs text-slate-500 italic mt-0.5">“{l.remarks}”</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="success" onClick={async () => {
                      await api(`/leave/${l.id}/review`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', admin_comment: 'Approved via dashboard' }) })
                      load()
                    }}>Approve</Button>
                    <Button variant="danger" onClick={async () => {
                      await api(`/leave/${l.id}/review`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', admin_comment: 'Rejected via dashboard' }) })
                      load()
                    }}>Reject</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-display font-semibold text-slate-900 mb-3">Attendance Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="pb-2">Employee</th><th className="pb-2">Date</th><th className="pb-2">Entry</th>
                <th className="pb-2">Source</th><th className="pb-2">Exit</th><th className="pb-2">Source</th><th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 font-medium text-slate-700">{a.profiles?.full_name}</td>
                  <td className="py-2 text-slate-500">{a.date}</td>
                    <td className="py-2 text-slate-500">{a.entry_time ? new Date(a.entry_time).toLocaleTimeString() : '—'}</td>
                    <td className="py-2">{a.entry_time ? <Badge color={a.entry_source === 'gps_geofence' ? 'blue' : 'slate'}>{a.entry_source === 'gps_geofence' ? 'GPS' : 'Manual (demo)'}</Badge> : '—'}</td>
                  <td className="py-2 text-slate-500">{a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '—'}</td>
                  <td className="py-2">{a.exit_time ? <Badge color="blue">GPS Auto-Detected</Badge> : '—'}</td>
                  <td className="py-2">
                    <StatusBadge status={a.status} />
                    {a.status === 'on_leave' &&
                      leaves.find(
                        (l) =>
                          l.status === 'approved' &&
                          l.employee_id === a.employee_id &&
                          l.start_date <= a.date &&
                          a.date <= l.end_date
                      ) && (
                        <span className="block text-xs text-slate-400 mt-0.5">
                          from approved {leaves.find((l) => l.status === 'approved' && l.employee_id === a.employee_id && l.start_date <= a.date && a.date <= l.end_date)!.leave_type} leave
                        </span>
                      )}
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-slate-400">No attendance records yet — simulate a fingerprint punch above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
