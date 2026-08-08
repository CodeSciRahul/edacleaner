import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/desktop/AppShell'
import { useDeepLinkSync } from '@/hooks/useDeepLinkSync'
import { EntitlementsHost } from '@/features/entitlements/components/EntitlementsHost'

export function MainLayout(): React.ReactElement {
  useDeepLinkSync()

  return (
    <AppShell>
      <EntitlementsHost />
      <Outlet />
    </AppShell>
  )
}
