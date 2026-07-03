import { Monitor } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function AppHeader(): React.ReactElement {
  const appName = useAppStore((state) => state.appName)

  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Monitor className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-foreground">{appName}</span>
      </div>
    </header>
  )
}
