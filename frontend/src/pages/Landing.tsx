import { useEffect, useState } from 'react'
import {
  Radar, Bell, CalendarCheck, Wallet, BarChart3, ShieldCheck,
  MapPin, Timer, CheckCircle2, ChevronDown, GitBranch, ArrowRight, Waves,
} from 'lucide-react'
import { supabase, API_URL } from '../lib/supabase'
import { Input, Select } from '../components/ui'
import WaveLogo from '../components/WaveLogo'

/* ————————————————— auth card (embedded in hero) ————————————————— */

function AuthCard() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [role, setRole] = useState('employee')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState('')

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error)
      setError(
        error.message.toLowerCase().includes('email not confirmed')
          ? 'Verify your email first — check your inbox for the link.'
          : error.message
      )
    setBusy(false)
  }

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setVerifyUrl('')
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, employee_id: employeeId, role, admin_code: adminCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Signup failed')
      setVerifyUrl(data.verify_url || '')
    } catch (err: any) {
      setError(err.message)
    }
    setBusy(false)
  }

  const signInWithGoogle = async () => {
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div id="signin" className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40">
      <div className="flex rounded-2xl bg-white/5 p-1 mb-5">
        <button type="button" onClick={() => setMode('signin')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${mode === 'signin' ? 'bg-[#4CC2FF] text-[#061524]' : 'text-[#9FB8C8] hover:text-white'}`}>
          Sign in
        </button>
        <button type="button" onClick={() => setMode('signup')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${mode === 'signup' ? 'bg-[#4CC2FF] text-[#061524]' : 'text-[#9FB8C8] hover:text-white'}`}>
          Create account
        </button>
      </div>

      <form onSubmit={mode === 'signin' ? signIn : signUp} className="space-y-3">
        {mode === 'signup' && (
          <>
            <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-[#9FB8C8]/60" required />
            <Input placeholder="Employee ID (e.g. EMP-001)" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="!bg-white/5 !border-white/10 !text-white placeholder:!text-[#9FB8C8]/60" required />
            <Select value={role} onChange={(e) => setRole(e.target.value)}
              className="!bg-white/5 !border-white/10 !text-white [&>option]:text-slate-800">
              <option value="employee">Employee</option>
              <option value="admin">Admin / HR</option>
            </Select>
            {role === 'admin' && (
              <Input placeholder="Admin signup code" value={adminCode} onChange={(e) => setAdminCode(e.target.value)}
                className="!bg-white/5 !border-white/10 !text-white placeholder:!text-[#9FB8C8]/60" required />
            )}
          </>
        )}
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="!bg-white/5 !border-white/10 !text-white placeholder:!text-[#9FB8C8]/60" required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="!bg-white/5 !border-white/10 !text-white placeholder:!text-[#9FB8C8]/60" required minLength={6} />

        {error && <p className="text-sm text-[#FF8A7E] bg-[#FF6B5E]/10 rounded-xl px-3 py-2">{error}</p>}
        {verifyUrl && (
          <div className="text-sm text-[#4CC2FF] bg-[#4CC2FF]/10 rounded-xl px-3 py-2 space-y-1">
            <p>Account created — <strong>verify your email</strong>, then sign in.</p>
            <a href={verifyUrl} className="underline font-semibold">Open verification link →</a>
          </div>
        )}

        <button type="submit" disabled={busy}
          className="w-full py-3 rounded-2xl bg-[#4CC2FF] text-[#061524] text-sm font-bold hover:bg-[#6ECFFF] transition disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in to Dayflow' : 'Create my account'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-4 text-xs text-[#9FB8C8]">
        <div className="h-px bg-white/10 flex-1" /> or <div className="h-px bg-white/10 flex-1" />
      </div>

      <button type="button" onClick={signInWithGoogle} disabled={busy}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white text-[#061524] text-sm font-semibold hover:bg-white/90 transition disabled:opacity-50">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>
    </div>
  )
}

/* ————————————————— live presence demo (hero signature) ————————————————— */

const DEMO_STEPS = [
  { label: '412 m from office', tone: 'text-[#9FB8C8]' },
  { label: 'Entering radius…', tone: 'text-[#F6C177]' },
  { label: 'Checked in · 09:02 — no button pressed', tone: 'text-[#4CC2FF]' },
]

function PresenceDemo() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % DEMO_STEPS.length), 2300)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Radar size={15} className="text-[#4CC2FF]" />
        <span className="font-data text-[10px] uppercase tracking-[0.2em] text-[#9FB8C8]">Live engine · simulated</span>
      </div>
      <div className="relative h-24">
        {/* geofence */}
        <div className="absolute left-[52%] top-[8%] w-28 h-28 -translate-x-1/2 rounded-full border-2 border-dashed border-[#4CC2FF]/40" />
        <div className="absolute left-[52%] top-[54%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <MapPin size={16} className="text-white/70" />
        </div>
        {/* travelling GPS dot */}
        <div className="presence-dot absolute w-3 h-3">
          <span className="absolute inset-0 rounded-full bg-[#4CC2FF] shadow-[0_0_12px_#4CC2FF]" />
          <span className="ripple absolute inset-0 rounded-full border border-[#4CC2FF]" />
        </div>
      </div>
      <p className={`font-data text-xs transition-colors duration-500 ${DEMO_STEPS[step].tone}`}>
        {DEMO_STEPS[step].label}
      </p>
    </div>
  )
}

