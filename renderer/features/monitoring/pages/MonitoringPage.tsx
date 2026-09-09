import { useMemo, useState } from 'react'
import { Activity, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusCard } from '@/components/desktop/StatusCard'
import { useMonitoringSession } from '../hooks/useMonitoringSession'
import { MonitoringHero, type MonitoringHeroPhase } from '../components/MonitoringHero'
import { MonitoringToolbar } from '../components/MonitoringToolbar'
import { MetricMonitorPanel } from '../components/MetricMonitorPanel'
import { MetricExpandDialog } from '../components/MetricExpandDialog'
import { SystemOverviewCard } from '../components/SystemOverviewCard'
import type { HealthStatus, MetricId } from '../types'
import { getTimeRangeOption } from '../lib/metric-config'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'

const healthTitleKey: Record<HealthStatus, TranslationKey> = {
  normal: 'monitoring.hero.healthyTitle',
  warning: 'monitoring.hero.warningTitle',
  critical: 'monitoring.hero.criticalTitle'
}

const healthMessageKey: Record<HealthStatus, TranslationKey> = {
  normal: 'monitoring.health.normal',
  warning: 'monitoring.health.warning',
  critical: 'monitoring.health.critical'
}

const statusCardStatus: Record<HealthStatus, 'good' | 'warning' | 'critical'> = {
  normal: 'good',
  warning: 'warning',
  critical: 'critical'
}

