import { FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth, Profile as ProfileT } from '../lib/store'
import { Card, Button, Input } from '../components/ui'

export default function ProfilePage() {
  const { profile, refresh } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [form, setForm] = useState({ phone: '', address: '', profile_picture_url: '', job_title: '', department: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (profile)
      setForm({
        phone: profile.phone || '',
        address: profile.address || '',
        profile_picture_url: profile.profile_picture_url || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
      })
  }, [profile?.id])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api('/profiles/me', { method: 'PATCH', body: JSON.stringify(form) })
      setMsg('Profile saved.')
      refresh()
    } catch (err: any) {
      setMsg(err.message)
    }
  }

  const p: ProfileT | null = profile
  const initials = (p?.full_name || p?.email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>

      <Card className="flex items-center gap-4">
        {p?.profile_picture_url ? (
          <img src={p.profile_picture_url} alt="avatar" className="w-20 h-20 rounded-2xl object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-[#EAF4FB] text-[#0B6FA8] grid place-items-center text-2xl font-bold">{initials}</div>
        )}
        <div>
          <h2 className="font-display font-semibold text-slate-900 text-lg">{p?.full_name}</h2>
          <p className="text-sm text-slate-500">{p?.email}</p>
          <p className="text-xs text-slate-400 mt-1">
            {p?.employee_id} · {p?.role === 'admin' ? 'Admin / HR' : 'Employee'}
            {p?.date_joined ? ` · joined ${p.date_joined}` : ''}
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-slate-900 mb-3">Details</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-400">Job title</dt><dd className="text-slate-700">{p?.job_title || '—'}</dd></div>
          <div><dt className="text-slate-400">Department</dt><dd className="text-slate-700">{p?.department || '—'}</dd></div>
          <div><dt className="text-slate-400">Phone</dt><dd className="text-slate-700">{p?.phone || '—'}</dd></div>
          <div><dt className="text-slate-400">Address</dt><dd className="text-slate-700">{p?.address || '—'}</dd></div>
          <div><dt className="text-slate-400">Documents</dt><dd className="text-slate-400 italic">Coming soon (stub)</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-slate-900 mb-1">Edit profile</h2>
        <p className="text-xs text-slate-400 mb-3">
          Employees can edit phone, address and profile picture{isAdmin ? ' (admins can edit all fields)' : ''}.
        </p>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-slate-400">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Profile picture URL</label>
            <Input value={form.profile_picture_url} onChange={(e) => setForm({ ...form, profile_picture_url: e.target.value })} /></div>
          {isAdmin && (
            <>
              <div><label className="text-xs text-slate-400">Job title</label>
                <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400">Department</label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </>
          )}
          <div className="sm:col-span-2"><label className="text-xs text-slate-400">Address</label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit">Save changes</Button>
            {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          </div>
        </form>
      </Card>
    </div>
  )
}
