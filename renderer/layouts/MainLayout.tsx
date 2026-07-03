import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'

export function MainLayout(): React.ReactElement {
  return (
    <div className="app-container">
      <AppHeader />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
