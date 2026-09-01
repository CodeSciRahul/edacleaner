import { useId } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import { useAuthSubmit, type AuthMode } from '@/features/auth/hooks/useAuthSubmit'

export type { AuthMode }

export interface AuthFormProps {
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onAuthenticated?: (session: AuthSessionSnapshot) => void
  defaultMode?: AuthMode
  className?: string
}

export function AuthForm({
  onLogin,
  onRegister,
  onAuthenticated,
  defaultMode = 'login',
  className
}: AuthFormProps): React.ReactElement {
  const { t } = useTranslation()
  const formId = useId()
  const {
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
    backToCredentials
  } = useAuthSubmit({ onLogin, onRegister, onAuthenticated, defaultMode })

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-card', className)}>
      <div className="grid grid-cols-2 border-b border-border bg-muted/20 p-1">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={cn(
            'rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
            'rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            mode === 'register'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('auth.tab.register')}
        </button>
      </div>

      <form
        id={formId}
        className="space-y-3.5 p-5"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            {step === 'otp'
              ? t('auth.otp.heading')
              : mode === 'login'
                ? t('auth.login.title')
                : t('auth.register.title')}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {step === 'otp'
              ? t('auth.otp.body')
              : step === 'password'
                ? t('auth.login.passwordStep')
                : mode === 'login'
                  ? t('auth.login.description')
                  : t('auth.register.description')}
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

        {mode === 'register' || step === 'email' ? (
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
        ) : (
          <p className="text-xs text-muted-foreground">{email}</p>
        )}

        {step === 'otp' ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">{t('auth.otp.placeholder')}</span>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('auth.otp.placeholder')}
              className="text-center tracking-[0.35em]"
              disabled={submitting}
            />
          </label>
        ) : null}

        {mode === 'register' || step === 'password' ? (
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
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        ) : null}

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

        {notice && !error ? (
          <p
            role="status"
            className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground"
          >
            {notice}
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {submitting
            ? t('auth.submitting')
            : step === 'otp'
              ? t('auth.otp.submit')
              : mode === 'register'
                ? t('auth.register.submit')
                : step === 'password'
                  ? t('auth.login.submit')
                  : t('auth.login.continue')}
        </Button>
        {step === 'otp' ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1"
              disabled={submitting}
              onClick={() => void resendOtp()}
            >
              {t('auth.otp.resend')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 flex-1"
              disabled={submitting}
              onClick={backToCredentials}
            >
              {t('auth.otp.changeEmail')}
            </Button>
          </div>
        ) : step === 'password' ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full"
            disabled={submitting}
            onClick={backToCredentials}
          >
            {t('auth.otp.changeEmail')}
          </Button>
        ) : null}
      </form>
    </div>
  )
}
