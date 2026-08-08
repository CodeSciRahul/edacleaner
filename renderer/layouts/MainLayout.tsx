import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/desktop/AppShell'
import { useDeepLinkSync } from '@/hooks/useDeepLinkSync'

export function MainLayout(): React.ReactElement {
  useDeepLinkSync()

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
