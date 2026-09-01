import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useOfflineEngine } from '@/hooks/useOfflineEngine'

interface AppShellProps {
  children: ReactNode
  toolbar?: ReactNode
}

export function AppShell({ children, toolbar }: AppShellProps): React.ReactElement {
  useOfflineEngine()

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {toolbar}
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
