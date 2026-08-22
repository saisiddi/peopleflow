import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_URL } from '../lib/supabase'
import { Button, Input, Select } from '../components/ui'

export default function Auth() {
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
          ? 'Please verify your email first — check your inbox for the verification link.'
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 grid place-items-center text-white text-2xl font-bold mx-auto">D</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">Dayflow</h1>
          <p className="text-slate-500 text-sm">Every workday, perfectly aligned.</p>
        </div>
        <form onSubmit={mode === 'signin' ? signIn : signUp} className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signin' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Sign In</button>
            <button type="button" onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signup' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Sign Up</button>
          </div>

          {mode === 'signup' && (
            <>
              <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <Input placeholder="Employee ID (e.g. EMP-001)" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="employee">Employee</option>
                <option value="admin">Admin / HR</option>
              </Select>
              {role === 'admin' && (
                <Input
                  placeholder="Admin signup code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  required
                />
              )}
            </>
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
          {verifyUrl && (
            <div className="text-sm text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 space-y-1">
              <p>✓ Account created — <strong>verify your email</strong>, then sign in.</p>
              <a href={verifyUrl} className="underline font-medium">Open verification link →</a>
            </div>
          )}
          {mode === 'signup' && !verifyUrl && !error && (
            <p className="text-xs text-slate-400">After signup you'll receive a verification email before you can sign in.</p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px bg-slate-200 flex-1" />
            or
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  )
}
