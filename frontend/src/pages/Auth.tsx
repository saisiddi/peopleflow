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
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, employee_id: employeeId, role }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Signup failed')
      await supabase.auth.signInWithPassword({ email, password })
    } catch (err: any) {
      setError(err.message)
    }
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
            </>
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </div>
    </div>
  )
}
