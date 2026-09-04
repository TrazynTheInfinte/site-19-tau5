import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { ensureSignedIn } from '../firebase/anonAuth'

interface AuthContextValue {
  uid: string | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextValue>({ uid: null, loading: true, error: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ensureSignedIn()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to sign in')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AuthContext.Provider value={{ uid: user?.uid ?? null, loading, error }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
