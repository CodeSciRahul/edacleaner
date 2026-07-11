import { Loader2 } from 'lucide-react'

interface BoostProgressPanelProps {
  message: string
  percent: number
  currentItem?: string
}

export function BoostProgressPanel({
  message,
  percent,
  currentItem
}: BoostProgressPanelProps): React.ReactElement {
  return (
    <section
      aria-label="Boost progress"
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-primary/25 bg-card shadow-card"
    >
      <div className="border-b border-border/60 bg-primary/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{message}</p>
          <span className="ml-auto text-sm font-semibold tabular-nums text-primary">
            {percent}%
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-chart-ram transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
        {currentItem ? (
          <p className="mt-2 truncate text-xs text-muted-foreground">{currentItem}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Working through safe cleanup steps…</p>
        )}
      </div>
    </section>
  )
}