/* ————————————————— wave divider ————————————————— */

function WaveDivider() {
  const path =
    'M0,64 C240,120 480,8 720,48 C960,88 1200,40 1440,64 L1440,120 L0,120 Z'
  return (
    <div className="relative h-28 overflow-hidden" aria-hidden="true">
      <div className="wave-a absolute inset-y-0 flex w-[200%]">
        {[0, 1].map((i) => (
          <svg key={i} viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-full w-1/2 shrink-0">
            <path d={path} fill="#0B2740" opacity="0.55" />
          </svg>
        ))}
      </div>
      <div className="wave-b absolute inset-y-0 flex w-[200%]">
        {[0, 1].map((i) => (
          <svg key={i} viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-full w-1/2 shrink-0">
            <path d={path} fill="#061524" />
          </svg>
        ))}
      </div>
    </div>
  )
}

/* ————————————————— landing ————————————————— */

const FEATURES = [
  { icon: Radar, title: 'Geofence attendance', body: 'Arriving inside the office radius checks you in. Leaving — after a 15-minute grace window — checks you out. Half-days computed automatically.' },
  { icon: Bell, title: 'Three-channel alerts', body: 'Meeting invites and leave decisions reach people through the in-app bell, native browser notifications, and real email.' },
  { icon: CalendarCheck, title: 'Realtime leave flow', body: 'Apply, approve, done. Status changes land on the employee screen without a refresh — and attendance stays in sync, both ways.' },
  { icon: Wallet, title: 'Payroll & payslips', body: 'Salary structures with live net computation and one-click printable payslips. Employees see their own, read-only.' },
  { icon: BarChart3, title: 'Reports that answer', body: 'Monthly attendance rates, per-employee breakdowns, approved leave days — exportable to CSV in one click.' },
  { icon: ShieldCheck, title: 'Security in depth', body: 'Row-Level Security in Postgres: an employee token cannot read another employee row. Role gates at UI, API and database.' },
]

const STEPS = [
  { icon: MapPin, title: 'Arrive', body: 'The employee\u2019s device is detected inside the office geofence. Dayflow writes the check-in — nobody touches anything.' },
  { icon: Timer, title: 'Leave', body: 'The GPS trail exits the radius. A 15-minute grace window filters out lunch runs and parking-lot walks.' },
  { icon: CheckCircle2, title: 'Recorded', body: 'The exit finalizes — server-side, even if the tab closed. Under four worked hours marks a half-day.' },
]

