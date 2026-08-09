import { useEffect } from 'react'
import { authService } from '@/services/auth-service'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { PlansModal } from '@/features/subscription/components/PlansModal'
import { UpgradePromptModal } from '@/features/entitlements/components/UpgradePromptModal'

/**
 * Keeps entitlements aligned with the cached auth/subscription session
 * (including offline restores and post-sync updates) and hosts global
 * upgrade / plans modals.
 */
export function EntitlementsHost(): React.ReactElement {
  const setFromSubscription = useEntitlementsStore((s) => s.setFromSubscription)
  const plansModalOpen = useEntitlementsStore((s) => s.plansModalOpen)
  const closePlansModal = useEntitlementsStore((s) => s.closePlansModal)

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

  return (
    <>
      <UpgradePromptModal />
      <PlansModal open={plansModalOpen} onClose={closePlansModal} />
    </>
  )
}
