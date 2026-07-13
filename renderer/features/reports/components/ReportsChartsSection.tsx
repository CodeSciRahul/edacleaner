import { ReportsBarChart } from '@/features/reports/components/ReportsBarChart'
import { ReportsStorageChart } from '@/features/reports/components/ReportsStorageChart'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface ReportsChartsSectionProps {
  analytics: ReportsAnalytics
}

export function ReportsChartsSection({
  analytics
}: ReportsChartsSectionProps): React.ReactElement {
  const { t } = useTranslation()
  const weekTotalGb = analytics.weekStorageGb.reduce((sum, p) => sum + p.value, 0)

  return (
    <section aria-label={t('reports.charts.title')} className="space-y-4">
      <div>
        <h2 className="text-section-title text-foreground">{t('reports.charts.title')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('reports.charts.hint')}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportsStorageChart data={analytics.weekStorageGb} weekTotalGb={weekTotalGb} />
        <ReportsBarChart
          title={t('reports.scanFrequency')}
          subtitle={t('reports.scanFrequencyHint')}
          data={analytics.weekScanCounts}
          color="ram"
          height={110}
          formatValue={(v) => t('reports.chart.scans', { count: v })}
          emptyMessage={t('reports.scanFrequencyEmpty')}
        />
        <ReportsBarChart
          title={t('reports.cleanupTrends')}
          subtitle={t('reports.cleanupTrendsHint')}
          data={analytics.weekCleanupCounts}
          color="cpu"
          height={110}
          formatValue={(v) => t('reports.chart.cleanups', { count: v })}
          emptyMessage={t('reports.cleanupTrendsEmpty')}
        />
        <IssuesCompareCard analytics={analytics} />
      </div>
    </section>
  )
}

function IssuesCompareCard({
  analytics
}: {
  analytics: ReportsAnalytics
}): React.ReactElement {
  const { t } = useTranslation()
  const found = Math.max(analytics.issuesFoundLifetime, analytics.issuesFoundLatest)
  const resolved = analytics.issuesResolved
  const max = Math.max(found, resolved, 1)
  const foundPct = Math.round((found / max) * 100)
  const resolvedPct = Math.round((resolved / max) * 100)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-md sm:p-6">
      <div className="mb-5">
        <h3 className="text-card-title font-medium text-foreground">
          {t('reports.issues.title')}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('reports.issues.hint')}</p>
      </div>

      <div className="space-y-5">
        <CompareRow
          label={t('reports.issues.found')}
          value={found}
          pct={foundPct}
          barClass="bg-warning"
          valueClass="text-warning"
        />
        <CompareRow
          label={t('reports.issues.resolved')}
          value={resolved}
          pct={resolvedPct}
          barClass="bg-success"
          valueClass="text-success"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('reports.issues.openNow')}
          </p>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {analytics.issuesFoundLatest}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('reports.mix.title')}
          </p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="bg-primary transition-all duration-500"
              style={{ width: `${analytics.mix.cleanup}%` }}
              title={t('reports.kind.cleanup')}
            />
            <span
              className="bg-chart-ram transition-all duration-500"
              style={{ width: `${analytics.mix.scan}%` }}
              title={t('reports.kind.smartScan')}
            />
            <span
              className="bg-warning transition-all duration-500"
              style={{ width: `${analytics.mix.boost}%` }}
              title={t('reports.kind.boost')}
            />
            <span
              className="bg-chart-disk transition-all duration-500"
              style={{ width: `${analytics.mix.storage}%` }}
              title={t('reports.kind.storageLarge')}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            <LegendDot className="bg-primary" label={t('reports.kind.cleanup')} />
            <LegendDot className="bg-chart-ram" label={t('reports.kind.smartScan')} />
            <LegendDot className="bg-warning" label={t('reports.kind.boost')} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareRow({
  label,
  value,
  pct,
  barClass,
  valueClass
}: {
  label: string
  value: number
  pct: number
  barClass: string
  valueClass: string
}): React.ReactElement {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold tabular-nums', valueClass)}>{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', barClass)}
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%` }}
        />
      </div>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('h-1.5 w-1.5 rounded-full', className)} />
      {label}
    </span>
  )
}
