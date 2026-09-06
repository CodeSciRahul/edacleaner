import { useEffect, useState } from 'react'
import { electronService } from '@/services/electron-service'
import { authService } from '@/services/auth-service'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { isPlausibleEmail, normalizeEmailInput } from '@shared/utils'

export type AuthMode = 'login' | 'register'
export type AuthStep = 'credentials' | 'password' | 'otp' | 'forgot' | 'reset'
export type OtpContext = 'login' | 'register' | 'reset'

const OTP_RESEND_SECONDS = 60

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

function otpContextFromMessage(message: string): OtpContext {
  if (message.includes('OTP_REQUIRED:register')) return 'register'
  if (message.includes('OTP_REQUIRED:reset')) return 'reset'
  return 'login'
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
  const [step, setStep] = useState<AuthStep>('credentials')
  const [otpContext, setOtpContext] = useState<OtpContext>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    setMode(defaultMode)
    setStep('credentials')
    setOtpContext(defaultMode === 'register' ? 'register' : 'login')
    setPassword('')
    setOtp('')
    setError(null)
    setNotice(null)
    setResendSeconds(0)
  }, [defaultMode])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setTimeout(() => {
      setResendSeconds((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

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

  function startOtpCooldown(): void {
    setResendSeconds(OTP_RESEND_SECONDS)
  }

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

    const trimmedEmail = normalizeEmailInput(email)
    if (!trimmedEmail) {
      setError(t('auth.error.emailRequired'))
      return
    }
    if (!isPlausibleEmail(trimmedEmail)) {
      setError(t('auth.error.invalid'))
      return
    }

    if (step === 'forgot') {
      if (!(await ensureOnline())) return
      setSubmitting(true)
      try {
        await authService.forgotPassword(trimmedEmail)
        setOtpContext('reset')
        setStep('otp')
        setOtp('')
        setPassword('')
        setNotice(t('auth.otp.sent'))
        startOtpCooldown()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(mapAuthError(message, t))
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (step === 'otp' && otpContext === 'reset') {
      if (!/^\d{6}$/.test(otp.trim())) {
        setError(t('auth.otp.invalid'))
        return
      }
      setStep('reset')
      setPassword('')
      setNotice(t('auth.reset.codeAccepted'))
      return
    }

    if (step === 'reset') {
      if (!password) {
        setError(t('auth.error.passwordRequired'))
        return
      }
      if (password.length < 8) {
        setError(t('auth.error.passwordLength'))
        return
      }
      if (!/^\d{6}$/.test(otp.trim())) {
        setError(t('auth.otp.invalid'))
        return
      }
      if (!(await ensureOnline())) return
      setSubmitting(true)
      try {
        const session = await authService.resetPassword({
          email: trimmedEmail,
          code: otp.trim(),
          password
        })
        onAuthenticated?.(session)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(mapAuthError(message, t))
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (step === 'otp') {
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

    if (mode === 'register' && step === 'credentials') {
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
            setOtpContext(otpContextFromMessage(message))
            setStep('otp')
            setOtp('')
            setNotice(t('auth.otp.sent'))
            startOtpCooldown()
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

      try {
        const session = await onRegister({
          email: trimmedEmail,
          password,
          ...(name.trim() ? { name: name.trim() } : {})
        })
        onAuthenticated?.(session)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (isOtpChallenge(message)) {
          setOtpContext(otpContextFromMessage(message))
          setStep('otp')
          setOtp('')
          setNotice(t('auth.otp.sent'))
          startOtpCooldown()
          return
        }
        setError(mapAuthError(message, t))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(mapAuthError(message, t))
    } finally {
      setSubmitting(false)
    }
  }

  async function resendOtp(): Promise<void> {
    if (resendSeconds > 0) return
    setError(null)
    if (!(await ensureOnline())) return
    setSubmitting(true)
    try {
      const trimmedEmail = normalizeEmailInput(email)
      if (otpContext === 'reset') {
        await authService.forgotPassword(trimmedEmail)
      } else {
        await authService.requestLoginOtp(trimmedEmail)
      }
      setNotice(t('auth.otp.sent'))
      startOtpCooldown()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(mapAuthError(message, t))
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: AuthMode): void {
    setMode(next)
    setStep('credentials')
    setOtpContext(next === 'register' ? 'register' : 'login')
    setError(null)
    setNotice(null)
    setPassword('')
    setOtp('')
    setResendSeconds(0)
  }

  function startForgotPassword(): void {
    setMode('login')
    setStep('forgot')
    setOtpContext('reset')
    setPassword('')
    setOtp('')
    setError(null)
    setNotice(null)
    setResendSeconds(0)
  }

  function backToCredentials(): void {
    setStep('credentials')
    setOtpContext(mode === 'register' ? 'register' : 'login')
    setPassword('')
    setOtp('')
    setError(null)
    setNotice(null)
    setResendSeconds(0)
  }

  return {
    mode,
    step,
    otpContext,
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
    resendSeconds,
    canResendOtp: resendSeconds <= 0,
    handleSubmit,
    switchMode,
    resendOtp,
    startForgotPassword,
    backToCredentials
  }
}
