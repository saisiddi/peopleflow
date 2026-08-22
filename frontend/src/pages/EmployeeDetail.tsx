import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Card, Button, Input, Badge, StatusBadge } from '../components/ui'

type Profile = {
  id: string; employee_id: string; full_name: string; email: string; role: string
  phone?: string; address?: string; profile_picture_url?: string
  job_title?: string; department?: string; date_joined?: string
}
type AttRow = {
  id: string; date: string; status: string
  entry_time: string | null; exit_time: string | null
}
type PayrollRow = {
  id: string; base_salary: number; allowances: number; deductions: number
  net_salary: number; month: string; year: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function EmployeeDetail() {
  const { id = '' } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attendance, setAttendance] = useState<AttRow[]>([])
  const [payroll, setPayroll] = useState<PayrollRow | null>(null)
  const [edit, setEdit] = useState({ base_salary: '', allowances: '', deductions: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<Profile>(`/profiles/${id}`).then(setProfile).catch(() => {})
    api<AttRow[]>(`/attendance/${id}`).then(setAttendance).catch(() => {})
    api<PayrollRow[]>(`/payroll/${id}`)
      .then((rows) => {
        if (rows[0]) {
          setPayroll(rows[0])
          setEdit({
            base_salary: String(rows[0].base_salary ?? ''),
            allowances: String(rows[0].allowances ?? ''),
            deductions: String(rows[0].deductions ?? ''),
          })
        }
      })
      .catch(() => {})
  }, [id])

  const savePayroll = async () => {
    setMsg('')
    try {
      await api(`/payroll/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          base_salary: parseFloat(edit.base_salary) || 0,
          allowances: parseFloat(edit.allowances) || 0,
          deductions: parseFloat(edit.deductions) || 0,
        }),
      })
      setMsg('Payroll updated.')
    } catch (e: any) { setMsg(e.message) }
  }

  const initials = (profile?.full_name || profile?.email || '?').slice(0, 2).toUpperCase()
  const netPreview =
    (parseFloat(edit.base_salary) || 0) + (parseFloat(edit.allowances) || 0) - (parseFloat(edit.deductions) || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-sm text-[#0B6FA8] hover:underline">← Back to overview</Link>
      </div>

      <Card className="flex items-center gap-4">
        {profile?.profile_picture_url ? (
          <img src={profile.profile_picture_url} alt="avatar" className="w-16 h-16 rounded-2xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-[#EAF4FB] text-[#0B6FA8] grid place-items-center text-xl font-bold">{initials}</div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-800">{profile?.full_name}</h1>
          <p className="text-sm text-slate-500">{profile?.email}</p>
          <p className="text-xs text-slate-400 mt-1">
            {profile?.employee_id} · <Badge color={profile?.role === 'admin' ? 'indigo' : 'slate'}>{profile?.role === 'admin' ? 'Admin / HR' : 'Employee'}</Badge>
            {profile?.job_title ? ` · ${profile.job_title}` : ''}{profile?.department ? ` · ${profile.department}` : ''}
          </p>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-display font-semibold text-slate-900 mb-3">Attendance (last 30 days)</h2>
          <ul className="divide-y divide-slate-50 max-h-80 overflow-auto">
            {attendance.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {a.date}
                  <span className="text-xs text-slate-400 ml-2">
                    {a.entry_time ? new Date(a.entry_time).toLocaleTimeString() : '—'} → {a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '—'}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
            {attendance.length === 0 && <li className="py-4 text-sm text-slate-400">No records.</li>}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display font-semibold text-slate-900 mb-3">
              Payroll {payroll ? `— ${payroll.month} ${payroll.year}` : ''}
            </h2>
            {payroll ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-slate-400">Base</label>
                    <Input type="number" value={edit.base_salary} onChange={(e) => setEdit({ ...edit, base_salary: e.target.value })} /></div>
                  <div><label className="text-xs text-slate-400">Allowances</label>
                    <Input type="number" value={edit.allowances} onChange={(e) => setEdit({ ...edit, allowances: e.target.value })} /></div>
                  <div><label className="text-xs text-slate-400">Deductions</label>
                    <Input type="number" value={edit.deductions} onChange={(e) => setEdit({ ...edit, deductions: e.target.value })} /></div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Net salary</span>
                  <span className="text-lg font-bold text-[#0B6FA8]">{fmt(netPreview)}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button onClick={savePayroll}>Save payroll</Button>
                  {msg && <span className="text-sm text-emerald-600">{msg}</span>}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">No payroll row — one is seeded on email signup.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-semibold text-slate-900 mb-3">Contact</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Phone</dt><dd className="text-slate-700">{profile?.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Address</dt><dd className="text-slate-700 text-right max-w-[60%]">{profile?.address || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Joined</dt><dd className="text-slate-700">{profile?.date_joined || '—'}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
