import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import { api } from './api'

export type Profile = {
  id: string
  employee_id: string
  full_name: string
  email: string
  role: 'employee' | 'admin'
  phone?: string
  address?: string
  profile_picture_url?: string
  job_title?: string
  department?: string
  date_joined?: string
}

type AuthState = {
  profile: Profile | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState>(null as any)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const p = await api<Profile>('/profiles/me')
      setProfile(p)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) refresh()
      else setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') setProfile(null)
      else if (evt === 'SIGNED_IN') refresh()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <Ctx.Provider value={{ profile, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  )
}
