import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { Card, Input, Button, Badge } from '../components/ui'

type PayrollRow = {
  id: string; base_salary: number; allowances: number; deductions: number
  net_salary: number; month: string; year: number; employee_id: string
  profiles?: { full_name: string }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function Payroll() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selected, setSelected] = useState('')
  const [edit, setEdit] = useState({ base_salary: '', allowances: '', deductions: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<PayrollRow[]>('/payroll/me').then(setRows).catch(() => {})
    if (isAdmin) api('/profiles').then(setEmployees).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin || !selected) return
    api<PayrollRow[]>(`/payroll/${selected}`).then((r) => {
      if (r[0]) setEdit({
        base_salary: String(r[0].base_salary ?? ''),
        allowances: String(r[0].allowances ?? ''),
        deductions: String(r[0].deductions ?? ''),
      })
    }).catch(() => {})
  }, [selected, isAdmin])

  const save = async () => {
    setMsg('')
    try {
      const r = await api<{ net_salary: number }>(`/payroll/${selected}`, {
        method: 'PATCH',
        body: JSON.stringify({
          base_salary: parseFloat(edit.base_salary) || 0,
          allowances: parseFloat(edit.allowances) || 0,
          deductions: parseFloat(edit.deductions) || 0,
        }),
      })
      setMsg(`Saved · net ${fmt(r.net_salary)}`)
    } catch (e: any) { setMsg(e.message) }
  }

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>

      {!isAdmin && (
        <Card>
          <h2 className="font-semibold text-slate-800 mb-1">Salary — {rows[0]?.month} {rows[0]?.year}</h2>
          <p className="text-xs text-slate-400 mb-4">Read-only. Contact HR for corrections.</p>
          {rows[0] ? (
            <>
              <div className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Base salary</p><p className="font-semibold text-slate-700">{fmt(rows[0].base_salary)}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Allowances</p><p className="font-semibold text-emerald-600">{fmt(rows[0].allowances)}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Deductions</p><p className="font-semibold text-rose-600">{fmt(rows[0].deductions)}</p></div>
              </div>
              <div className="bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-between">
                <span className="font-medium">Net salary</span>
                <span className="text-2xl font-bold">{fmt(rows[0].net_salary)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">No payroll data for this month yet.</p>
          )}
        </Card>
      )}

      {isAdmin && (
        <Card>
          <h2 className="font-semibold text-slate-800 mb-1">Employee payroll editor</h2>
          <p className="text-xs text-slate-400 mb-4">
            Select an employee to view and edit their salary structure. The employee sees this as read-only;
            net salary auto-computes as base + allowances − deductions.
          </p>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm mb-4 bg-white"
          >
            <option value="">— select employee —</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
            ))}
          </select>
          {selected && (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-400">Base salary (monthly)</label>
                  <Input type="number" value={edit.base_salary} onChange={(e) => setEdit({ ...edit, base_salary: e.target.value })} /></div>
                <div><label className="text-xs text-slate-400">Allowances</label>
                  <Input type="number" value={edit.allowances} onChange={(e) => setEdit({ ...edit, allowances: e.target.value })} /></div>
                <div><label className="text-xs text-slate-400">Deductions</label>
                  <Input type="number" value={edit.deductions} onChange={(e) => setEdit({ ...edit, deductions: e.target.value })} /></div>
              </div>
              <div className="mt-4 bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-xs">Net salary — {monthLabel}</p>
                  <p className="text-2xl font-bold">
                    {fmt((parseFloat(edit.base_salary) || 0) + (parseFloat(edit.allowances) || 0) - (parseFloat(edit.deductions) || 0))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {msg && <span className="text-sm text-emerald-200">✓ {msg}</span>}
                  <button
                    onClick={save}
                    className="px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
