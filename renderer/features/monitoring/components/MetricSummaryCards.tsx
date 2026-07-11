import { Cpu, MemoryStick } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { HealthStatus, MetricDefinition, MetricStats } from '../types'

const statusStyles: Record<HealthStatus, string> = {
  normal: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
}

const statusLabel: Record<HealthStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical'
}

interface MetricSummaryCardsProps {
  metrics: Array<{
    definition: MetricDefinition
    stats: MetricStats | null
  }>
  isLoading: boolean
}

export function MetricSummaryCards({
  metrics,
  isLoading
}: MetricSummaryCardsProps): React.ReactElement {
  return (
    <section aria-label="Performance summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ definition, stats }) => {
        const Icon = definition.iconName === 'cpu' ? Cpu : MemoryStick
        const status = stats?.status ?? 'normal'

        return (
          <article
            key={definition.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${definition.color}18`, color: definition.color }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{definition.label}</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {isLoading || !stats ? '…' : `${stats.current.toFixed(1)}${definition.unit}`}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                statusStyles[status]
              )}
            >
              {stats ? statusLabel[status] : '—'}
            </span>
          </article>
        )
      })}
    </section>
  )
}
