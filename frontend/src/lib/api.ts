import { supabase, API_URL } from './supabase'

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ''
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      msg = (await res.json()).detail || msg
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}
