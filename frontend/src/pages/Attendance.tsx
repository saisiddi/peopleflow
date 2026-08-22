import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { useGeofence, GeofenceIndicator } from '../lib/useGeofence'
import { Card, Badge, StatusBadge, Select } from '../components/ui'

type AttRow = {
  id: string; date: string; status: string
  entry_time: string | null; entry_source: string
  exit_time: string | null; exit_source: string
  employee_id?: string
  profiles?: { full_name: string }
}
type LeaveRow = { id: string; employee_id: string; leave_type: string; status: string; start_date: string; end_date: string }

export default function Attendance() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { gf } = useGeofence(!isAdmin)
  const [rows, setRows] = useState<AttRow[]>([])
  const [leaves, setLeaves] = useState<LeaveRow[]>([])

  useEffect(() => {
    api<AttRow[]>(isAdmin ? '/attendance/all' : '/attendance/me')
      .then(setRows)
      .catch(() => {})
    api<LeaveRow[]>(isAdmin ? '/leave/all' : '/leave/me')
      .then(setLeaves)
      .catch(() => {})
  }, [isAdmin])

  // link an on_leave day back to the approved leave request that covers it
  const leaveFor = (row: AttRow): LeaveRow | undefined =>
    leaves.find(
      (l) =>
        l.status === 'approved' &&
        (!row.employee_id || l.employee_id === row.employee_id) &&
        l.start_date <= row.date &&
        row.date <= l.end_date
    )

  // group by week for the weekly view
  const weekOf = (d: string) => {
    const date = new Date(d)
    const day = (date.getDay() + 6) % 7 // Monday = 0
    date.setDate(date.getDate() - day)
    return date.toDateString()
  }
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  const weeks = rows.reduce<Record<string, AttRow[]>>((acc, r) => {
    ;(acc[weekOf(r.date)] ||= []).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <Select value={view} onChange={(e) => setView(e.target.value as any)} className="!w-36">
          <option value="daily">Daily view</option>
          <option value="weekly">Weekly view</option>
        </Select>
      </div>

      <p className="text-xs text-slate-500 bg-slate-100 rounded-xl px-3 py-2">
        💡 A day shows <span className="font-medium">On leave</span> only when an <span className="font-medium">approved</span> leave request covers it
        — the source request is listed under the status. <span className="font-medium">Rejected</span> leave never appears in attendance.
      </p>

      {!isAdmin && (
        <Card>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Today — live status</h2>
          <GeofenceIndicator gf={gf} />
          {gf.error && <p className="text-xs text-rose-500 mt-1">GPS error: {gf.error}</p>}
        </Card>
      )}

      {view === 'daily' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  {isAdmin && <th className="pb-2">Employee</th>}
                  <th className="pb-2">Date</th><th className="pb-2">Entry</th><th className="pb-2">Entry source</th>
                  <th className="pb-2">Exit</th><th className="pb-2">Exit source</th><th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((a) => (
                  <tr key={a.id}>
                    {isAdmin && <td className="py-2 font-medium text-slate-700">{a.profiles?.full_name}</td>}
                    <td className="py-2 text-slate-500">{a.date}</td>
                    <td className="py-2 text-slate-500">{a.entry_time ? new Date(a.entry_time).toLocaleTimeString() : '—'}</td>
                    <td className="py-2">{a.entry_time ? <Badge color={a.entry_source === 'gps_geofence' ? 'blue' : 'slate'}>{a.entry_source === 'gps_geofence' ? 'GPS' : 'Fingerprint (legacy)'}</Badge> : '—'}</td>
                    <td className="py-2 text-slate-500">{a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '—'}</td>
                    <td className="py-2">{a.exit_time ? <Badge color="blue">GPS Auto-Detected</Badge> : '—'}</td>
                    <td className="py-2">
                      <StatusBadge status={a.status} />
                      {a.status === 'on_leave' && leaveFor(a) && (
                        <span className="block text-xs font-medium text-slate-500 mt-0.5">
                          ✅ approved {leaveFor(a)!.leave_type} leave ({leaveFor(a)!.start_date} → {leaveFor(a)!.end_date})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="py-4 text-slate-400">No records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(weeks).map(([week, days]) => (
            <Card key={week}>
              <h3 className="font-semibold text-slate-700 mb-2">Week of {week}</h3>
              <ul className="space-y-2">
                {days.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600">
                      {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {isAdmin && d.profiles ? ` · ${d.profiles.full_name}` : ''}
                      {d.status === 'on_leave' && leaveFor(d) && (
                        <span className="block text-xs text-slate-400">from approved {leaveFor(d)!.leave_type} leave</span>
                      )}
                    </span>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {rows.length === 0 && <Card><p className="text-sm text-slate-400">No records yet.</p></Card>}
        </div>
      )}
    </div>
  )
}
