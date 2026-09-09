import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LiveMetricChart } from './LiveMetricChart'
import type { ChartPoint, MetricDefinition, MetricStats } from '../types'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

interface MetricExpandDialogProps {
  open: boolean
  onClose: () => void
  definition: MetricDefinition
  points: ChartPoint[]
  stats: MetricStats | null
}

export function MetricExpandDialog({
  open,
  onClose,
  definition,
  points,
  stats
}: MetricExpandDialogProps): React.ReactElement | null {
  const { t } = useTranslation()
  const label = t(definition.labelKey)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('monitoring.expandMetric', { metric: label })}
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-card animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-section-title text-foreground">{label}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stats
                ? t('monitoring.expandStats', {
                    current: `${stats.current.toFixed(1)}${definition.unit}`,
                    avg: `${stats.avg}${definition.unit}`
                  })
                : t('monitoring.waitingSamples')}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <LiveMetricChart
          points={points}
          color={definition.color}
          label={label}
          unit={definition.unit}
          variant="expanded"
        />

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatBox
            label={t('monitoring.min')}
            value={stats ? `${stats.min}${definition.unit}` : '—'}
          />
          <StatBox
            label={t('monitoring.avg')}
            value={stats ? `${stats.avg}${definition.unit}` : '—'}
          />
          <StatBox
            label={t('monitoring.max')}
            value={stats ? `${stats.max}${definition.unit}` : '—'}
          />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className={cn('rounded-xl border border-border bg-muted/30 px-3 py-2')}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}
