import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
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

function BrandHeader({
  badge,
  badgeType = 'live',
  onBack
}: {
  badge?: string
  badgeType?: 'live' | 'neutral'
  onBack?: () => void
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between border-b border-slate-100/90 pb-3.5">
      <div className="flex items-center gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm shadow-blue-600/25 ring-1 ring-white/60">
            <img src={appIcon} alt="" className="h-5 w-5 object-contain" />
          </div>
        )}
        <p className="text-[17px] font-bold tracking-tight bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 bg-clip-text text-transparent">
          edaCleaner
        </p>
      </div>

      {badge ? (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs',
            badgeType === 'live'
              ? 'border border-emerald-200/80 bg-emerald-50 text-emerald-700'
              : 'border border-blue-200/60 bg-blue-50 text-blue-700'
          )}
        >
          {badgeType === 'live' ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
          ) : null}
          {badge}
        </span>
      ) : null}
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
        'group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left',
        'transition-all duration-150 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variant === 'primary' &&
          'bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:brightness-105 focus-visible:ring-blue-400',
        variant === 'secondary' &&
          'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-700/25 hover:shadow-lg hover:shadow-emerald-700/35 hover:brightness-105 focus-visible:ring-emerald-300',
        variant === 'outline' &&
          'border border-slate-200/90 bg-white/90 text-slate-900 shadow-2xs hover:border-sky-300 hover:bg-sky-50/70 focus-visible:ring-sky-400'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105',
          variant === 'outline' ? 'bg-sky-100 text-sky-700' : 'bg-white/20 text-white'
        )}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[13.5px] font-semibold leading-tight',
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
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5',
          variant === 'outline' ? 'text-slate-400 group-hover:text-sky-600' : 'text-white/80'
        )}
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
    <div className="relative w-full max-w-[420px]">
      {/* Soft ambient aura matching the illustration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2.5 -z-10 rounded-[32px] bg-gradient-to-tr from-blue-500/20 via-sky-400/15 to-indigo-500/20 blur-2xl opacity-75"
      />

      <section
        className={cn(
          'relative z-10 flex max-h-full w-full flex-col overflow-y-auto rounded-[24px]',
          'border border-white/85 bg-white/90 backdrop-blur-2xl',
          'shadow-[0_24px_54px_-12px_rgba(20,50,90,0.22),0_0_0_1px_rgba(255,255,255,0.85)_inset]',
          'animate-in fade-in-0 slide-in-from-right-4 duration-300'
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col p-5 sm:p-6">
          {step === 'ready' ? (
            <>
              <BrandHeader
                badge={hasPaidPlan ? 'Active Protection' : 'Ready'}
                badgeType="live"
                onBack={!authenticated ? onBack : undefined}
              />

              {/* Glowing Hero Icon & Success Status */}
              <div className="mt-5 flex flex-col items-center text-center">
                <div className="relative mb-3.5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/30 ring-4 ring-blue-500/15">
                    <ShieldCheck className="h-8 w-8" strokeWidth={2} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                </div>

                <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[24px]">
                  {t(hasPaidPlan ? 'onboarding.ready.paidTitle' : 'onboarding.ready.title')}
                </h1>
                <p className="mt-1.5 max-w-[340px] text-[13px] leading-relaxed text-slate-600">
                  {hasPaidPlan
                    ? t('onboarding.ready.paidBody', { plan: planLabel })
                    : t('onboarding.ready.body')}
                </p>
              </div>

              {/* Subscription & Plan Status Card */}
              <div className="mt-5 rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-sky-50/30 to-white/90 p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Subscription Status
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between border-t border-blue-100/70 pt-2.5">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Current tier</p>
                    <p className="text-[16px] font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                      {planLabel}
                      {hasPaidPlan ? (
                        <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0.5 text-[9.5px] font-extrabold text-white tracking-wider uppercase shadow-xs">
                          PRO
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-slate-500">Protection</p>
                    <p className="text-[13px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Optimal
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Feature Perks */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center rounded-xl border border-slate-100/90 bg-white/80 py-2 px-1 text-center shadow-2xs backdrop-blur-xs">
                  <Sparkles className="mb-1 h-4 w-4 text-sky-600" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Smart Clean</span>
                  <span className="text-[10px] text-slate-500">Ready</span>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-slate-100/90 bg-white/80 py-2 px-1 text-center shadow-2xs backdrop-blur-xs">
                  <Zap className="mb-1 h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">Speed Boost</span>
                  <span className="text-[10px] text-slate-500">Active</span>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-slate-100/90 bg-white/80 py-2 px-1 text-center shadow-2xs backdrop-blur-xs">
                  <ShieldCheck className="mb-1 h-4 w-4 text-indigo-600" />
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">System Guard</span>
                  <span className="text-[10px] text-slate-500">Protected</span>
                </div>
              </div>

              {/* Start CTA Button */}
              <Button
                type="button"
                className={cn(
                  'group relative mt-5 h-12 w-full gap-2 rounded-2xl text-[14px] font-semibold',
                  'bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white',
                  'shadow-lg shadow-blue-600/30 transition-all duration-200',
                  'hover:shadow-xl hover:shadow-blue-600/40 hover:brightness-105 active:scale-[0.99]'
                )}
                onClick={onFinish}
              >
                <span>{t('onboarding.ready.start')}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </>
          ) : null}

          {step === 'hero' ? (
            <>
              <BrandHeader badge="System Optimizer" badgeType="neutral" />

              <div className="mt-4 text-center">
                <h1 className="text-[22px] sm:text-[23px] font-bold leading-tight tracking-tight text-slate-900">
                  {t('onboarding.hero.titleLead')}{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                    {t('onboarding.hero.titleAccent')}
                  </span>
                </h1>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                  {t('onboarding.hero.body')}
                </p>
              </div>

              <ul className="mt-4 grid grid-cols-2 gap-2">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <li
                      key={feature.titleKey}
                      className="flex items-center gap-2 rounded-xl border border-slate-100/90 bg-white/70 px-2.5 py-2 shadow-2xs backdrop-blur-xs transition-colors hover:bg-white hover:border-blue-100"
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                          feature.tone
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <p className="min-w-0 text-[11.5px] font-semibold leading-tight text-slate-800">
                        {t(feature.titleKey)}
                      </p>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-5">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  {t('onboarding.license.choicesLabel')}
                </p>
                <div className="flex flex-col gap-2">
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
    </div>
  )
}
