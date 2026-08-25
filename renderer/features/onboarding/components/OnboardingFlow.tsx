import { useEffect, useId } from 'react'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import { sessionHasPaidPlan } from '@/features/onboarding/lib/session-plan'
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
  const plansOpen = useOnboardingStore((s) => s.plansOpen)
  const setStep = useOnboardingStore((s) => s.setStep)
  const back = useOnboardingStore((s) => s.back)
  const startActivate = useOnboardingStore((s) => s.startActivate)
  const startPurchase = useOnboardingStore((s) => s.startPurchase)
  const beginAccount = useOnboardingStore((s) => s.beginAccount)
  const closePlans = useOnboardingStore((s) => s.closePlans)
  const complete = useOnboardingStore((s) => s.complete)
  const hasPaidPlan = sessionHasPaidPlan(session)

  useEffect(() => {
    if (!authenticated) return
    closePlans()
    setStep('ready')
  }, [authenticated, closePlans, setStep])

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

      if ((event.key === 'ArrowLeft' || event.key === 'Escape') && step !== 'hero' && !authenticated) {
        event.preventDefault()
        back()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authenticated, back, closePlans, plansOpen, step])

  function handleAlreadyPurchased(): void {
    startActivate()
    void authService.openWindow('login')
  }

  function handleActivate(): void {
    beginAccount('activate')
    void authService.openWindow('register')
  }

  function handleViewPlans(): void {
    startPurchase()
  }

  function handleFreePlanActivate(): void {
    closePlans()
    beginAccount('activate')
    void authService.openWindow('register')
  }

  return (
    <div className="h-full min-h-0 w-full" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <OnboardingShell
        step={authenticated ? 'ready' : step}
        titleId={titleId}
        authenticated={authenticated}
        hasPaidPlan={hasPaidPlan}
        planLabel={planLabel(session, t('plans.price.free'))}
        onAlreadyPurchased={handleAlreadyPurchased}
        onActivate={handleActivate}
        onViewPlans={handleViewPlans}
        onBack={back}
        onFinish={complete}
      />

      <PlansModal
        open={plansOpen && !authenticated}
        onClose={closePlans}
        onActivateAccount={handleFreePlanActivate}
        onGuestCheckoutReturn={() => {
          closePlans()
          beginAccount('purchase')
          void authService.openWindow('login')
        }}
        onSubscriptionUpdated={() => {
          closePlans()
          setStep('ready')
        }}
      />
    </div>
  )
}
