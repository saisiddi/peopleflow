import { FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { Card, Button, Input, Badge } from '../components/ui'
import { Calendar, Clock, MapPin, FileText } from 'lucide-react'

type Meeting = {
  id: string; title: string; agenda?: string; meeting_date: string
  meeting_time: string; place?: string; created_at: string; seen?: boolean
  meeting_attendees?: { profiles?: { full_name: string; employee_id: string } }[]
}
type ProfileLite = { id: string; full_name: string; employee_id: string; role: string }

export default function Meetings() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [employees, setEmployees] = useState<ProfileLite[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ title: '', meeting_date: '', meeting_time: '10:00', place: '', agenda: '' })
  const [justSeen, setJustSeen] = useState<Set<string>>(new Set())

  const load = () => {
    api<Meeting[]>(isAdmin ? '/meetings/all' : '/meetings/me').then(setMeetings).catch(() => {})
    if (isAdmin) api<ProfileLite[]>('/profiles').then(setEmployees).catch(() => {})
  }
  useEffect(() => { load() }, [isAdmin])

  // employees: viewing this page marks new meetings as seen (kept highlighted for this visit)
  useEffect(() => {
    if (isAdmin) return
    const unseen = meetings.filter((m) => m.seen === false)
    if (unseen.length === 0) return
    setJustSeen(new Set(unseen.map((m) => m.id)))
    unseen.forEach((m) => api(`/meetings/${m.id}/seen`, { method: 'PATCH' }).catch(() => {}))
  }, [meetings.length])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    try {
      await api('/meetings', {
        method: 'POST',
        body: JSON.stringify({ ...form, attendee_ids: [...selected] }),
      })
      setMsg(`✓ Meeting scheduled — ${selected.size} attendee${selected.size === 1 ? '' : 's'} notified`)
      setForm({ title: '', meeting_date: '', meeting_time: '10:00', place: '', agenda: '' })
      setSelected(new Set())
      load()
    } catch (err: any) {
      setMsg(err.message)
    }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Meetings</h1>

      {isAdmin && (
        <Card>
          <h2 className="font-display font-semibold text-slate-900 mb-3">Schedule a meeting</h2>
          <form onSubmit={create} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400">Title</label>
                <Input required placeholder="e.g. Q3 Roadmap Review" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400">Place</label>
                <Input placeholder="e.g. Board Room / Meet link" value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400">Date</label>
                <Input required type="date" value={form.meeting_date}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} /></div>
              <div><label className="text-xs text-slate-400">Time</label>
                <Input required type="time" value={form.meeting_time}
                  onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} /></div>
            </div>
            <div><label className="text-xs text-slate-400">Agenda</label>
              <Input placeholder="What will be discussed?" value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>

            <div>
              <label className="text-xs text-slate-400">Attendees (notified in-app)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {employees.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      selected.has(e.id)
                        ? 'bg-indigo-600 text-white border-[#0B2740]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {e.full_name} ({e.employee_id}){e.role === 'admin' ? ' · HR' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={selected.size === 0}>Schedule & notify</Button>
              {msg && <span className={`text-sm ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</span>}
            </div>
          </form>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {meetings.map((m) => (
          <Card key={m.id} className={justSeen.has(m.id) ? '!border-[#4CC2FF]/50 !bg-[#EAF4FB]/40' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display font-semibold text-slate-900">
                  {m.title}
                  {m.seen === false && <Badge color="indigo">NEW</Badge>}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  <Calendar size={13} className="inline -mt-0.5" /> {fmtDate(m.meeting_date)} · <Clock size={13} className="inline -mt-0.5" /> {m.meeting_time}
                  {m.place ? ` · MapPin` : ''}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={async () => {
                    await api(`/meetings/${m.id}`, { method: 'DELETE' })
                    load()
                  }}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
            {m.agenda && <p className="text-sm text-slate-600 mt-2 flex items-start gap-1.5"><FileText size={14} className="mt-0.5 shrink-0 text-slate-400" />{m.agenda}</p>}
            {m.meeting_attendees && m.meeting_attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {m.meeting_attendees.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600">
                    {a.profiles?.full_name || 'Unknown'}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
        {meetings.length === 0 && (
          <Card><p className="text-sm text-slate-400">
            {isAdmin ? 'No meetings scheduled yet.' : 'No meetings invite you yet — you will be notified here when one is.'}
          </p></Card>
        )}
      </div>
    </div>
  )
}
