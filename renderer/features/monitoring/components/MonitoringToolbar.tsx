import { Pause, Play, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import type { MetricId, TimeRangeId, TimeRangeOption } from '../types'
import type { MetricDefinition } from '../types'
import { useTranslation } from '@/i18n/useTranslation'

interface MonitoringToolbarProps {
  paused: boolean
  isLive: boolean
  isRefreshing: boolean
  timeRange: TimeRangeId
  timeRangeOptions: TimeRangeOption[]
  visibleMetrics: MetricId[]
  metricDefinitions: MetricDefinition[]
  onPause: () => void
  onResume: () => void
  onRefresh: () => void
  onTimeRangeChange: (id: TimeRangeId) => void
  onToggleMetric: (id: MetricId) => void
}

export function MonitoringToolbar({
  paused,
  isLive,
  isRefreshing,
  timeRange,
  timeRangeOptions,
  visibleMetrics,
  metricDefinitions,
  onPause,
  onResume,
  onRefresh,
  onTimeRangeChange,
  onToggleMetric
}: MonitoringToolbarProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          'h-8 gap-1.5 rounded-lg px-2.5 font-medium',
          paused
            ? 'border-warning/30 bg-warning/10 text-warning'
            : isLive
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-border bg-muted text-muted-foreground'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            paused ? 'bg-warning' : isLive ? 'bg-success animate-pulse' : 'bg-muted-foreground'
          )}
        />
        {paused
          ? t('monitoring.paused')
          : isLive
            ? t('monitoring.live')
            : t('monitoring.offline')}
      </Badge>

      {paused ? (
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onResume}>
          <Play className="h-3.5 w-3.5" />
          {t('monitoring.resume')}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onPause}>
          <Pause className="h-3.5 w-3.5" />
          {t('monitoring.pause')}
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        {t('common.refresh')}
      </Button>

      <label className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground">
        <span className="sr-only">Time range</span>
        <select
          className="bg-transparent text-foreground outline-none"
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value as TimeRangeId)}
          aria-label="Graph time range"
        >
          {timeRangeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
        {metricDefinitions.map((metric) => {
          const visible = visibleMetrics.includes(metric.id)
          const shortLabel = t(metric.shortLabelKey)
          return (
            <Button
              key={metric.id}
              size="sm"
              variant="ghost"
              className={cn(
                'h-7 gap-1.5 px-2 text-xs',
                visible ? 'text-foreground' : 'text-muted-foreground'
              )}
              aria-pressed={visible}
              aria-label={`${visible ? 'Hide' : 'Show'} ${shortLabel}`}
              onClick={() => onToggleMetric(metric.id)}
            >
              {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {shortLabel}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
