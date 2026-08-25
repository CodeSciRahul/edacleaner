import { useEffect, useState } from 'react'
import { electronService } from '@/services/electron-service'
import { authService } from '@/services/auth-service'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

export type AuthMode = 'login' | 'register'
export type AuthStep = 'email' | 'password' | 'otp'

function mapAuthError(message: string, t: (key: TranslationKey) => string): string {
  const lower = message.toLowerCase()
  if (lower.includes('offline') || lower.includes('network') || lower.includes('fetch')) {
    return t('auth.error.offline')
  }
  if (lower.includes('already exists') || lower.includes('conflict')) {
    return t('auth.error.conflict')
  }
  if (lower.includes('expired') && lower.includes('code')) {
    return t('auth.otp.expired')
  }
  if (lower.includes('verification code') || lower.includes('invalid code')) {
    return t('auth.otp.invalid')
  }
  if (lower.includes('wait a moment') || lower.includes('too many')) {
    return t('auth.otp.wait')
  }
  if (lower.includes('invalid email or password') || lower.includes('unauthorized')) {
    return t('auth.error.invalid')
  }
  if (lower.includes('failed to fetch') || lower.includes('econnrefused') || lower.includes('enotfound')) {
    return t('auth.error.network')
  }
  return message.trim() || t('auth.error.generic')
}

function isOtpChallenge(message: string): boolean {
  return message.includes('OTP_REQUIRED')
}

function isPasswordChallenge(message: string): boolean {
  return (
    message.includes('PASSWORD_REQUIRED') ||
    message.toLowerCase().includes('password is required')
  )
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
  const [step, setStep] = useState<AuthStep>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setMode(defaultMode)
    setStep('email')
    setPassword('')
    setOtp('')
    setError(null)
    setNotice(null)
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

  async function ensureOnline(): Promise<boolean> {
    try {
      const snapshot = await electronService.offline().checkNetwork()
      setOnline(snapshot.online)
      if (!snapshot.online) {
        setError(t('auth.error.offlineFirst'))
        return false
      }
    } catch {
      // Proceed — API layer will surface network errors.
    }
    return true
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError(t('auth.error.emailRequired'))
      return
    }

    if (mode === 'login' && step === 'otp') {
      if (!/^\d{6}$/.test(otp.trim())) {
        setError(t('auth.otp.invalid'))
        return
      }
      if (!(await ensureOnline())) return
      setSubmitting(true)
      try {
        const session = await authService.verifyLoginOtp(trimmedEmail, otp.trim())
        onAuthenticated?.(session)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(mapAuthError(message, t))
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (mode === 'login' && step === 'password') {
      if (!password) {
        setError(t('auth.error.passwordRequired'))
        return
      }
    }

    if (mode === 'register') {
      if (!password) {
        setError(t('auth.error.required'))
        return
      }
      if (password.length < 8) {
        setError(t('auth.error.passwordLength'))
        return
      }
    }

    if (!(await ensureOnline())) return

    setSubmitting(true)
    try {
      if (mode === 'login') {
        try {
          const session = await onLogin({
            email: trimmedEmail,
            ...(step === 'password' && password ? { password } : {})
          })
          onAuthenticated?.(session)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (isOtpChallenge(message)) {
            setStep('otp')
            setOtp('')
            setNotice(t('auth.otp.sent'))
            return
          }
          if (isPasswordChallenge(message)) {
            setStep('password')
            setPassword('')
            setNotice(null)
            return
          }
          setError(mapAuthError(message, t))
        }
        return
      }

      const session = await onRegister({
        email: trimmedEmail,
        password,
        ...(name.trim() ? { name: name.trim() } : {})
      })
      onAuthenticated?.(session)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(mapAuthError(message, t))
    } finally {
      setSubmitting(false)
    }
  }

  async function resendOtp(): Promise<void> {
    setError(null)
    if (!(await ensureOnline())) return
    setSubmitting(true)
    try {
      await authService.requestLoginOtp(email.trim())
      setNotice(t('auth.otp.sent'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(mapAuthError(message, t))
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: AuthMode): void {
    setMode(next)
    setStep('email')
    setError(null)
    setNotice(null)
    setPassword('')
    setOtp('')
  }

  function backToEmail(): void {
    setStep('email')
    setPassword('')
    setOtp('')
    setError(null)
    setNotice(null)
  }

  return {
    mode,
    step,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    otp,
    setOtp,
    showPassword,
    setShowPassword,
    submitting,
    error,
    notice,
    online,
    handleSubmit,
    switchMode,
    resendOtp,
    backToCredentials: backToEmail
  }
}
