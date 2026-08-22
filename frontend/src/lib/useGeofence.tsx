import { useEffect, useRef, useState } from 'react'
import { api } from './api'

export type GeofenceState = {
  state: 'not_checked_in' | 'present' | 'pending_exit' | 'checked_out' | 'no_data'
  distance_m?: number
  confirm_by?: string
  exit_time?: string
  error?: string
}

/**
 * Polls the employee's GPS position while the tab is visible and reports it
 * to the backend, which runs the geofence exit logic. Polls faster (25s)
 * while a pending exit is being confirmed so a "returned inside" reading
 * cancels it promptly — and a real exit finalizes without waiting a full cycle.
 */
export function useGeofence(enabled: boolean) {
  const [gf, setGf] = useState<GeofenceState>({ state: 'no_data' })
  const stateRef = useRef<GeofenceState>({ state: 'no_data' })
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    const ping = async (lat: number, lng: number) => {
      try {
        const res = await api<GeofenceState>('/attendance/geofence-ping', {
          method: 'POST',
          body: JSON.stringify({ lat, lng }),
        })
        stateRef.current = res
        setGf(res)
      } catch (e: any) {
        stateRef.current = { state: 'no_data', error: e.message }
        setGf(stateRef.current)
      }
    }

    const locate = () => {
      if (document.hidden) return // only while tab is foregrounded (honest web constraint)
      navigator.geolocation.getCurrentPosition(
        (pos) => ping(pos.coords.latitude, pos.coords.longitude),
        (err) => setGf({ state: 'no_data', error: err.message }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      )
    }

    const schedule = () => {
      const delay = stateRef.current.state === 'pending_exit' ? 25000 : 75000
      timer.current = window.setTimeout(() => { locate(); schedule() }, delay)
    }
    locate()
    schedule()
    const onVisible = () => { if (!document.hidden) locate() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return gf
}

export function GeofenceIndicator({ gf }: { gf: GeofenceState }) {
  const cfg: Record<string, [string, string, string]> = {
    present: ['bg-emerald-500', 'Present (in office)', 'text-emerald-700'],
    pending_exit: ['bg-amber-400 animate-pulse', 'Pending exit (left geofence, confirming…)', 'text-amber-700'],
    checked_out: ['bg-slate-400', `Checked out${gf.exit_time ? ' at ' + new Date(gf.exit_time).toLocaleTimeString() : ''}`, 'text-slate-600'],
    not_checked_in: ['bg-slate-300', 'Not checked in', 'text-slate-500'],
    no_data: ['bg-slate-300', 'Waiting for GPS…', 'text-slate-500'],
  }
  const [dot, label, text] = cfg[gf.state] || cfg.no_data
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${dot}`} />
      <span className={`text-sm font-medium ${text}`}>{label}</span>
      {gf.distance_m !== undefined && (
        <span className="text-xs text-slate-400">{gf.distance_m} m from office</span>
      )}
    </div>
  )
}
