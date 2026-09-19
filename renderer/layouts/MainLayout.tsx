import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/desktop/AppShell'
import { useDeepLinkSync } from '@/hooks/useDeepLinkSync'
import { useBillingPortalReturnSync } from '@/features/subscription/hooks/useBillingPortalReturnSync'
import { EntitlementsHost } from '@/features/entitlements/components/EntitlementsHost'

export function MainLayout(): React.ReactElement {
  useDeepLinkSync()
  useBillingPortalReturnSync()

  return (
    <AppShell>
      <EntitlementsHost />
      <Outlet />
    </AppShell>
  )
}
