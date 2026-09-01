import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import type { DashboardMetrics } from '@/features/home/hooks/useDashboardMetrics'
import { DashboardLiveSnapshotCard } from '@/features/home/components/DashboardLiveSnapshotCard'

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
          <div className="flex items-center gap-2">
            <span
              className="relative flex h-2 w-2 shrink-0"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <h2 className="text-section-title text-foreground">{t('home.liveMetrics')}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('home.liveMetricsHint')}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            'h-8 gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 text-xs',
            'text-primary hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
          )}
          onClick={() => navigate('/monitoring')}
        >
          <Activity className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          {t('home.openMonitoring')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {isLoading || !metrics ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <DashboardLiveSnapshotCard
            metricId="cpu"
            label={t('home.metric.cpu')}
            hint={t('home.metric.cpuHint')}
            value={metrics.cpu}
          />
          <DashboardLiveSnapshotCard
            metricId="ram"
            label={t('home.metric.ram')}
            hint={t('home.metric.ramHint', { free: metrics.freeMemoryLabel })}
            value={metrics.ram}
          />
          <DashboardLiveSnapshotCard
            metricId="disk"
            label={t('home.metric.disk')}
            hint={t('home.metric.diskHint', { free: metrics.diskFreeLabel })}
            value={metrics.disk}
          />
        </div>
      )}
    </section>
  )
}
