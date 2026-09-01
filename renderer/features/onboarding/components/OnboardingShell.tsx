import onboardingArt from '@/assets/onboarding.png'
import onboardingReadyArt from '@/assets/onboarding-ready.png'
import { OnboardingLicenseCard } from '@/features/onboarding/components/OnboardingLicenseCard'
import type { OnboardingStep } from '@/features/onboarding/store/onboarding-store'
import { useTranslation } from '@/i18n/useTranslation'

interface OnboardingShellProps {
  step: OnboardingStep
  titleId: string
  authenticated: boolean
  hasPaidPlan: boolean
  planLabel: string
  onAlreadyPurchased: () => void
  onActivate: () => void
  onViewPlans: () => void
  onBack: () => void
  onFinish: () => void
}

export function OnboardingShell({
  step,
  titleId,
  authenticated,
  hasPaidPlan,
  planLabel,
  onAlreadyPurchased,
  onActivate,
  onViewPlans,
  onBack,
  onFinish
}: OnboardingShellProps): React.ReactElement {
  const { t } = useTranslation()
  const paidScene = hasPaidPlan
  const cardStep = step === 'account' ? 'hero' : step === 'ready' || authenticated ? 'ready' : 'hero'

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#d7eaf6]">
      <img
        src={paidScene ? onboardingReadyArt : onboardingArt}
        alt={t(paidScene ? 'onboarding.ready.artAlt' : 'onboarding.hero.artAlt')}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[22%_center]"
      />

      <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(380px,min(42vw,460px))] items-center gap-6 px-8 py-7 lg:px-10 lg:py-8">
        <div aria-hidden="true" />
        <div id={titleId} className="flex max-h-full justify-end">
          <OnboardingLicenseCard
            step={cardStep}
            authenticated={authenticated}
            hasPaidPlan={hasPaidPlan}
            planLabel={planLabel}
            onAlreadyPurchased={onAlreadyPurchased}
            onActivate={onActivate}
            onViewPlans={onViewPlans}
            onBack={onBack}
            onFinish={onFinish}
          />
        </div>
      </div>
    </div>
  )
}
