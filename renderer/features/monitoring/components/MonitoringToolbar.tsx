import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { MetricDefinition, MetricId, TimeRangeId, TimeRangeOption } from '../types'
import { useTranslation } from '@/i18n/useTranslation'

interface MonitoringToolbarProps {
  timeRange: TimeRangeId
  timeRangeOptions: TimeRangeOption[]
  visibleMetrics: MetricId[]
  metricDefinitions: MetricDefinition[]
  onTimeRangeChange: (id: TimeRangeId) => void
  onToggleMetric: (id: MetricId) => void
  disabled?: boolean
}

export function MonitoringToolbar({
  timeRange,
  timeRangeOptions,
  visibleMetrics,
  metricDefinitions,
  onTimeRangeChange,
  onToggleMetric,
  disabled = false
}: MonitoringToolbarProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground',
          'shadow-sm',
          disabled && 'opacity-60'
        )}
      >
        <span className="hidden sm:inline">{t('monitoring.controls.range')}</span>
        <select
          className="bg-transparent font-medium text-foreground outline-none"
          value={timeRange}
          disabled={disabled}
          onChange={(e) => onTimeRangeChange(e.target.value as TimeRangeId)}
          aria-label={t('monitoring.controls.range')}
        >
          {timeRangeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm">
        {metricDefinitions.map((metric) => {
          const visible = visibleMetrics.includes(metric.id)
          const shortLabel = t(metric.shortLabelKey)
          return (
            <Button
              key={metric.id}
              size="sm"
              variant="ghost"
              disabled={disabled}
              className={cn(
                'h-7 gap-1.5 rounded-md px-2 text-xs',
                visible
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={visible}
              aria-label={
                visible
                  ? t('monitoring.controls.hideMetric', { metric: shortLabel })
                  : t('monitoring.controls.showMetric', { metric: shortLabel })
              }
              onClick={() => onToggleMetric(metric.id)}
            >
              {visible ? (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {shortLabel}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
