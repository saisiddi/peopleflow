import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { Card, Input, Button, Badge } from '../components/ui'
import { Printer } from 'lucide-react'

type PayrollRow = {
  id: string; base_salary: number; allowances: number; deductions: number
  net_salary: number; month: string; year: number; employee_id: string
  profiles?: { full_name: string }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function printPayslip(opts: {
  name: string; empId: string; jobTitle?: string; department?: string
  month: string; base: number; allowances: number; deductions: number; net: number
}) {
  const w = window.open('', '_blank', 'width=720,height=800')
  if (!w) return
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right"><b>${value}</b></td></tr>`
  w.document.write(`
    <html><head><title>Payslip — ${opts.name}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1e293b; padding: 32px; }
      h1 { color: #4f46e5; margin: 0; font-size: 22px; }
      .muted { color: #64748b; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
      .net td { background: #eef2ff; font-size: 16px; }
    </style></head><body>
      <h1>Dayflow HRMS</h1>
      <p class="muted">Payslip for ${opts.month}</p>
      <hr>
      <p><b>${opts.name}</b> (${opts.empId})<br>
      <span class="muted">${opts.jobTitle || '—'}${opts.department ? ' · ' + opts.department : ''}</span></p>
      <table>
        ${row('Base salary', fmt(opts.base))}
        ${row('Allowances', fmt(opts.allowances))}
        ${row('Deductions', '-' + fmt(opts.deductions))}
        <tr class="net"><td style="padding:10px 12px">Net salary</td><td style="padding:10px 12px;text-align:right">${fmt(opts.net)}</td></tr>
      </table>
      <p class="muted" style="margin-top:24px">This is a system-generated payslip.</p>
    </body></html>`)
  w.document.close()
  w.focus()
  w.print()
}

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
      <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Payroll</h1>

      {!isAdmin && (
        <Card>
          <h2 className="font-display font-semibold text-slate-900 mb-1">Salary — {rows[0]?.month} {rows[0]?.year}</h2>
          <p className="text-xs text-slate-400 mb-4">Read-only. Contact HR for corrections.</p>
          {rows[0] ? (
            <>
              <div className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Base salary</p><p className="font-semibold text-slate-700">{fmt(rows[0].base_salary)}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Allowances</p><p className="font-semibold text-emerald-600">{fmt(rows[0].allowances)}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs">Deductions</p><p className="font-semibold text-rose-600">{fmt(rows[0].deductions)}</p></div>
              </div>
              <div className="bg-[#0B2740] text-white rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[#BFD9E8] text-xs">Net salary — {monthLabel}</p>
                  <span className="text-2xl font-bold">{fmt(rows[0].net_salary)}</span>
                </div>
                <button
                  onClick={() =>
                    printPayslip({
                      name: profile?.full_name || '', empId: profile?.employee_id || '',
                      jobTitle: profile?.job_title, department: profile?.department,
                      month: monthLabel, base: Number(rows[0].base_salary), allowances: Number(rows[0].allowances),
                      deductions: Number(rows[0].deductions), net: Number(rows[0].net_salary),
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-white text-[#0B6FA8] text-sm font-semibold hover:bg-[#EAF4FB] transition"
                >
                  <Printer size={14} className="inline -mt-0.5" /> Payslip
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">No payroll data for this month yet.</p>
          )}
        </Card>
      )}

      {isAdmin && (
        <Card>
          <h2 className="font-display font-semibold text-slate-900 mb-1">Employee payroll editor</h2>
          <p className="text-xs text-slate-400 mb-4">
            Select an employee to view and edit their salary structure. The employee sees this as read-only;
            net salary auto-computes as base + allowances − deductions.
          </p>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-[#0B2740]/12 text-sm mb-4 bg-white"
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
              <div className="mt-4 bg-[#0B2740] text-white rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[#BFD9E8] text-xs">Net salary — {monthLabel}</p>
                  <p className="text-2xl font-bold">
                    {fmt((parseFloat(edit.base_salary) || 0) + (parseFloat(edit.allowances) || 0) - (parseFloat(edit.deductions) || 0))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {msg && <span className="text-sm text-emerald-200">✓ {msg}</span>}
                  <button
                    onClick={() => {
                      const emp = employees.find((x: any) => x.id === selected)
                      printPayslip({
                        name: emp?.full_name || '', empId: emp?.employee_id || '',
                        jobTitle: emp?.job_title, department: emp?.department,
                        month: monthLabel,
                        base: parseFloat(edit.base_salary) || 0,
                        allowances: parseFloat(edit.allowances) || 0,
                        deductions: parseFloat(edit.deductions) || 0,
                        net: (parseFloat(edit.base_salary) || 0) + (parseFloat(edit.allowances) || 0) - (parseFloat(edit.deductions) || 0),
                      })
                    }}
                    className="px-3 py-2 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition"
                  >
                    <Printer size={14} className="inline -mt-0.5" /> Payslip
                  </button>
                  <button
                    onClick={save}
                    className="px-4 py-2 rounded-xl bg-white text-[#0B6FA8] text-sm font-semibold hover:bg-[#EAF4FB] transition"
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
