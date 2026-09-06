import { Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { LiveMetricChart } from './LiveMetricChart'
import { getMonitoringSummaryVisual } from '../lib/summary-meta'
import type { ChartPoint, HealthStatus, MetricDefinition, MetricStats } from '../types'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

const statusStyles: Record<HealthStatus, string> = {
  normal: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
}

const statusLabelKey: Record<HealthStatus, TranslationKey> = {
  normal: 'monitoring.level.normal',
  warning: 'monitoring.level.warning',
  critical: 'monitoring.level.critical'
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
  const { t } = useTranslation()
  const label = t(definition.labelKey)
  const visual = getMonitoringSummaryVisual(definition.id)
  const Icon = visual.icon
  const status = stats?.status ?? 'normal'

  return (
    <section
      aria-label={label}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-300',
        'transition-shadow duration-150 hover:shadow-card-hover'
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              visual.iconWrapClass
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{label}</h2>
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
                {stats ? t(statusLabelKey[status]) : '—'}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-lg text-muted-foreground"
          onClick={onExpand}
          aria-label={t('monitoring.expandMetric', { metric: label })}
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('monitoring.expand')}
        </Button>
      </div>

      <div className="px-3 pt-2">
        {points.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            {t('monitoring.waitingSamples')}
          </div>
        ) : (
          <LiveMetricChart
            points={points}
            color={definition.color}
            label={label}
            unit={definition.unit}
          />
        )}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-px border-t border-border bg-border">
        <FooterStat
          label={t('monitoring.min')}
          value={stats ? `${stats.min}${definition.unit}` : '—'}
        />
        <FooterStat
          label={t('monitoring.avg')}
          value={stats ? `${stats.avg}${definition.unit}` : '—'}
        />
        <FooterStat
          label={t('monitoring.max')}
          value={stats ? `${stats.max}${definition.unit}` : '—'}
        />
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
