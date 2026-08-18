import { useEffect, useState } from 'react'
import { electronService } from '@/services/electron-service'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

export type AuthMode = 'login' | 'register'

function mapAuthError(message: string, t: (key: TranslationKey) => string): string {
  const lower = message.toLowerCase()
  if (lower.includes('offline') || lower.includes('network') || lower.includes('fetch')) {
    return t('auth.error.offline')
  }
  if (lower.includes('already exists') || lower.includes('conflict')) {
    return t('auth.error.conflict')
  }
  if (lower.includes('invalid email or password') || lower.includes('unauthorized')) {
    return t('auth.error.invalid')
  }
  if (lower.includes('failed to fetch') || lower.includes('econnrefused') || lower.includes('enotfound')) {
    return t('auth.error.network')
  }
  return message.trim() || t('auth.error.generic')
}

export interface UseAuthSubmitOptions {
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onAuthenticated?: (session: AuthSessionSnapshot) => void
  defaultMode?: AuthMode
}

export function useAuthSubmit({
  onLogin,
  onRegister,
  onAuthenticated,
  defaultMode = 'login'
}: UseAuthSubmitOptions) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const snapshot = await electronService.offline().checkNetwork()
        if (!cancelled) setOnline(snapshot.online)
      } catch {
        if (!cancelled) setOnline(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError(t('auth.error.required'))
      return
    }

    if (mode === 'register' && password.length < 8) {
      setError(t('auth.error.passwordLength'))
      return
    }

    try {
      const snapshot = await electronService.offline().checkNetwork()
      setOnline(snapshot.online)
      if (!snapshot.online) {
        setError(t('auth.error.offlineFirst'))
        return
      }
    } catch {
      // Proceed — API layer will surface network errors.
    }

    setSubmitting(true)
    try {
      const credentials: AuthCredentials = {
        email: trimmedEmail,
        password,
        ...(mode === 'register' && name.trim() ? { name: name.trim() } : {})
      }

      const session =
        mode === 'login' ? await onLogin(credentials) : await onRegister(credentials)
      onAuthenticated?.(session)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(mapAuthError(message, t))
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: AuthMode): void {
    setMode(next)
    setError(null)
    setPassword('')
  }

  return {
    mode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    submitting,
    error,
    online,
    handleSubmit,
    switchMode
  }
}