export default function Landing() {
  return (
    <div className="font-body bg-[#061524] text-white min-h-screen">
      {/* nav */}
      <header className="max-w-6xl mx-auto px-5 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <WaveLogo size={34} />
          <span className="font-display font-bold text-lg tracking-tight">Dayflow</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-[#9FB8C8]">
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#security" className="hover:text-white transition">Security</a>
        </nav>
        <a href="#signin"
          className="px-4 py-2 rounded-xl bg-[#4CC2FF] text-[#061524] text-sm font-bold hover:bg-[#6ECFFF] transition">
          Sign in
        </a>
      </header>

      {/* hero */}
      <section className="relative max-w-6xl mx-auto px-5 pt-10 pb-6 lg:pt-16">
        <div className="grid lg:grid-cols-[1.15fr_420px] gap-10 items-center">
          <div>
            <p className="font-data text-[11px] uppercase tracking-[0.3em] text-[#4CC2FF] mb-5">
              GPS-native HRMS
            </p>
            <h1 className="font-display font-extrabold text-5xl sm:text-6xl leading-[1.04] tracking-tight">
              Attendance<br />that <span className="text-[#4CC2FF]">flows.</span>
            </h1>
            <p className="mt-6 text-lg text-[#9FB8C8] max-w-lg leading-relaxed">
              Dayflow checks people in when they arrive and out when they leave — by GPS.
              No kiosks. No fingerprint queues. No forgotten buttons.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#signin"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#4CC2FF] text-[#061524] font-bold text-sm hover:bg-[#6ECFFF] transition">
                Try the live demo <ArrowRight size={16} />
              </a>
              <a href="#how" className="inline-flex items-center gap-2 text-sm font-semibold text-[#9FB8C8] hover:text-white transition">
                See how it works <ChevronDown size={16} className="scroll-cue" />
              </a>
            </div>
            <div className="mt-10 max-w-md">
              <PresenceDemo />
            </div>
          </div>
          <div className="float-y">
            <AuthCard />
          </div>
        </div>
      </section>

      <WaveDivider />

      {/* how it works */}
      <section id="how" className="bg-[#061524] text-white">
        <div className="max-w-6xl mx-auto px-5 pb-20">
          <p className="font-data text-[11px] uppercase tracking-[0.3em] text-[#4CC2FF]">The sequence</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 tracking-tight">Three beats. Zero touches.</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-[#4CC2FF]/10 border border-[#4CC2FF]/20 grid place-items-center">
                    <s.icon size={20} className="text-[#4CC2FF]" />
                  </div>
                  <span className="font-data text-xs text-[#9FB8C8]/60">0{i + 1}</span>
                </div>
                <h3 className="font-display font-semibold text-lg mt-4">{s.title}</h3>
                <p className="text-sm text-[#9FB8C8] leading-relaxed mt-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="bg-[#F4F9FC] text-[#061524]">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <p className="font-data text-[11px] uppercase tracking-[0.3em] text-[#0B2740]/60">Everything else an HRMS owes you</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 tracking-tight">The flow continues past the door.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-[#0B2740]/10 bg-white p-6 hover:shadow-lg hover:shadow-[#0B2740]/5 hover:-translate-y-0.5 transition">
                <div className="w-11 h-11 rounded-2xl bg-[#061524] grid place-items-center">
                  <f.icon size={20} className="text-[#4CC2FF]" />
                </div>
                <h3 className="font-display font-semibold text-lg mt-4">{f.title}</h3>
                <p className="text-sm text-[#0B2740]/70 leading-relaxed mt-2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* security */}
      <section id="security" className="bg-[#0B2740] text-white">
        <div className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <div>
            <p className="font-data text-[11px] uppercase tracking-[0.3em] text-[#4CC2FF]">Security</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 tracking-tight">Private by the database, not by promise.</h2>
          </div>
          <div className="space-y-4 text-sm text-[#9FB8C8] leading-relaxed">
            <p>Row-Level Security runs inside Postgres: an employee’s token cannot read another employee’s attendance, leave or payroll — even with direct API access.</p>
            <p>Admin privileges are gated three times — in the interface, in the API, and in the database — and earning the HR role requires a secret signup code.</p>
            <p>Every sign-in validates a Supabase JWT server-side. The service key never leaves the backend.</p>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="bg-[#061524] text-white border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <WaveLogo size={26} />
            <span className="font-display font-semibold">Dayflow</span>
            <span className="text-[#9FB8C8] text-sm">· every workday, perfectly aligned</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-[#9FB8C8]">
            <span className="inline-flex items-center gap-1.5"><Waves size={14} className="text-[#4CC2FF]" /> Built overnight, verified live</span>
            <a href="https://github.com/saisiddi/peopleflow" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition">
              <GitBranch size={15} /> peopleflow
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
