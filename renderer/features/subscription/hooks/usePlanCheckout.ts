import { useCallback, useState } from 'react'
import { authService } from '@/services/auth-service'
import { useOfflineStore } from '@/store/offline-store'
import { useEntitlementsStore } from '@/store/entitlements-store'
import {
  findPlanForSlug,
  type PlanSlug
} from '@/features/subscription/lib/plans'
import { subscriptionService } from '@/features/subscription/services/subscription-service'
import { useTranslation } from '@/i18n/useTranslation'

/**
 * Starts browser checkout for a paid plan (yearly preferred).
 * Falls back to the plans modal if checkout cannot be opened.
 */
export function usePlanCheckout() {
  const { t } = useTranslation()
  const online = useOfflineStore((s) => s.online)
  const openPlansModal = useEntitlementsStore((s) => s.openPlansModal)
  const [checkingOut, setCheckingOut] = useState(false)

  const startCheckout = useCallback(
    async (slug: PlanSlug): Promise<void> => {
      if (checkingOut || slug === 'free') return

      if (!online) {
        openPlansModal()
        return
      }

      setCheckingOut(true)
      try {
        const plans = await subscriptionService.listPlans()
        const plan = findPlanForSlug(plans, slug, 'year')
        if (!plan) {
          openPlansModal()
          return
        }

        const session = await authService.getSession()
        const result = session.authenticated
          ? await subscriptionService.changePlan(plan.id)
          : await subscriptionService.guestCheckout(plan.id)

        if (subscriptionService.isCheckoutResult(result)) {
          if (!result.url) {
            throw new Error(t('plans.error.missingCheckoutUrl'))
          }
          await subscriptionService.openCheckoutUrl(result.url)
          return
        }

        await subscriptionService.syncSubscriptionAfterPayment()
      } catch {
        openPlansModal()
      } finally {
        setCheckingOut(false)
      }
    },
    [checkingOut, online, openPlansModal, t]
  )

  return { startCheckout, checkingOut }
}
