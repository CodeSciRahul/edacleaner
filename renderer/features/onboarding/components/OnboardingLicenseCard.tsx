import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  PieChart,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap
} from 'lucide-react'
import { AuthForm } from '@/features/auth/components/AuthForm'
import { Button } from '@/components/ui/Button'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import type { AuthIntent } from '@/features/onboarding/store/onboarding-store'

interface OnboardingLicenseCardProps {
  step: 'hero' | 'account' | 'ready'
  authenticated: boolean
  authIntent: AuthIntent
  planLabel: string
  onActivate: () => void
  onBuyLicense: () => void
  onContinueAuthenticated: () => void
  onBack: () => void
  onFinish: () => void
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onAuthenticated: (session: AuthSessionSnapshot) => void
}

const FEATURES: Array<{
  icon: LucideIcon
  tone: string
  titleKey:
    | 'onboarding.hero.cleanTitle'
    | 'onboarding.hero.boostTitle'
    | 'onboarding.hero.privacyTitle'
    | 'onboarding.hero.manageTitle'
  bodyKey:
    | 'onboarding.hero.cleanBody'
    | 'onboarding.hero.boostBody'
    | 'onboarding.hero.privacyBody'
    | 'onboarding.hero.manageBody'
}> = [
  {
    icon: Sparkles,
    tone: 'bg-sky-500/20 text-sky-300',
    titleKey: 'onboarding.hero.cleanTitle',
    bodyKey: 'onboarding.hero.cleanBody'
  },
  {
    icon: Zap,
    tone: 'bg-emerald-500/20 text-emerald-300',
    titleKey: 'onboarding.hero.boostTitle',
    bodyKey: 'onboarding.hero.boostBody'
  },
  {
    icon: ShieldCheck,
    tone: 'bg-violet-500/20 text-violet-300',
    titleKey: 'onboarding.hero.privacyTitle',
    bodyKey: 'onboarding.hero.privacyBody'
  },
  {
    icon: PieChart,
    tone: 'bg-amber-500/20 text-amber-300',
    titleKey: 'onboarding.hero.manageTitle',
    bodyKey: 'onboarding.hero.manageBody'
  }
]

export function OnboardingLicenseCard({
  step,
  authenticated,
  authIntent,
  planLabel,
  onActivate,
  onBuyLicense,
  onContinueAuthenticated,
  onBack,
  onFinish,
  onLogin,
  onRegister,
  onAuthenticated
}: OnboardingLicenseCardProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section
      className={cn(
        'glass-panel relative z-10 flex w-full max-w-[440px] flex-col overflow-hidden rounded-[28px]',
        'border border-white/25',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_18px_50px_rgba(0,0,0,0.28)]',
        'animate-in fade-in-0 slide-in-from-left-4 duration-300'
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-sky-400/10"
        aria-hidden="true"
      />

      <div className="relative flex min-h-0 flex-1 flex-col p-7 sm:p-8">
        {step === 'account' ? (
          <>
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('onboarding.account.backToLicense')}
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              {authIntent === 'purchase'
                ? t('onboarding.account.purchaseEyebrow')
                : t('onboarding.account.activateEyebrow')}
            </p>
            <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-white">
              {authIntent === 'purchase'
                ? t('onboarding.account.purchaseTitle')
                : t('onboarding.account.activateTitle')}
            </h1>
            <p className="mt-2 mb-4 text-sm leading-relaxed text-white/65">
              {authIntent === 'purchase'
                ? t('onboarding.account.purchaseBody')
                : t('onboarding.account.activateBody')}
            </p>
            <AuthForm
              onLogin={onLogin}
              onRegister={onRegister}
              onAuthenticated={onAuthenticated}
              defaultMode={authIntent === 'purchase' ? 'register' : 'login'}
            />
          </>
        ) : null}

        {step === 'ready' ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-white">
              {t('onboarding.ready.title')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{t('onboarding.ready.body')}</p>
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white/90">
              {t('onboarding.ready.plan', { plan: planLabel })}
            </p>
            <Button type="button" className="mt-6 h-11 w-full gap-2" onClick={onFinish}>
              {t('onboarding.ready.start')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : null}

        {step === 'hero' ? (
          <>
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight text-white">
              {t('onboarding.hero.titleLead')}{' '}
              <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">
                {t('onboarding.hero.titleAccent')}
              </span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{t('onboarding.hero.body')}</p>

            <ul className="mt-6 space-y-3.5">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <li key={feature.titleKey} className="flex gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        feature.tone
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span>
                      <p className="text-[13px] font-semibold text-white">{t(feature.titleKey)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/55">{t(feature.bodyKey)}</p>
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {authenticated ? (
                <button
                  type="button"
                  onClick={onContinueAuthenticated}
                  className={cn(
                    'flex min-h-[72px] flex-col items-start justify-center rounded-2xl px-4 py-3 text-left',
                    'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-900/40',
                    'transition-transform duration-150 hover:brightness-110 active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'
                  )}
                >
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                    {t('common.continue')}
                  </span>
                  <span className="mt-1 text-[11px] text-white/80">{t('onboarding.ready.start')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onActivate}
                  className={cn(
                    'flex min-h-[72px] flex-col items-start justify-center rounded-2xl px-4 py-3 text-left',
                    'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-900/40',
                    'transition-transform duration-150 hover:brightness-110 active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'
                  )}
                >
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                    {t('onboarding.license.activate')}
                  </span>
                  <span className="mt-1 text-[11px] text-white/80">{t('onboarding.license.activateHint')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onBuyLicense}
                className={cn(
                  'flex min-h-[72px] flex-col items-start justify-center rounded-2xl px-4 py-3 text-left',
                  'bg-gradient-to-br from-emerald-500 to-emerald-800 text-white shadow-lg shadow-emerald-950/40',
                  'transition-transform duration-150 hover:brightness-110 active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300'
                )}
              >
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
                  {t('onboarding.license.buy')}
                </span>
                <span className="mt-1 text-[11px] text-white/80">{t('onboarding.license.buyHint')}</span>
              </button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/45">
              <Lock className="h-3 w-3" strokeWidth={1.75} />
              {t('onboarding.hero.trust')}
            </p>
          </>
        ) : null}
      </div>
    </section>
  )
}
