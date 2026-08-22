import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { Card } from '../components/ui'

type AttRow = {
  id: string; date: string; status: string
  employee_id?: string
  profiles?: { full_name: string; employee_id: string }
}

const monthName = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export default function Reports() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [rows, setRows] = useState<AttRow[]>([])
  const [month, setMonth] = useState(monthKey(new Date()))

  useEffect(() => {
    api<AttRow[]>(isAdmin ? '/attendance/all' : '/attendance/me')
      .then(setRows)
      .catch(() => {})
  }, [isAdmin])

  const months = useMemo(() => {
    const set = new Set<string>([monthKey(new Date())])
    rows.forEach((r) => set.add(r.date.slice(0, 7)))
    return [...set].sort().reverse()
  }, [rows])

  const inMonth = rows.filter((r) => r.date.startsWith(month))
  const count = (s: string, list: AttRow[] = inMonth) => list.filter((r) => r.status === s).length

  const perEmployee = useMemo(() => {
    const map = new Map<string, { name: string; employee_id: string; present: number; on_leave: number; half_day: number; absent: number }>()
    inMonth.forEach((r) => {
      const key = r.employee_id || 'me'
      const name = isAdmin ? r.profiles?.full_name || 'Unknown' : profile?.full_name || 'Me'
      const empId = isAdmin ? r.profiles?.employee_id || '—' : profile?.employee_id || '—'
      const e = map.get(key) || { name, employee_id: empId, present: 0, on_leave: 0, half_day: 0, absent: 0 }
      if (r.status === 'present') e.present++
      else if (r.status === 'on_leave') e.on_leave++
      else if (r.status === 'half_day') e.half_day++
      else if (r.status === 'absent') e.absent++
      map.set(key, e)
    })
    return [...map.values()].sort((a, b) => b.present + b.on_leave - (a.present + a.on_leave))
  }, [inMonth, isAdmin, profile])

  const tracked = inMonth.length
  const rate = tracked ? Math.round(((count('present') + count('on_leave') + count('half_day') * 0.5) / tracked) * 100) : 0

  const exportCsv = () => {
    const header = 'Employee,Employee ID,Present,On leave,Half days,Absent'
    const lines = perEmployee.map((e) => `${e.name},${e.employee_id},${e.present},${e.on_leave},${e.half_day},${e.absent}`)
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dayflow-attendance-${month}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ['Present', count('present'), 'text-emerald-600'],
          ['On leave', count('on_leave'), 'text-sky-600'],
          ['Half days', count('half_day'), 'text-amber-600'],
          ['Absent', count('absent'), 'text-rose-600'],
          ['Attendance rate', rate + '%', 'text-[#0B6FA8]'],
        ].map(([label, value, color]) => (
          <Card key={label as string} className="text-center !py-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-slate-900">
            {isAdmin ? 'Attendance by employee' : 'My monthly record'} — {new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={exportCsv} className="text-sm text-[#0B6FA8] hover:underline font-medium">
            ⬇ Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                {isAdmin && <th className="pb-2">Employee</th>}
                <th className="pb-2">Present</th><th className="pb-2">On leave</th>
                <th className="pb-2">Half days</th><th className="pb-2">Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {perEmployee.map((e) => (
                <tr key={e.name + e.employee_id}>
                  {isAdmin && <td className="py-2 font-medium text-slate-700">{e.name} <span className="text-xs text-slate-400">{e.employee_id}</span></td>}
                  <td className="py-2 text-emerald-600 font-medium">{e.present || '—'}</td>
                  <td className="py-2 text-sky-600 font-medium">{e.on_leave || '—'}</td>
                  <td className="py-2 text-amber-600 font-medium">{e.half_day || '—'}</td>
                  <td className="py-2 text-rose-600 font-medium">{e.absent || '—'}</td>
                </tr>
              ))}
              {perEmployee.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400">No attendance data this month.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
