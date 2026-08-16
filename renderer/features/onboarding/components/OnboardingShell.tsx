import onboardingArt from '@/assets/onboarding.png'
import { OnboardingLicenseCard } from '@/features/onboarding/components/OnboardingLicenseCard'
import type { AuthIntent, OnboardingStep } from '@/features/onboarding/store/onboarding-store'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'

interface OnboardingShellProps {
  step: OnboardingStep
  titleId: string
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

export function OnboardingShell({
  step,
  titleId,
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
}: OnboardingShellProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#050a14]">
      <img
        src={onboardingArt}
        alt={t('onboarding.hero.artAlt')}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="relative flex h-full min-h-0 items-center px-6 py-6 sm:px-10">
        <div id={titleId} className="max-h-full overflow-auto pr-2">
          <OnboardingLicenseCard
            step={step}
            authenticated={authenticated}
            authIntent={authIntent}
            planLabel={planLabel}
            onActivate={onActivate}
            onBuyLicense={onBuyLicense}
            onContinueAuthenticated={onContinueAuthenticated}
            onBack={onBack}
            onFinish={onFinish}
            onLogin={onLogin}
            onRegister={onRegister}
            onAuthenticated={onAuthenticated}
          />
        </div>
      </div>
    </div>
  )
}
