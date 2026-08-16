import { useEffect, useId } from 'react'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { PlansModal } from '@/features/subscription/components/PlansModal'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'

interface OnboardingFlowProps {
  authenticated: boolean
  session: AuthSessionSnapshot | null
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
}

function planLabel(session: AuthSessionSnapshot | null, fallback: string): string {
  const plan = session?.subscription?.currentPlan?.trim()
  if (!plan) return fallback
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function OnboardingFlow({
  authenticated,
  session,
  onLogin,
  onRegister
}: OnboardingFlowProps): React.ReactElement {
  const { t } = useTranslation()
  const titleId = useId()
  const step = useOnboardingStore((s) => s.step)
  const authIntent = useOnboardingStore((s) => s.authIntent)
  const plansOpen = useOnboardingStore((s) => s.plansOpen)
  const setStep = useOnboardingStore((s) => s.setStep)
  const back = useOnboardingStore((s) => s.back)
  const startActivate = useOnboardingStore((s) => s.startActivate)
  const startPurchase = useOnboardingStore((s) => s.startPurchase)
  const beginAccount = useOnboardingStore((s) => s.beginAccount)
  const openPlans = useOnboardingStore((s) => s.openPlans)
  const closePlans = useOnboardingStore((s) => s.closePlans)
  const complete = useOnboardingStore((s) => s.complete)

  useEffect(() => {
    if (authenticated && step === 'account') {
      if (authIntent === 'purchase') {
        setStep('hero')
        openPlans()
        return
      }
      setStep('ready')
    }
  }, [authenticated, authIntent, openPlans, setStep, step])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.key === 'Escape' && plansOpen) {
        event.preventDefault()
        closePlans()
        return
      }

      if (typing || plansOpen) return

      if ((event.key === 'ArrowLeft' || event.key === 'Escape') && step !== 'hero') {
        event.preventDefault()
        back()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, closePlans, plansOpen, step])

  function handleAuthenticated(_next: AuthSessionSnapshot): void {
    if (authIntent === 'purchase') {
      setStep('hero')
      openPlans()
      return
    }
    setStep('ready')
  }

  return (
    <div className="h-full min-h-0 w-full" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <OnboardingShell
        step={step}
        titleId={titleId}
        authenticated={authenticated}
        authIntent={authIntent}
        planLabel={planLabel(session, t('plans.price.free'))}
        onActivate={startActivate}
        onBuyLicense={startPurchase}
        onContinueAuthenticated={() => setStep('ready')}
        onBack={back}
        onFinish={complete}
        onLogin={onLogin}
        onRegister={onRegister}
        onAuthenticated={handleAuthenticated}
      />

      <PlansModal
        open={plansOpen}
        onClose={closePlans}
        onUnauthorized={() => {
          beginAccount('purchase')
        }}
        onSubscriptionUpdated={() => {
          closePlans()
          setStep('ready')
        }}
      />
    </div>
  )
}
