import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  KeyRound,
  LayoutGrid,
  PieChart,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import appIcon from '@/assets/app logo/App Icon1.svg'

interface OnboardingLicenseCardProps {
  step: 'hero' | 'ready'
  authenticated: boolean
  hasPaidPlan: boolean
  planLabel: string
  onAlreadyPurchased: () => void
  onActivate: () => void
  onViewPlans: () => void
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
}> = [
  {
    icon: Sparkles,
    tone: 'bg-sky-100 text-sky-600',
    titleKey: 'onboarding.hero.cleanTitle'
  },
  {
    icon: Zap,
    tone: 'bg-emerald-100 text-emerald-600',
    titleKey: 'onboarding.hero.boostTitle'
  },
  {
    icon: ShieldCheck,
    tone: 'bg-violet-100 text-violet-600',
    titleKey: 'onboarding.hero.privacyTitle'
  },
  {
    icon: PieChart,
    tone: 'bg-amber-100 text-amber-600',
    titleKey: 'onboarding.hero.manageTitle'
  }
]

function BrandLockup(): React.ReactElement {
  return (
    <div className="mb-4 flex items-center justify-center gap-2.5">
      <img src={appIcon} alt="" className="h-10 w-10 rounded-[10px] shadow-sm" />
      <p className="text-[22px] font-semibold tracking-tight text-[#2563EB]">edaCleaner</p>
    </div>
  )
}

function LicenseChoice({
  icon: Icon,
  title,
  hint,
  onClick,
  variant
}: {
  icon: LucideIcon
  title: string
  hint: string
  onClick: () => void
  variant: 'primary' | 'secondary' | 'outline'
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left',
        'transition-transform duration-150 hover:brightness-105 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variant === 'primary' &&
          'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-blue-700/20 focus-visible:ring-sky-400',
        variant === 'secondary' &&
          'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-800/20 focus-visible:ring-emerald-300',
        variant === 'outline' &&
          'border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-sky-200 hover:bg-sky-50/60 focus-visible:ring-sky-400'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          variant === 'outline' ? 'bg-sky-100 text-sky-700' : 'bg-white/15 text-white'
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[14px] font-semibold leading-tight',
            variant === 'outline' ? 'text-slate-900' : 'text-white'
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'mt-0.5 block text-[11px] leading-snug',
            variant === 'outline' ? 'text-slate-500' : 'text-white/80'
          )}
        >
          {hint}
        </span>
      </span>
      <ChevronRight
        className={cn('h-4 w-4 shrink-0', variant === 'outline' ? 'text-slate-400' : 'text-white/80')}
        aria-hidden="true"
      />
    </button>
  )
}

export function OnboardingLicenseCard({
  step,
  authenticated,
  hasPaidPlan,
  planLabel,
  onAlreadyPurchased,
  onActivate,
  onViewPlans,
  onBack,
  onFinish
}: OnboardingLicenseCardProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section
      className={cn(
        'relative z-10 flex max-h-full w-full max-w-[440px] flex-col overflow-y-auto rounded-[24px]',
        'border border-white/80 bg-white/90 backdrop-blur-xl',
        'shadow-[0_20px_48px_rgba(30,58,95,0.18)]',
        'animate-in fade-in-0 slide-in-from-right-4 duration-300'
      )}
    >
      <div className="relative flex min-h-0 flex-1 flex-col p-6 sm:p-7">
        {step === 'ready' ? (
          <>
            <BrandLockup />
            {!authenticated ? (
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('common.back')}
              </button>
            ) : null}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-600/25">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
              {t(hasPaidPlan ? 'onboarding.ready.paidTitle' : 'onboarding.ready.title')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {hasPaidPlan
                ? t('onboarding.ready.paidBody', { plan: planLabel })
                : t('onboarding.ready.body')}
            </p>
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
            <h1 className="text-center text-[24px] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-[26px]">
              {t('onboarding.hero.titleLead')}{' '}
              <span className="text-[#2563EB]">{t('onboarding.hero.titleAccent')}</span>
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
              {t('onboarding.hero.body')}
            </p>

            <ul className="mt-5 grid grid-cols-2 gap-2.5">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <li
                    key={feature.titleKey}
                    className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-2"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        feature.tone
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <p className="min-w-0 text-[12px] font-semibold leading-tight text-slate-900">
                      {t(feature.titleKey)}
                    </p>
                  </li>
                )
              })}
            </ul>

            <div className="mt-6">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {t('onboarding.license.choicesLabel')}
              </p>
              <div className="flex flex-col gap-2.5">
                <LicenseChoice
                  icon={KeyRound}
                  title={t('onboarding.license.alreadyPurchased')}
                  hint={t('onboarding.license.alreadyPurchasedHint')}
                  onClick={onAlreadyPurchased}
                  variant="outline"
                />
                <LicenseChoice
                  icon={UserPlus}
                  title={t('onboarding.license.activate')}
                  hint={t('onboarding.license.activateHint')}
                  onClick={onActivate}
                  variant="primary"
                />
                <LicenseChoice
                  icon={LayoutGrid}
                  title={t('onboarding.license.viewPlans')}
                  hint={t('onboarding.license.viewPlansHint')}
                  onClick={onViewPlans}
                  variant="secondary"
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
