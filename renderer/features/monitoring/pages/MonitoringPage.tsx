import { useMemo, useState } from 'react'
import { AlertCircle, Activity } from 'lucide-react'
import { Toolbar } from '@/components/desktop/Toolbar'
import { Button } from '@/components/ui/Button'
import { useMonitoringSession } from '../hooks/useMonitoringSession'
import { MonitoringToolbar } from '../components/MonitoringToolbar'
import { MetricSummaryCards } from '../components/MetricSummaryCards'
import { MetricMonitorPanel } from '../components/MetricMonitorPanel'
import { MetricExpandDialog } from '../components/MetricExpandDialog'
import { SystemOverviewCard } from '../components/SystemOverviewCard'
import type { MetricId } from '../types'
import { getTimeRangeOption } from '../lib/metric-config'
import { useTranslation } from '@/i18n/useTranslation'

export function MonitoringPage(): React.ReactElement {
  const { t } = useTranslation()
  const session = useMonitoringSession()
  const [expandedId, setExpandedId] = useState<MetricId | null>(null)

  const summaryMetrics = useMemo(
    () =>
      session.metricDefinitions
        .filter((d) => session.visibleMetrics.includes(d.id))
        .map((definition) => ({
          definition,
          stats: session.metricSeries.get(definition.id)?.stats ?? null
        })),
    [session.metricDefinitions, session.visibleMetrics, session.metricSeries]
  )

  const visiblePanels = useMemo(
    () =>
      session.metricDefinitions.filter((d) => session.visibleMetrics.includes(d.id)),
    [session.metricDefinitions, session.visibleMetrics]
  )

  const expandedDef =
    expandedId != null
      ? session.metricDefinitions.find((d) => d.id === expandedId)
      : undefined
  const expandedSeries = expandedId != null ? session.metricSeries.get(expandedId) : undefined

  const timeRangeLabel = t(getTimeRangeOption(session.timeRange).labelKey)

  return (
    <>
      <Toolbar
        title={t('monitoring.title')}
        description={t('monitoring.description')}
        actions={
          <MonitoringToolbar
            paused={session.paused}
            isLive={session.isLive}
            isRefreshing={session.isRefreshing}
            timeRange={session.timeRange}
            timeRangeOptions={session.timeRangeOptions}
            visibleMetrics={session.visibleMetrics}
            metricDefinitions={session.metricDefinitions}
            onPause={() => void session.pause()}
            onResume={() => void session.resume()}
            onRefresh={() => void session.refresh()}
            onTimeRangeChange={session.setTimeRange}
            onToggleMetric={session.toggleMetricVisibility}
          />
        }
      />

      <div className="space-y-6 p-content-pad">
        {session.error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('monitoring.unavailable')}</p>
              <p className="mt-0.5 opacity-90">{session.error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void session.refresh()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : null}

        {session.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : (
          <MetricSummaryCards metrics={summaryMetrics} isLoading={session.isLoading} />
        )}

        {!session.isLoading && session.samples.length === 0 && !session.error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <Activity className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{t('monitoring.noSamples')}</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {t('monitoring.noSamplesHint')}
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => void session.refresh()}
            >
              {t('monitoring.sampleNow')}
            </Button>
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

        {visiblePanels.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            {t('monitoring.allHidden')}
          </div>
        ) : null}

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
