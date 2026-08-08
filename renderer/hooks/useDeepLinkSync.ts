import { useEffect } from 'react'
import { authService } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'

/**
 * Listens for `edacleaner://` deep links from the marketing checkout return page.
 * Main process already syncs on checkout-success; this ensures renderer state refreshes
 * even if SESSION_CHANGED was missed during window focus transitions.
 */
export function useDeepLinkSync(): void {
  useEffect(() => {
    return electronService.app().onDeepLink((event) => {
      if (event.action !== 'checkout-success') return
      void authService.sync('deep-link-checkout-success').catch(() => {
        // Main-process sync may already have succeeded; ignore soft failures.
      })
    })
  }, [])
}
