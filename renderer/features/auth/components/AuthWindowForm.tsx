import { useId, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
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
  'h-10 rounded-xl border-sky-200/80 bg-white/70 px-3 text-[13px] text-slate-800 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-0'

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }): React.ReactElement {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-medium text-slate-600">
      {children}
    </label>
  )
}

export function AuthWindowForm({
  onLogin,
  onRegister,
  onAuthenticated,
  defaultMode = 'login'
}: AuthWindowFormProps): React.ReactElement {
  const { t } = useTranslation()
  const formId = useId()
  const nameId = `${formId}-name`
  const emailId = `${formId}-email`
  const passwordId = `${formId}-password`
  const otpId = `${formId}-otp`
  const [forgotHint, setForgotHint] = useState(false)
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

  const heading =
    step === 'otp'
      ? t('auth.otp.heading')
      : mode === 'login'
        ? t('auth.login.title')
        : t('auth.register.title')

  const description =
    step === 'otp'
      ? t('auth.otp.body')
      : mode === 'login'
        ? step === 'password'
          ? t('auth.login.passwordStep')
          : t('auth.login.description')
        : t('auth.register.description')

  const showEmailField = mode === 'register' || step === 'email'
  const showPasswordField = mode === 'register' || step === 'password'

  return (
    <div
      className={cn(
        'relative flex max-h-full w-full max-w-[400px] shrink-0 flex-col overflow-y-auto',
        'rounded-[24px] border border-white/80 bg-white/88',
        'shadow-[0_20px_48px_rgba(30,58,95,0.18)] backdrop-blur-xl'
      )}
    >
      <div className="px-7 pb-7 pt-7">
        <div className="flex items-center justify-center gap-2.5">
          <img src={appIcon} alt="" className="h-10 w-10 rounded-[10px] shadow-sm" />
          <p className="text-[22px] font-semibold tracking-tight text-[#2563EB]">edaCleaner</p>
        </div>

        <h1 className="mt-5 text-center text-[22px] font-semibold tracking-tight text-slate-900">
          {heading}
        </h1>
        <p className="mt-1.5 text-center text-[13px] leading-relaxed text-slate-600">{description}</p>

        {step !== 'otp' ? (
          <div
            role="tablist"
            aria-label={t('auth.window.modeLabel')}
            className="mt-5 grid grid-cols-2 rounded-2xl bg-sky-100/70 p-1"
          >
            {(['login', 'register'] as const).map((tab) => {
              const active = mode === tab
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={submitting}
                  onClick={() => switchMode(tab)}
                  className={cn(
                    'h-8 rounded-xl text-[12px] font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]',
                    active
                      ? 'bg-white/95 text-[#1d4ed8] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {tab === 'login' ? t('auth.tab.login') : t('auth.tab.register')}
                </button>
              )
            })}
          </div>
        ) : null}

        <form
          id={formId}
          className="mt-5 space-y-3.5"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          {mode === 'register' ? (
            <div>
              <FieldLabel htmlFor={nameId}>{t('auth.field.name')}</FieldLabel>
              <Input
                id={nameId}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.placeholder.name')}
                className={fieldClass}
                disabled={submitting}
              />
            </div>
          ) : null}

          {showEmailField ? (
            <div>
              <FieldLabel htmlFor={emailId}>{t('auth.field.email')}</FieldLabel>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.window.emailPlaceholder')}
                className={fieldClass}
                disabled={submitting}
              />
            </div>
          ) : (
            <p className="truncate rounded-xl bg-sky-50/80 px-3 py-2 text-[12px] text-slate-600">{email}</p>
          )}

          {step === 'otp' ? (
            <div>
              <FieldLabel htmlFor={otpId}>{t('auth.otp.placeholder')}</FieldLabel>
              <Input
                id={otpId}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className={cn(fieldClass, 'text-center tracking-[0.35em]')}
                disabled={submitting}
              />
            </div>
          ) : null}

          {showPasswordField ? (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor={passwordId} className="text-[12px] font-medium text-slate-600">
                    {t('auth.field.password')}
                  </label>
                  {mode === 'login' ? (
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#2563EB] hover:underline"
                      onClick={() => setForgotHint((open) => !open)}
                    >
                      {t('auth.window.forgotPassword')}
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id={passwordId}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required={mode === 'register' || step === 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.placeholder.password')}
                    className={cn(fieldClass, 'pr-10')}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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
              </div>

              {mode === 'login' && forgotHint ? (
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {t('auth.window.forgotPasswordHint')}
                </p>
              ) : null}

              {mode === 'register' ? (
                <p className="text-[11px] leading-relaxed text-slate-500">{t('auth.passwordHint')}</p>
              ) : null}
            </>
          ) : null}

          {!online ? (
            <p
              role="status"
              className="rounded-xl bg-sky-50/80 px-3 py-2 text-[12px] leading-relaxed text-slate-600"
            >
              {t('auth.offlineBanner')}
            </p>
          ) : null}

          {notice && !error ? (
            <p role="status" className="text-[12px] leading-relaxed text-slate-600">
              {notice}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-[12px] leading-relaxed text-red-600">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="mt-1 h-11 w-full rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-[14px] font-semibold text-white shadow-md shadow-blue-700/20 hover:brightness-105 active:scale-[0.99]"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
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
            <div className="flex items-center justify-between gap-3 pt-0.5 text-[12px]">
              <button
                type="button"
                className="font-medium text-[#2563EB] hover:underline disabled:opacity-50"
                disabled={submitting}
                onClick={() => void resendOtp()}
              >
                {t('auth.otp.resend')}
              </button>
              <button
                type="button"
                className="font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50"
                disabled={submitting}
                onClick={backToCredentials}
              >
                {t('auth.otp.changeEmail')}
              </button>
            </div>
          ) : step === 'password' ? (
            <button
              type="button"
              className="w-full text-center text-[12px] font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-50"
              disabled={submitting}
              onClick={backToCredentials}
            >
              {t('auth.otp.changeEmail')}
            </button>
          ) : (
            <p className="pt-1 text-center text-[12px] text-slate-500">
              {mode === 'login' ? t('auth.window.needAccount') : t('auth.window.haveAccount')}{' '}
              <button
                type="button"
                className="font-semibold text-[#2563EB] hover:underline disabled:opacity-50"
                disabled={submitting}
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? t('auth.tab.register') : t('auth.tab.login')}
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
