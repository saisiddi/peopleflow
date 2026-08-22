import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { useGeofence, GeofenceIndicator } from '../lib/useGeofence'
import { Card, Badge, StatusBadge, Select } from '../components/ui'

type AttRow = {
  id: string; date: string; status: string
  entry_time: string | null; entry_source: string
  exit_time: string | null; exit_source: string
  profiles?: { full_name: string }
}

export default function Attendance() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const gf = useGeofence(!isAdmin)
  const [rows, setRows] = useState<AttRow[]>([])

  useEffect(() => {
    api<AttRow[]>(isAdmin ? '/attendance/all' : '/attendance/me')
      .then(setRows)
      .catch(() => {})
  }, [isAdmin])

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
                    <td className="py-2">{a.entry_time ? <Badge color="indigo">Fingerprint</Badge> : '—'}</td>
                    <td className="py-2 text-slate-500">{a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '—'}</td>
                    <td className="py-2">{a.exit_time ? <Badge color="blue">GPS Auto-Detected</Badge> : '—'}</td>
                    <td className="py-2"><StatusBadge status={a.status} /></td>
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
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {isAdmin && d.profiles ? ` · ${d.profiles.full_name}` : ''}
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
