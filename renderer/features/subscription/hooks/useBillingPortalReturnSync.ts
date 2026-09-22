import { useEffect } from 'react'
import { authService } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import { subscriptionService } from '@/features/subscription/services/subscription-service'

/**
 * After Stripe Customer Portal opens in the system browser, refresh the
 * local subscription when the user returns (window focus or deep link).
 */
export function useBillingPortalReturnSync(): void {
  useEffect(() => {
    const syncFromFocus = (): void => {
      void subscriptionService.syncBillingPortalIfAwaiting().catch(() => {
        // Keep awaiting; user may still be finishing portal actions.
      })
    }

    const onFocus = (): void => {
      syncFromFocus()
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') syncFromFocus()
    }

    const unsubDeepLink = electronService.app().onDeepLink((event) => {
      if (event.action !== 'billing-portal-return') return
      void subscriptionService
        .syncSubscriptionAfterBillingPortal('deep-link-billing-portal')
        .catch(() => {
          void authService.sync('deep-link-billing-portal').catch(() => null)
        })
    })

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubDeepLink()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
