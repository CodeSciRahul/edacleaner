import { Activity, Clock, MemoryStick } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import type { HealthStatus } from '../types'
import type { SystemMetricsSample } from '@shared/interfaces'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

const healthCopy: Record<HealthStatus, string> = {
  normal: 'System load looks healthy.',
  warning: 'Resources are elevated — keep an eye on heavy apps.',
  critical: 'High pressure detected — consider freeing memory or closing apps.'
}

interface SystemOverviewCardProps {
  latest: SystemMetricsSample | null
  overallStatus: HealthStatus
  sampleCount: number
  timeRangeLabel: string
  isLive: boolean
  paused: boolean
}

export function SystemOverviewCard({
  latest,
  overallStatus,
  sampleCount,
  timeRangeLabel,
  isLive,
  paused
}: SystemOverviewCardProps): React.ReactElement {
  const { t } = useTranslation()

  const sessionValue = paused
    ? `${t('monitoring.paused')} · ${sampleCount} pts · ${timeRangeLabel}`
    : isLive
      ? `${t('monitoring.live')} · ${sampleCount} pts · ${timeRangeLabel}`
      : `${t('monitoring.offline')} · ${sampleCount} pts`

  return (
    <section
      aria-label={t('monitoring.overview')}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-section-title text-foreground">{t('monitoring.overview')}</h2>
      </div>

      <p
        className={cn(
          'mb-4 text-sm',
          overallStatus === 'critical'
            ? 'text-destructive'
            : overallStatus === 'warning'
              ? 'text-warning'
              : 'text-muted-foreground'
        )}
      >
        {healthCopy[overallStatus]}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewItem
          icon={MemoryStick}
          label={t('monitoring.memoryUsed')}
          value={
            latest
              ? `${formatBytes(latest.memory.used)} / ${formatBytes(latest.memory.total)}`
              : '—'
          }
        />
        <OverviewItem
          icon={Clock}
          label={t('monitoring.lastUpdate')}
          value={
            latest
              ? new Date(latest.at).toLocaleTimeString()
              : '—'
          }
        />
        <OverviewItem
          icon={Activity}
          label={t('monitoring.session')}
          value={sessionValue}
        />
      </div>
    </section>
  )
}

function OverviewItem({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity
  label: string
  value: string
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-border bg-muted/25 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="truncate text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  )
}
