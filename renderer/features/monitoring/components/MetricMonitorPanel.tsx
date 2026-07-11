import { Cpu, Maximize2, MemoryStick } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { LiveMetricChart } from './LiveMetricChart'
import type { ChartPoint, HealthStatus, MetricDefinition, MetricStats } from '../types'

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

interface MetricMonitorPanelProps {
  definition: MetricDefinition
  points: ChartPoint[]
  stats: MetricStats | null
  isLoading: boolean
  onExpand: () => void
}

export function MetricMonitorPanel({
  definition,
  points,
  stats,
  isLoading,
  onExpand
}: MetricMonitorPanelProps): React.ReactElement {
  const Icon = definition.iconName === 'cpu' ? Cpu : MemoryStick
  const status = stats?.status ?? 'normal'

  return (
    <section
      aria-label={definition.label}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${definition.color}18`, color: definition.color }}
          >
            <Icon className="h-4.5 w-4.5 h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">{definition.label}</h2>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {isLoading || !stats ? '…' : stats.current.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">{definition.unit}</span>
              <span
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                  statusStyles[status]
                )}
              >
                {stats ? statusLabel[status] : '—'}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-muted-foreground"
          onClick={onExpand}
          aria-label={`Expand ${definition.label}`}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Expand
        </Button>
      </div>

      <div className="px-3 pt-2">
        {points.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            Waiting for live samples…
          </div>
        ) : (
          <LiveMetricChart
            points={points}
            color={definition.color}
            label={definition.label}
            unit={definition.unit}
          />
        )}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-px border-t border-border bg-border">
        <FooterStat label="Min" value={stats ? `${stats.min}${definition.unit}` : '—'} />
        <FooterStat label="Avg" value={stats ? `${stats.avg}${definition.unit}` : '—'} />
        <FooterStat label="Max" value={stats ? `${stats.max}${definition.unit}` : '—'} />
      </div>
    </section>
  )
}

function FooterStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="bg-card px-4 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}
