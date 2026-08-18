import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  PieChart,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import appIcon from '@/assets/app logo/App Icon1.svg'

interface OnboardingLicenseCardProps {
  step: 'hero' | 'ready'
  authenticated: boolean
  planLabel: string
  onActivate: () => void
  onBuyLicense: () => void
  onContinueAuthenticated: () => void
  onBack: () => void
  onFinish: () => void
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
    tone: 'bg-sky-100 text-sky-600',
    titleKey: 'onboarding.hero.cleanTitle',
    bodyKey: 'onboarding.hero.cleanBody'
  },
  {
    icon: Zap,
    tone: 'bg-emerald-100 text-emerald-600',
    titleKey: 'onboarding.hero.boostTitle',
    bodyKey: 'onboarding.hero.boostBody'
  },
  {
    icon: ShieldCheck,
    tone: 'bg-violet-100 text-violet-600',
    titleKey: 'onboarding.hero.privacyTitle',
    bodyKey: 'onboarding.hero.privacyBody'
  },
  {
    icon: PieChart,
    tone: 'bg-amber-100 text-amber-600',
    titleKey: 'onboarding.hero.manageTitle',
    bodyKey: 'onboarding.hero.manageBody'
  }
]

function BrandLockup(): React.ReactElement {
  return (
    <div className="mb-5 flex items-center justify-center gap-2.5">
      <img src={appIcon} alt="" className="h-10 w-10 rounded-[10px] shadow-sm" />
      <p className="text-[22px] font-semibold tracking-tight text-[#2563EB]">edaCleaner</p>
    </div>
  )
}

export function OnboardingLicenseCard({
  step,
  authenticated,
  planLabel,
  onActivate,
  onBuyLicense,
  onContinueAuthenticated,
  onBack,
  onFinish
}: OnboardingLicenseCardProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section
      className={cn(
        'relative z-10 flex max-h-full w-full max-w-[420px] flex-col overflow-y-auto rounded-[24px]',
        'border border-white/80 bg-white/90 backdrop-blur-xl',
        'shadow-[0_20px_48px_rgba(30,58,95,0.18)]',
        'animate-in fade-in-0 slide-in-from-right-4 duration-300'
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col p-6 sm:p-7">
        {step === 'ready' ? (
          <>
            <BrandLockup />
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('common.back')}
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-600/25">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
              {t('onboarding.ready.title')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('onboarding.ready.body')}</p>
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-medium text-slate-800">
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
            <BrandLockup />
            <h1 className="text-[26px] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-[28px]">
              {t('onboarding.hero.titleLead')}{' '}
              <span className="text-[#2563EB]">{t('onboarding.hero.titleAccent')}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-3">
              {t('onboarding.hero.body')}
            </p>

            <ul className="mt-4 space-y-3 sm:mt-5">
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
                      <p className="text-[13px] font-semibold text-slate-900">{t(feature.titleKey)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{t(feature.bodyKey)}</p>
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
              {authenticated ? (
                <button
                  type="button"
                  onClick={onContinueAuthenticated}
                  className={cn(
                    'flex h-12 items-center justify-center rounded-2xl px-4 text-center',
                    'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-blue-700/25',
                    'transition-transform duration-150 hover:brightness-110 active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                  )}
                >
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                    {t('common.continue')}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onActivate}
                  className={cn(
                    'flex h-12 items-center justify-center rounded-2xl px-4 text-center',
                    'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-blue-700/25',
                    'transition-transform duration-150 hover:brightness-110 active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                  )}
                >
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                    {t('onboarding.license.activate')}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onBuyLicense}
                className={cn(
                  'flex h-12 items-center justify-center rounded-2xl px-4 text-center',
                  'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-800/25',
                  'transition-transform duration-150 hover:brightness-110 active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300'
                )}
              >
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
                  {t('onboarding.license.buy')}
                </span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
