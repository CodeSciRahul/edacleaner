import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useOfflineEngine } from '@/hooks/useOfflineEngine'

interface AppShellProps {
  children: ReactNode
  toolbar?: ReactNode
}

export function AppShell({ children, toolbar }: AppShellProps): React.ReactElement {
  // Bind offline engine (network, sync, queue) for sidebar indicators — no workflow change.
  useOfflineEngine()

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {toolbar}
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
