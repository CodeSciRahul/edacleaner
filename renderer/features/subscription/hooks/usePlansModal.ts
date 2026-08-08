import { useCallback, useEffect, useRef, useState } from 'react'
import { useOfflineStore } from '@/store/offline-store'
import { authService } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import {
  normalizePlanSlug,
  resolvePlanAction,
  type PlanSlug,
  type PublicPlan
} from '@/features/subscription/lib/plans'
import { subscriptionService } from '@/features/subscription/services/subscription-service'
import { useTranslation } from '@/i18n/useTranslation'

export type PlanChangeFeedback =
  | { type: 'checkout-opened' }
  | { type: 'upgraded' }
  | { type: 'downgrade-scheduled' }
  | null

interface UsePlansModalOptions {
  open: boolean
  onSubscriptionUpdated?: () => void
}

export function usePlansModal({ open, onSubscriptionUpdated }: UsePlansModalOptions) {
  const { t } = useTranslation()
  const online = useOfflineStore((s) => s.online)

  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [currentPlan, setCurrentPlan] = useState<PlanSlug>('free')
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [actionPlanId, setActionPlanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<PlanChangeFeedback>(null)
  const awaitingCheckoutReturn = useRef(false)
  const loadGeneration = useRef(0)
  const onUpdatedRef = useRef(onSubscriptionUpdated)
  onUpdatedRef.current = onSubscriptionUpdated

  const refreshLocalSubscription = useCallback(async () => {
    const snapshot = await authService.getSubscription()
    setCurrentPlan(normalizePlanSlug(snapshot.plan))
    setPendingPlan(snapshot.subscription?.pendingPlan ?? null)
    return snapshot
  }, [])

  const loadCatalog = useCallback(async () => {
    const gen = ++loadGeneration.current
    setLoadingPlans(true)
    setError(null)
    try {
      await refreshLocalSubscription()
      const list = await subscriptionService.listPlans()
      if (gen !== loadGeneration.current) return
      setPlans(list)
      if (list.length === 0) {
        setError(t('plans.error.empty'))
      }
    } catch (err) {
      if (gen !== loadGeneration.current) return
      const mapped = subscriptionService.mapError(err)
      setError(
        mapped.unauthorized
          ? t('plans.error.unauthorized')
          : !online
            ? t('plans.error.offlineLoad')
            : mapped.message || t('plans.error.load')
      )
    } finally {
      if (gen === loadGeneration.current) {
        setLoadingPlans(false)
      }
    }
  }, [online, refreshLocalSubscription, t])

  useEffect(() => {
    if (!open) {
      setActionPlanId(null)
      setError(null)
      setFeedback(null)
      awaitingCheckoutReturn.current = false
      return
    }
    void loadCatalog()
  }, [open, loadCatalog])

  useEffect(() => {
    if (!open) return

    const syncAfterReturn = async (): Promise<void> => {
      if (!awaitingCheckoutReturn.current) return
      try {
        await subscriptionService.syncSubscriptionAfterPayment()
        await refreshLocalSubscription()
        setFeedback({ type: 'upgraded' })
        awaitingCheckoutReturn.current = false
        onUpdatedRef.current?.()
      } catch {
        // Keep waiting; user may still be finishing checkout.
      }
    }

    const onFocus = (): void => {
      void syncAfterReturn()
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void syncAfterReturn()
      }
    }

    const unsubDeepLink = electronService.app().onDeepLink((event) => {
      if (event.action === 'checkout-success') {
        awaitingCheckoutReturn.current = true
        void syncAfterReturn()
      }
    })

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubDeepLink()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [open, refreshLocalSubscription])

  const selectPlan = useCallback(
    async (plan: PublicPlan) => {
      const target = normalizePlanSlug(plan.slug)
      const action = resolvePlanAction(currentPlan, target)
      if (action === 'current' || actionPlanId) return

      if (!online) {
        setError(t('plans.error.offlineAction'))
        return
      }

      setActionPlanId(plan.id)
      setError(null)
      setFeedback(null)

      try {
        const result = await subscriptionService.changePlan(plan.id)

        if (subscriptionService.isCheckoutResult(result)) {
          if (!result.url) {
            throw new Error(t('plans.error.missingCheckoutUrl'))
          }
          await subscriptionService.openCheckoutUrl(result.url)
          awaitingCheckoutReturn.current = true
          setFeedback({ type: 'checkout-opened' })
          return
        }

        await subscriptionService.syncSubscriptionAfterPayment()
        await refreshLocalSubscription()
        setFeedback({
          type: result.mode === 'scheduled' ? 'downgrade-scheduled' : 'upgraded'
        })
        onUpdatedRef.current?.()
      } catch (err) {
        const mapped = subscriptionService.mapError(err)
        setError(
          mapped.unauthorized
            ? t('plans.error.unauthorized')
            : mapped.message || t('plans.error.change')
        )
      } finally {
        setActionPlanId(null)
      }
    },
    [actionPlanId, currentPlan, online, refreshLocalSubscription, t]
  )

  return {
    plans,
    currentPlan,
    pendingPlan,
    loadingPlans,
    actionPlanId,
    error,
    feedback,
    online,
    reload: loadCatalog,
    selectPlan
  }
}
