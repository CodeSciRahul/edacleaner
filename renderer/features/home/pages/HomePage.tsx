import { ScanSearch, Trash2, Cpu, HardDrive } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { MetricCard } from '@/components/desktop/MetricCard'
import { StatusCard } from '@/components/desktop/StatusCard'
import { PerformanceGraph } from '@/components/desktop/PerformanceGraph'
import { TopProcessesTable } from '@/components/desktop/TopProcessesTable'
import { useDashboardMetrics } from '@/features/home/hooks/useDashboardMetrics'
import { useTranslation } from '@/i18n/useTranslation'

const performanceData = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? '0s' : i === 23 ? '60s' : '',
  value: 20 + Math.sin(i / 3) * 15 + Math.random() * 10
}))

const topProcesses = [
  { name: 'Chrome', cpu: 12.4 },
  { name: 'VS Code', cpu: 8.2 },
  { name: 'Spotify', cpu: 4.1 },
  { name: 'Explorer', cpu: 2.8 }
]

export function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { metrics, isLoading } = useDashboardMetrics()

  return (
    <>
      <Toolbar
        title={t('home.title')}
        description={t('home.description')}
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => navigate('/smart-scan')}
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            {t('home.scanNow')}
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <StatusCard
          icon={ScanSearch}
          title={t('home.healthTitle')}
          status="good"
          message={t('home.healthMessage')}
        />

        <section aria-label={t('home.liveMetrics')}>
          <h2 className="mb-4 text-section-title text-foreground">{t('home.liveMetrics')}</h2>
          {isLoading || !metrics ? (
            <div className="grid grid-cols-2 gap-grid-gap lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-grid-gap lg:grid-cols-5">
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.cpu} color="cpu" label={t('home.metric.cpu')} size={100} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.ram} color="ram" label={t('home.metric.ram')} size={100} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.disk} color="disk" label={t('home.metric.disk')} size={100} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.battery} color="battery" label={t('home.metric.battery')} size={100} />
              </div>
              <div className="col-span-2 flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-1">
                <CircularProgress value={metrics.network} color="network" label={t('home.metric.network')} size={100} />
              </div>
            </div>
          )}
        </section>

        <section aria-label={t('home.quickActions')}>
          <h2 className="mb-4 text-section-title text-foreground">{t('home.quickActions')}</h2>
          <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Trash2}
              title={t('home.junkTitle')}
              description={t('home.junkDesc')}
              value={metrics?.junkSize ?? '—'}
              actionLabel={t('home.junkAction')}
              onAction={() => navigate('/cleanup')}
            />
            <MetricCard
              icon={Cpu}
              title={t('home.ramTitle')}
              description={t('home.ramDesc')}
              value={metrics?.ramRecoverable ?? '—'}
              actionLabel={t('home.ramAction')}
              onAction={() => navigate('/performance')}
            />
            <MetricCard
              icon={HardDrive}
              title={t('home.startupTitle')}
              description={t('home.startupDesc')}
              value={metrics ? t('common.items', { count: metrics.startupCount }) : '—'}
              actionLabel={t('home.startupAction')}
              onAction={() => navigate('/performance')}
            />
            <MetricCard
              icon={ScanSearch}
              title={t('home.driverTitle')}
              description={t('home.driverDesc')}
              value={metrics ? t('common.updates', { count: metrics.driverUpdates }) : '—'}
              actionLabel={t('home.driverAction')}
              onAction={() => navigate('/settings')}
            />
          </div>
        </section>

        <div className="grid gap-grid-gap xl:grid-cols-2">
          <PerformanceGraph title={t('home.perfMonitor')} data={performanceData} color="cpu" />
          <TopProcessesTable processes={topProcesses} />
        </div>
      </div>
    </>
  )
}
