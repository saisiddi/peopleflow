import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../lib/api'
import { Card, Button, Input } from '../components/ui'

type Pos = { lat: number; lng: number }
type SearchHit = { display_name: string; lat: string; lon: string }

export default function Geofence() {
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const circle = useRef<L.Circle | null>(null)

  const [pos, setPos] = useState<Pos | null>(null)
  const [radius, setRadius] = useState(150)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // load current office location
  useEffect(() => {
    api<any>('/office-location')
      .then((o) => {
        setPos({ lat: o.lat, lng: o.lng })
        setRadius(o.radius_meters)
      })
      .catch(() => setMsg('Could not load current office location'))
  }, [])

  // init map once coordinates arrive
  useEffect(() => {
    if (!pos || !mapEl.current || map.current) return
    const m = L.map(mapEl.current).setView([pos.lat, pos.lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(m)
    marker.current = L.marker([pos.lat, pos.lng], { draggable: true }).addTo(m)
    circle.current = L.circle([pos.lat, pos.lng], {
      radius,
      color: '#4f46e5',
      weight: 2,
      fillColor: '#6366f1',
      fillOpacity: 0.12,
    }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => setPos({ lat: e.latlng.lat, lng: e.latlng.lng }))
    marker.current.on('dragend', () => {
      const p = marker.current!.getLatLng()
      setPos({ lat: p.lat, lng: p.lng })
    })
    map.current = m
  }, [pos !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  // keep marker + circle in sync
  useEffect(() => {
    if (!map.current || !pos) return
    marker.current?.setLatLng([pos.lat, pos.lng])
    circle.current?.setLatLng([pos.lat, pos.lng])
    map.current.panTo([pos.lat, pos.lng])
  }, [pos?.lat, pos?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    circle.current?.setRadius(radius)
  }, [radius])

  const search = async () => {
    if (!q.trim()) return
    setBusy(true); setMsg(''); setHits([])
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const found: SearchHit[] = await res.json()
      setHits(found)
      if (found.length === 0) setMsg('No results — try a more specific name')
    } catch {
      setMsg('Search failed — check your connection')
    }
    setBusy(false)
  }

  const save = async () => {
    if (!pos) return
    setBusy(true); setMsg('')
    try {
      await api('/office-location', {
        method: 'PATCH',
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng, radius_meters: radius }),
      })
      setMsg('✓ Geofence saved — employee exits are now tracked against this location')
    } catch (e: any) {
      setMsg(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Office Geofence</h1>
        <p className="text-slate-500 text-sm">
          Search your company, drag or click to fine-tune the pin, adjust the radius, then save.
          Employees' exit detection uses this circle.
        </p>
      </div>

      <Card>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Search a place — e.g. Infosys Mysuru, MG Road Bangalore…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={busy}>Search</Button>
        </div>
        {hits.length > 0 && (
          <ul className="mb-3 border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-36 overflow-auto">
            {hits.map((h, i) => (
              <li key={i}>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition"
                  onClick={() => {
                    setPos({ lat: parseFloat(h.lat), lng: parseFloat(h.lon) })
                    setHits([])
                    setQ(h.display_name.split(',')[0])
                  }}
                >
                  {h.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div ref={mapEl} className="h-[420px] rounded-xl overflow-hidden z-0" />

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Radius</label>
              <span className="text-sm font-semibold text-indigo-600">{radius} m</span>
            </div>
            <input
              type="range" min={50} max={1000} step={10} value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400"><span>50 m</span><span>1000 m</span></div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 font-mono">
              {pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : '…'}
            </div>
            <Button onClick={save} disabled={busy || !pos}>Save geofence</Button>
            {msg && <span className={`text-sm ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}
