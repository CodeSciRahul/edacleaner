import { useEffect } from 'react'
import { authService } from '@/services/auth-service'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { PlansModal } from '@/features/subscription/components/PlansModal'
import { PlanChangeSuccessModal } from '@/features/subscription/components/PlanChangeSuccessModal'
import { SubscriptionExpiredScreen } from '@/features/subscription/components/SubscriptionExpiredScreen'
import { UpgradePromptModal } from '@/features/entitlements/components/UpgradePromptModal'

/**
 * Keeps entitlements aligned with the cached auth/subscription session
 * (including offline restores and post-sync updates) and hosts global
 * upgrade / plans / expired-subscription surfaces.
 */
export function EntitlementsHost(): React.ReactElement {
  const setFromSubscription = useEntitlementsStore((s) => s.setFromSubscription)
  const plansModalOpen = useEntitlementsStore((s) => s.plansModalOpen)
  const closePlansModal = useEntitlementsStore((s) => s.closePlansModal)
  const expiredGateEligible = useEntitlementsStore((s) => s.expiredGateEligible)
  const expiredGateDismissed = useEntitlementsStore((s) => s.expiredGateDismissed)
  const expiredFromTrial = useEntitlementsStore((s) => s.expiredFromTrial)
  const expiresAt = useEntitlementsStore((s) => s.expiresAt)
  const currentPeriodStart = useEntitlementsStore((s) => s.currentPeriodStart)
  const trialStart = useEntitlementsStore((s) => s.trialStart)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const session = await authService.getSession()
        if (!cancelled) setFromSubscription(session.subscription)
      } catch {
        if (!cancelled) setFromSubscription(null)
      }
    })()

    const unsubscribe = authService.onSessionChanged((event) => {
      setFromSubscription(event.session.subscription)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [setFromSubscription])

  const showExpiredGate = expiredGateEligible && !expiredGateDismissed
  const statsSinceIso = trialStart ?? currentPeriodStart

  return (
    <>
      {showExpiredGate ? (
        <SubscriptionExpiredScreen
          isTrialExpired={expiredFromTrial}
          expiresAt={expiresAt}
          statsSinceIso={statsSinceIso}
        />
      ) : null}
      <UpgradePromptModal />
      <PlansModal
        open={plansModalOpen}
        onClose={closePlansModal}
        onActivateAccount={() => {
          closePlansModal()
          void authService.openWindow('register')
        }}
      />
      <PlanChangeSuccessModal />
    </>
  )
}
