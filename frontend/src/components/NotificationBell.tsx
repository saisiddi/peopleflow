import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

type Meeting = {
  id: string; title: string; meeting_date: string; meeting_time: string
  place?: string; seen?: boolean
}

/** Header bell: lights up live (Supabase Realtime) when the signed-in
 *  employee is added to a meeting. Opening it marks notifications read.
 *  With permission granted, new invites also raise a native browser
 *  notification so the user hears about them with the tab in the background. */
export default function NotificationBell() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [open, setOpen] = useState(false)
  const [perm, setPerm] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const boxRef = useRef<HTMLDivElement>(null)
  const knownIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  const desktopNotify = (m: Meeting) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const when = `${new Date(m.meeting_date).toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short',
    })} · ${m.meeting_time}${m.place ? ` · ${m.place}` : ''}`
    const n = new Notification('📅 New meeting invite', { body: `${m.title}\n${when}`, tag: m.id })
    n.onclick = () => { window.focus(); n.close() }
  }

  const load = () =>
    api<Meeting[]>('/meetings/me')
      .then((ms) => {
        // only raise desktop notifications for invites that arrive AFTER first load
        if (initialized.current) {
          ms.filter((m) => !knownIds.current.has(m.id) && m.seen === false).forEach(desktopNotify)
        }
        ms.forEach((m) => knownIds.current.add(m.id))
        initialized.current = true
        setMeetings(ms)
      })
      .catch(() => {})
  useEffect(() => { load() }, [])

  const enableBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPerm(result)
  }

  // realtime: any change to my attendee rows (e.g. being added) refreshes the bell
  useEffect(() => {
    const channel = supabase
      .channel('meeting-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_attendees' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unseen = meetings.filter((m) => m.seen === false)

  const openBell = async () => {
    const next = !open
    setOpen(next)
    if (next && unseen.length > 0) {
      unseen.forEach((m) => api(`/meetings/${m.id}/seen`, { method: 'PATCH' }).catch(() => {}))
      setMeetings((ms) => ms.map((m) => ({ ...m, seen: true })))
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={openBell}
        className="relative w-9 h-9 rounded-xl hover:bg-slate-100 grid place-items-center text-lg"
        title="Meeting notifications"
      >
        🔔
        {unseen.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">
            {unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-slate-100 p-3 z-50">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 px-1 mb-2">
            Meeting notifications
          </p>
          {meetings.length === 0 ? (
            <p className="text-sm text-slate-400 px-1 py-2">No meetings yet.</p>
          ) : (
            <ul className="space-y-1">
              {meetings.slice(0, 6).map((m) => (
                <li key={m.id} className="px-2 py-2 rounded-xl hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-700">
                    {m.seen === false && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" />}
                    {m.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(m.meeting_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    {' · '}{m.meeting_time}{m.place ? ` · ${m.place}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {perm === 'default' && (
            <button
              onClick={enableBrowserNotifications}
              className="w-full mt-2 px-2 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition"
            >
              🔔 Enable browser notifications
            </button>
          )}
          {perm === 'denied' && (
            <p className="text-xs text-slate-400 px-1 mt-2">
              Browser notifications are blocked — allow them in your browser's site settings.
            </p>
          )}
          <Link to="/meetings" onClick={() => setOpen(false)}
            className="block text-center text-sm text-indigo-600 hover:underline mt-2 pt-2 border-t border-slate-50">
            View all meetings →
          </Link>
        </div>
      )}
    </div>
  )
}
