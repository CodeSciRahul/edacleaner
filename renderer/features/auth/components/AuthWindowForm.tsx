import { useId, useState } from 'react'
import { Eye, EyeOff, Gauge, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import appIcon from '@/assets/app logo/App Icon1.svg'
import { useAuthSubmit } from '@/features/auth/hooks/useAuthSubmit'

export interface AuthWindowFormProps {
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onAuthenticated?: (session: AuthSessionSnapshot) => void
  defaultMode?: 'login' | 'register'
}

const fieldClass =
  'h-11 rounded-md border-[#94a3b8] bg-white pl-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus-visible:ring-[#2563EB]'

export function AuthWindowForm({
  onLogin,
  onRegister,
  onAuthenticated,
  defaultMode = 'login'
}: AuthWindowFormProps): React.ReactElement {
  const { t } = useTranslation()
  const formId = useId()
  const [forgotHint, setForgotHint] = useState(false)
  const {
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
  } = useAuthSubmit({ onLogin, onRegister, onAuthenticated, defaultMode })

  const heading =
    mode === 'login' ? t('auth.window.loginHeading') : t('auth.window.registerHeading')

  return (
    <div
      className={cn(
        'relative w-full max-w-[400px] shrink-0 rounded-[22px] border border-white/70',
        'bg-white/88 px-8 py-8 shadow-[0_22px_50px_rgba(15,23,42,0.22)]',
        'backdrop-blur-md'
      )}
    >
      <Gauge
        className="absolute left-7 top-[92px] h-5 w-5 text-[#60a5fa]"
        strokeWidth={1.6}
        aria-hidden="true"
      />
      <ShieldCheck
        className="absolute right-8 top-[118px] h-5 w-5 text-[#60a5fa]"
        strokeWidth={1.6}
        aria-hidden="true"
      />

      <div className="flex items-center justify-center gap-2.5">
        <img src={appIcon} alt="" className="h-10 w-10 rounded-[10px] shadow-sm" />
        <p className="text-[22px] font-semibold tracking-tight text-[#2563EB]">edaCleaner</p>
      </div>

      <div className="mt-6 text-center">
        <h1 className="text-[18px] font-extrabold uppercase tracking-[0.04em] text-[#1e3a8a]">
          {heading}
        </h1>
        <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[#1e3a8a]">
          {t('auth.window.productLine')}
        </p>
      </div>

      <form
        id={formId}
        className="mt-7 space-y-3.5"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        {mode === 'register' ? (
          <Input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('auth.placeholder.name')}
            className={fieldClass}
            disabled={submitting}
            aria-label={t('auth.field.name')}
          />
        ) : null}

        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.window.emailPlaceholder')}
          className={fieldClass}
          disabled={submitting}
          aria-label={t('auth.field.email')}
        />

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.placeholder.password')}
            className={cn(fieldClass, 'pr-10')}
            disabled={submitting}
            aria-label={t('auth.field.password')}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            onClick={() => setShowPassword((value) => !value)}
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

        {mode === 'login' ? (
          <div className="text-right">
            <button
              type="button"
              className="text-[12px] font-medium text-[#1e3a8a] hover:underline"
              onClick={() => setForgotHint(true)}
            >
              {t('auth.window.forgotPassword')}
            </button>
            {forgotHint ? (
              <p className="mt-1.5 text-left text-[11px] leading-relaxed text-slate-500">
                {t('auth.window.forgotPasswordHint')}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">{t('auth.passwordHint')}</p>
        )}

        {mode === 'register' ? (
          <p className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/[0.04] px-3 py-2 text-xs leading-relaxed text-slate-600">
            {t('auth.register.freePlan')}
          </p>
        ) : null}

        {!online ? (
          <p
            role="status"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
          >
            {t('auth.offlineBanner')}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-11 w-full rounded-md bg-[#2563EB] text-[14px] font-semibold text-white shadow-sm hover:bg-[#1d4ed8] active:bg-[#1e40af]"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {submitting
            ? t('auth.submitting')
            : mode === 'login'
              ? t('auth.login.submit')
              : t('auth.register.submit')}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-md border-[#2563EB] bg-white text-[14px] font-semibold text-[#2563EB] hover:bg-[#eff6ff] hover:text-[#1d4ed8]"
          disabled={submitting}
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? t('auth.tab.register') : t('auth.tab.login')}
        </Button>
      </form>
    </div>
  )
}
