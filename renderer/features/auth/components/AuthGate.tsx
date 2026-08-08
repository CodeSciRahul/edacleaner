import { useEffect, useId, useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { APP_NAME } from '@shared/constants'
import { electronService } from '@/services/electron-service'
import type { AuthCredentials } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { cn } from '@/utils/cn'

type AuthMode = 'login' | 'register'

interface AuthGateProps {
  onLogin: (credentials: AuthCredentials) => Promise<unknown>
  onRegister: (credentials: AuthCredentials) => Promise<unknown>
}

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

export function AuthGate({ onLogin, onRegister }: AuthGateProps): React.ReactElement {
  const { t } = useTranslation()
  const formId = useId()
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

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

      if (mode === 'login') {
        await onLogin(credentials)
      } else {
        await onRegister(credentials)
      }
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

  return (
    <div
      className="flex h-full min-h-0 w-full items-center justify-center overflow-auto bg-background p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-background to-background',
          'pointer-events-none'
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h1 id={`${formId}-title`} className="text-2xl font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('auth.subtitle')}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="grid grid-cols-2 border-b border-border bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={cn(
                'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                mode === 'login'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('auth.tab.login')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={cn(
                'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                mode === 'register'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('auth.tab.register')}
            </button>
          </div>

          <form className="space-y-4 p-5 sm:p-6" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {mode === 'login' ? t('auth.login.description') : t('auth.register.description')}
              </p>
            </div>

            {mode === 'register' ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">{t('auth.field.name')}</span>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.placeholder.name')}
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">{t('auth.field.email')}</span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.placeholder.email')}
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">{t('auth.field.password')}</span>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.placeholder.password')}
                  className="pl-9 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {mode === 'register' ? (
                <p className="text-[11px] text-muted-foreground">{t('auth.passwordHint')}</p>
              ) : null}
            </label>

            {mode === 'register' ? (
              <p className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {t('auth.register.freePlan')}
              </p>
            ) : null}

            {!online ? (
              <p
                role="status"
                className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              >
                {t('auth.offlineBanner')}
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-10 w-full gap-2" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {submitting
                ? t('auth.submitting')
                : mode === 'login'
                  ? t('auth.login.submit')
                  : t('auth.register.submit')}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t('auth.requiredNotice')}
        </p>
      </div>
    </div>
  )
}

export function AuthBootScreen(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 bg-background p-6">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t('auth.booting')}</p>
    </div>
  )
}