export function MonitoringPage(): React.ReactElement {
  const { t } = useTranslation()
  const monitorAccess = useFeatureAccess('live_monitor')
  const session = useMonitoringSession({ enabled: monitorAccess.allowed })
  const [expandedId, setExpandedId] = useState<MetricId | null>(null)

  const visiblePanels = useMemo(
    () => session.metricDefinitions.filter((d) => session.visibleMetrics.includes(d.id)),
    [session.metricDefinitions, session.visibleMetrics]
  )

  const expandedDef =
    expandedId != null
      ? session.metricDefinitions.find((d) => d.id === expandedId)
      : undefined
  const expandedSeries = expandedId != null ? session.metricSeries.get(expandedId) : undefined

  const timeRangeLabel = t(getTimeRangeOption(session.timeRange).labelKey)

  const heroPhase = useMemo((): MonitoringHeroPhase => {
    if (!monitorAccess.allowed) return 'offline'
    if (session.error) return 'error'
    if (session.paused) return 'paused'
    if (session.isLoading) return 'loading'
    if (session.isLive) return 'live'
    return 'offline'
  }, [
    monitorAccess.allowed,
    session.error,
    session.paused,
    session.isLoading,
    session.isLive
  ])

  const { heroTitle, heroMessage } = useMemo(() => {
    if (!monitorAccess.allowed) {
      return {
        heroTitle: t('monitoring.hero.lockedTitle'),
        heroMessage: t('monitoring.hero.lockedMsg')
      }
    }
    if (session.error) {
      return {
        heroTitle: t('monitoring.unavailable'),
        heroMessage: session.error
      }
    }
    if (session.paused) {
      return {
        heroTitle: t('monitoring.hero.pausedTitle'),
        heroMessage: t('monitoring.hero.pausedMsg')
      }
    }
    if (session.isLoading) {
      return {
        heroTitle: t('monitoring.hero.loadingTitle'),
        heroMessage: t('monitoring.hero.loadingMsg')
      }
    }
    return {
      heroTitle: t(healthTitleKey[session.overallStatus]),
      heroMessage: t(healthMessageKey[session.overallStatus])
    }
  }, [
    monitorAccess.allowed,
    session.error,
    session.paused,
    session.isLoading,
    session.overallStatus,
    t
  ])

  const cpuStats = session.metricSeries.get('cpu')?.stats
  const memoryStats = session.metricSeries.get('memory')?.stats
  const cpuLabel = cpuStats ? `${cpuStats.current.toFixed(1)}%` : session.isLoading ? '…' : '—'
  const memoryLabel = memoryStats
    ? `${memoryStats.current.toFixed(1)}%`
    : session.isLoading
      ? '…'
      : '—'

  const statusCard = useMemo(() => {
    if (session.error) {
      return {
        icon: AlertCircle,
        status: 'critical' as const,
        title: t('monitoring.unavailable'),
        message: session.error
      }
    }
    if (session.paused) {
      return {
        icon: Activity,
        status: 'warning' as const,
        title: t('monitoring.hero.pausedTitle'),
        message: t('monitoring.hero.pausedMsg')
      }
    }
    if (session.isLoading) {
      return {
        icon: Activity,
        status: 'good' as const,
        title: t('monitoring.hero.loadingTitle'),
        message: t('monitoring.hero.loadingMsg')
      }
    }
    return {
      icon: session.overallStatus === 'normal' ? Sparkles : Activity,
      status: statusCardStatus[session.overallStatus],
      title: t(healthTitleKey[session.overallStatus]),
      message: t(healthMessageKey[session.overallStatus])
    }
  }, [
    session.error,
    session.paused,
    session.isLoading,
    session.overallStatus,
    t
  ])

  return (
    <>
      <div className="space-y-6 p-content-pad">
        <FeatureLockedCallout feature="live_monitor" />

        <MonitoringHero
          phase={heroPhase}
          overallStatus={session.overallStatus}
          title={heroTitle}
          message={heroMessage}
          cpuLabel={cpuLabel}
          memoryLabel={memoryLabel}
          cpuValue={cpuStats?.current ?? null}
          memoryValue={memoryStats?.current ?? null}
          isRefreshing={session.isRefreshing}
          locked={!monitorAccess.allowed}
          onPause={() => void session.pause()}
          onResume={() => void session.resume()}
          onRefresh={() => void session.refresh()}
        />

        {monitorAccess.allowed ? (
          <StatusCard
            icon={statusCard.icon}
            title={statusCard.title}
            status={statusCard.status}
            message={statusCard.message}
          />
        ) : null}

        {session.error && monitorAccess.allowed ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('monitoring.unavailable')}</p>
              <p className="mt-0.5 opacity-90">{session.error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void session.refresh()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : null}

        <section aria-label={t('monitoring.charts')} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-section-title text-foreground">{t('monitoring.charts')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('monitoring.chartsHint')}</p>
            </div>
            {monitorAccess.allowed ? (
              <MonitoringToolbar
                timeRange={session.timeRange}
                timeRangeOptions={session.timeRangeOptions}
                visibleMetrics={session.visibleMetrics}
                metricDefinitions={session.metricDefinitions}
                onTimeRangeChange={session.setTimeRange}
                onToggleMetric={session.toggleMetricVisibility}
                disabled={!monitorAccess.allowed}
              />
            ) : null}
          </div>

          {!session.isLoading && session.samples.length === 0 && !session.error ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Activity className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{t('monitoring.noSamples')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('monitoring.noSamplesHint')}
                </p>
              </div>
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                onClick={() => void session.refresh()}
                disabled={!monitorAccess.allowed}
              >
                <Activity className="h-4 w-4" aria-hidden="true" />
                {t('monitoring.sampleNow')}
              </Button>
            </div>
          ) : visiblePanels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
              {t('monitoring.allHidden')}
            </div>
          ) : (
            <div className="grid gap-grid-gap xl:grid-cols-2">
              {visiblePanels.map((definition) => {
                const series = session.metricSeries.get(definition.id)
                return (
                  <MetricMonitorPanel
                    key={definition.id}
                    definition={definition}
                    points={series?.points ?? []}
                    stats={series?.stats ?? null}
                    isLoading={session.isLoading}
                    onExpand={() => setExpandedId(definition.id)}
                  />
                )
              })}
            </div>
          )}
        </section>

        <SystemOverviewCard
          latest={session.latest}
          overallStatus={session.overallStatus}
          sampleCount={session.samples.length}
          timeRangeLabel={timeRangeLabel}
          isLive={session.isLive}
          paused={session.paused}
        />
      </div>

      {expandedDef && expandedSeries ? (
        <MetricExpandDialog
          open={expandedId != null}
          onClose={() => setExpandedId(null)}
          definition={expandedDef}
          points={expandedSeries.points}
          stats={expandedSeries.stats}
        />
      ) : null}
    </>
  )
}
