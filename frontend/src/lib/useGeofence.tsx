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
 * Polls the employee's GPS position every 75s while the tab is visible
 * and reports it to the backend, which runs the geofence exit logic.
 */
export function useGeofence(enabled: boolean, intervalMs = 75000) {
  const [gf, setGf] = useState<GeofenceState>({ state: 'no_data' })
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    const ping = async (lat: number, lng: number) => {
      try {
        const res = await api<GeofenceState>('/attendance/geofence-ping', {
          method: 'POST',
          body: JSON.stringify({ lat, lng }),
        })
        setGf(res)
      } catch (e: any) {
        setGf({ state: 'no_data', error: e.message })
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

    locate()
    timer.current = window.setInterval(locate, intervalMs)
    const onVisible = () => { if (!document.hidden) locate() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (timer.current) clearInterval(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, intervalMs])

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
