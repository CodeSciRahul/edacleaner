import { Outlet } from 'react-router-dom'
import { AppShell } from '@/components/desktop/AppShell'

export function MainLayout(): React.ReactElement {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
