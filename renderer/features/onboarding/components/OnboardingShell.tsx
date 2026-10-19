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
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[20%_center] lg:object-[22%_center]"
      />

      {/* Main layout container with top titlebar clearance for Windows/Linux caption buttons & macOS traffic lights */}
      <div className="relative flex h-full min-h-0 flex-col pt-[calc(theme(height.titlebar)+10px)] pb-6 sm:pb-8">
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,min(44vw,440px))] items-center gap-6 sm:gap-8 px-6 sm:px-10 lg:px-14 xl:px-16">
          <div aria-hidden="true" className="hidden lg:block" />
          <div id={titleId} className="flex max-h-full items-center justify-center lg:justify-end">
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
    </div>
  )
}
