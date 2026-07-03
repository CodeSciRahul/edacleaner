import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export function MainLayout(): React.ReactElement {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  )
}
