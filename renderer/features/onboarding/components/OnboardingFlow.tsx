import { useEffect, useId, useRef } from 'react'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { PlansModal } from '@/features/subscription/components/PlansModal'
import { authService } from '@/services/auth-service'
import type { AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'

interface OnboardingFlowProps {
  authenticated: boolean
  session: AuthSessionSnapshot | null
}

function planLabel(session: AuthSessionSnapshot | null, fallback: string): string {
  const plan = session?.subscription?.currentPlan?.trim()
  if (!plan) return fallback
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function OnboardingFlow({
  authenticated,
  session
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
  const wasAuthenticated = useRef(authenticated)

  useEffect(() => {
    if (!authenticated) {
      wasAuthenticated.current = false
      return
    }
    if (wasAuthenticated.current) return
    wasAuthenticated.current = true
    if (authIntent === 'purchase') {
      setStep('hero')
      openPlans()
      return
    }
    setStep('ready')
  }, [authenticated, authIntent, openPlans, setStep])

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

  function handleActivate(): void {
    startActivate()
    void authService.openWindow('login')
  }

  function handleBuyLicense(): void {
    startPurchase()
  }

  return (
    <div className="h-full min-h-0 w-full" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <OnboardingShell
        step={step}
        titleId={titleId}
        authenticated={authenticated}
        planLabel={planLabel(session, t('plans.price.free'))}
        onActivate={handleActivate}
        onBuyLicense={handleBuyLicense}
        onContinueAuthenticated={() => setStep('ready')}
        onBack={back}
        onFinish={complete}
      />

      <PlansModal
        open={plansOpen}
        onClose={closePlans}
        onUnauthorized={() => {
          beginAccount('purchase')
          void authService.openWindow('register')
        }}
        onSubscriptionUpdated={() => {
          closePlans()
          setStep('ready')
        }}
      />
    </div>
  )
}
