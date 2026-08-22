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

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">
            {isAdmin ? 'All requests' : 'My requests'}
            <span className="text-xs font-normal text-slate-400 ml-2">updates live — no refresh needed</span>
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
