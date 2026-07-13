import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight } from 'lucide-react'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/useTranslation'
import type { DashboardMetrics } from '@/features/home/hooks/useDashboardMetrics'

interface DashboardLiveSnapshotProps {
  metrics: DashboardMetrics | null
  isLoading: boolean
}

export function DashboardLiveSnapshot({
  metrics,
  isLoading
}: DashboardLiveSnapshotProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section aria-label={t('home.liveMetrics')}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-section-title text-foreground">{t('home.liveMetrics')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('home.liveMetricsHint')}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={() => navigate('/monitoring')}
        >
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          {t('home.openMonitoring')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {isLoading || !metrics ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[148px] animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricRing
            value={metrics.cpu}
            color="cpu"
            label={t('home.metric.cpu')}
            hint={t('home.metric.cpuHint')}
          />
          <MetricRing
            value={metrics.ram}
            color="ram"
            label={t('home.metric.ram')}
            hint={t('home.metric.ramHint', { free: metrics.freeMemoryLabel })}
          />
          <MetricRing
            value={metrics.disk}
            color="disk"
            label={t('home.metric.disk')}
            hint={t('home.metric.diskHint', { free: metrics.diskFreeLabel })}
          />
        </div>
      )}
    </section>
  )
}

function MetricRing({
  value,
  color,
  label,
  hint
}: {
  value: number
  color: 'cpu' | 'ram' | 'disk'
  label: string
  hint: string
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-4 py-5 shadow-card transition-shadow duration-200 hover:shadow-md">
      <CircularProgress value={value} color={color} label={label} size={96} strokeWidth={8} />
      <p className="mt-3 text-center text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
