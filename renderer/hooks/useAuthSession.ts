import { useCallback, useEffect, useState } from 'react'
import {
  authService,
  type AuthCredentials,
  type AuthSessionSnapshot
} from '@/services/auth-service'

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface UseAuthSessionResult {
  status: AuthSessionStatus
  session: AuthSessionSnapshot | null
  login: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  register: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  logout: () => Promise<AuthSessionSnapshot>
  refreshSession: () => Promise<void>
}

/**
 * Restores the cached auth session on launch and keeps renderer state in sync
 * with main-process session changes (login, logout, refresh expiry, etc.).
 */
export function useAuthSession(): UseAuthSessionResult {
  const [status, setStatus] = useState<AuthSessionStatus>('loading')
  const [session, setSession] = useState<AuthSessionSnapshot | null>(null)

  const applySession = useCallback((next: AuthSessionSnapshot) => {
    setSession(next)
    setStatus(next.authenticated ? 'authenticated' : 'unauthenticated')
  }, [])

  const refreshSession = useCallback(async () => {
    const next = await authService.getSession()
    applySession(next)
  }, [applySession])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const next = await authService.getSession()
        if (!cancelled) applySession(next)
      } catch {
        if (!cancelled) {
          setSession(null)
          setStatus('unauthenticated')
        }
      }
    })()

    const unsubscribe = authService.onSessionChanged((event) => {
      applySession(event.session)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [applySession])

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      const next = await authService.login(credentials)
      applySession(next)
      return next
    },
    [applySession]
  )

  const register = useCallback(
    async (credentials: AuthCredentials) => {
      const next = await authService.register(credentials)
      applySession(next)
      return next
    },
    [applySession]
  )

  const logout = useCallback(async () => {
    const next = await authService.logout()
    applySession(next)
    return next
  }, [applySession])

  return {
    status,
    session,
    login,
    register,
    logout,
    refreshSession
  }
}
