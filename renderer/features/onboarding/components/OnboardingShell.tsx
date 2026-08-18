import onboardingArt from '@/assets/onboarding.png'
import { OnboardingLicenseCard } from '@/features/onboarding/components/OnboardingLicenseCard'
import type { OnboardingStep } from '@/features/onboarding/store/onboarding-store'
import { useTranslation } from '@/i18n/useTranslation'

interface OnboardingShellProps {
  step: OnboardingStep
  titleId: string
  authenticated: boolean
  planLabel: string
  onActivate: () => void
  onBuyLicense: () => void
  onContinueAuthenticated: () => void
  onBack: () => void
  onFinish: () => void
}

export function OnboardingShell({
  step,
  titleId,
  authenticated,
  planLabel,
  onActivate,
  onBuyLicense,
  onContinueAuthenticated,
  onBack,
  onFinish
}: OnboardingShellProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#d7eaf6]">
      <img
        src={onboardingArt}
        alt={t('onboarding.hero.artAlt')}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] items-center gap-6 px-8 py-8">
        <div aria-hidden="true" />
        <div id={titleId} className="flex max-h-full justify-end">
          <OnboardingLicenseCard
            step={step === 'account' ? 'hero' : step}
            authenticated={authenticated}
            planLabel={planLabel}
            onActivate={onActivate}
            onBuyLicense={onBuyLicense}
            onContinueAuthenticated={onContinueAuthenticated}
            onBack={onBack}
            onFinish={onFinish}
          />
        </div>
      </div>
    </div>
  )
}
