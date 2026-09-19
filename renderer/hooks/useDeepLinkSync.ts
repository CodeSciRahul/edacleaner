import { useEffect } from 'react'
import { authService } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import { subscriptionService } from '@/features/subscription/services/subscription-service'

/**
 * Listens for `edacleaner://` deep links from checkout / billing portal returns.
 * Main process already syncs; this keeps renderer session state fresh if
 * SESSION_CHANGED was missed during window focus transitions.
 */
export function useDeepLinkSync(): void {
  useEffect(() => {
    return electronService.app().onDeepLink((event) => {
      if (event.action === 'checkout-success') {
        void authService.sync('deep-link-checkout-success').catch(() => {
          // Main-process sync may already have succeeded; ignore soft failures.
        })
        return
      }
      if (event.action === 'billing-portal-return') {
        void subscriptionService
          .syncSubscriptionAfterBillingPortal('deep-link-billing-portal')
          .catch(() => {
            void authService.sync('deep-link-billing-portal').catch(() => null)
          })
      }
    })
  }, [])
}
