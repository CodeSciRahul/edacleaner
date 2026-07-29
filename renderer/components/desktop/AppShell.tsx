import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TitleBar } from '@/components/layout/TitleBar'

interface AppShellProps {
  children: ReactNode
  toolbar?: ReactNode
}

export function AppShell({ children, toolbar }: AppShellProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <TitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {toolbar}
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  )
}
