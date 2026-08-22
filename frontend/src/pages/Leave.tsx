import { FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { supabase } from '../lib/supabase'
import { Card, Button, Input, Select, StatusBadge } from '../components/ui'

type LeaveRow = {
  id: string; leave_type: string; start_date: string; end_date: string
  remarks?: string; status: string; admin_comment?: string
  employee_id: string; profiles?: { full_name: string }
}

export default function Leave() {
  const { profile, refresh } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [rows, setRows] = useState<LeaveRow[]>([])
  const [filter, setFilter] = useState('all')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ leave_type: 'paid', start_date: '', end_date: '', remarks: '' })

  const load = () =>
    api<LeaveRow[]>(isAdmin ? '/leave/all' : '/leave/me').then(setRows).catch(() => {})
  useEffect(() => { load() }, [])

  // Supabase Realtime: instant refresh when admin reviews (and vice versa)
  useEffect(() => {
    const channel = supabase
      .channel('leave-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const apply = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    try {
      await api('/leave/apply', { method: 'POST', body: JSON.stringify(form) })
      setMsg('Leave request submitted — pending approval.')
      setForm({ leave_type: 'paid', start_date: '', end_date: '', remarks: '' })
      load()
    } catch (err: any) {
      setMsg(err.message)
    }
  }

  const review = async (id: string, status: 'approved' | 'rejected') => {
    const admin_comment = prompt(`Comment for this ${status} request (optional)`) ?? ''
    await api(`/leave/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, admin_comment }) })
    load()
    refresh()
  }

  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  const days = (l: LeaveRow) =>
    Math.round((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1
  const stat = (s: string) => rows.filter((r) => r.status === s).length
  const approvedDays = rows.filter((r) => r.status === 'approved').reduce((sum, l) => sum + days(l), 0)

  // per-employee breakdown (admin view)
  const byEmployee = rows.reduce<Record<string, { name: string; total: number; pending: number; approved: number; rejected: number; days: number }>>((acc, l) => {
    const key = l.employee_id
    const name = l.profiles?.full_name || key.slice(0, 8)
    acc[key] ||= { name, total: 0, pending: 0, approved: 0, rejected: 0, days: 0 }
    acc[key].total++
    acc[key][l.status as 'pending' | 'approved' | 'rejected']++
    if (l.status === 'approved') acc[key].days += days(l)
    return acc
  }, {})

  const statCards = [
    ['Total requests', String(rows.length), 'text-slate-800'],
    ['Pending', String(stat('pending')), 'text-amber-600'],
    ['Approved', String(stat('approved')), 'text-emerald-600'],
    ['Rejected', String(stat('rejected')), 'text-rose-600'],
    ['Approved days off', String(approvedDays), 'text-indigo-600'],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Leave & Time-Off</h1>

      {!isAdmin && (
        <Card>
          <h2 className="font-semibold text-slate-800 mb-3">Apply for leave</h2>
          <form onSubmit={apply} className="grid sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-slate-400">Type</label>
              <Select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                <option value="paid">Paid</option>
                <option value="sick">Sick</option>
                <option value="unpaid">Unpaid</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400">From</label>
              <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400">To</label>
              <Input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <Button type="submit">Submit</Button>
            <div className="sm:col-span-4">
              <Input placeholder="Remarks (optional)" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </form>
          {msg && <p className="text-sm text-indigo-600 mt-2">{msg}</p>}
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map(([label, value, color]) => (
          <Card key={label} className="text-center !py-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <Card>
          <h2 className="font-semibold text-slate-800 mb-3">Leave record by employee</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="pb-2">Employee</th><th className="pb-2">Total</th><th className="pb-2">Pending</th>
                  <th className="pb-2">Approved</th><th className="pb-2">Rejected</th><th className="pb-2">Days approved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.values(byEmployee).sort((a, b) => b.total - a.total).map((s) => (
                  <tr key={s.name}>
                    <td className="py-2 font-medium text-slate-700">{s.name}</td>
                    <td className="py-2 text-slate-600">{s.total}</td>
                    <td className="py-2 text-amber-600">{s.pending || '—'}</td>
                    <td className="py-2 text-emerald-600">{s.approved || '—'}</td>
                    <td className="py-2 text-rose-600">{s.rejected || '—'}</td>
                    <td className="py-2 font-medium text-indigo-600">{s.days || '—'}</td>
                  </tr>
                ))}
                {Object.keys(byEmployee).length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-slate-400">No leave requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">
            {isAdmin ? 'All requests' : 'My requests'}{' '}
            <span className="text-xs font-normal text-slate-400">updates live — no refresh needed</span>
          </h2>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-36">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        <ul className="space-y-3">
          {shown.map((l) => (
            <li key={l.id} className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-700 capitalize">
                  {isAdmin && l.profiles ? `${l.profiles.full_name} — ` : ''}{l.leave_type} leave
                </p>
                <p className="text-sm text-slate-500">{l.start_date} → {l.end_date}</p>
                {l.remarks && <p className="text-xs text-slate-400 mt-1">“{l.remarks}”</p>}
                {l.admin_comment && <p className="text-xs text-indigo-500 mt-1">Admin: “{l.admin_comment}”</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={l.status} />
                {isAdmin && l.status === 'pending' && (
                  <>
                    <Button variant="success" onClick={() => review(l.id, 'approved')}>Approve</Button>
                    <Button variant="danger" onClick={() => review(l.id, 'rejected')}>Reject</Button>
                  </>
                )}
              </div>
            </li>
          ))}
          {shown.length === 0 && <p className="text-sm text-slate-400">No requests.</p>}
        </ul>
      </Card>
    </div>
  )
}
