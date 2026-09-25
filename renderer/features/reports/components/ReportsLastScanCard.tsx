import { useNavigate } from 'react-router-dom'
import { ArrowRight, ScanSearch, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  formatLastScannedAt,
  formatRelativeScanTime
} from '@/features/smart-scan/lib/scan-history'
import { formatScanDuration } from '@/features/smart-scan/lib/scan-meta'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'

interface ReportsLastScanCardProps {
  analytics: ReportsAnalytics
}

/**
 * Last Smart Scan details — kept separate from the hero so scan history stays visible
 * without duplicating health-score / status snapshot cards.
 */
export function ReportsLastScanCard({
  analytics
}: ReportsLastScanCardProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scan = analytics.lastScan

  return (
    <section
      aria-label={t('reports.lastScan.title')}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/12 via-primary/4 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl opacity-70 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative z-10 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <ScanSearch className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-section-title text-foreground">{t('reports.lastScan.title')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {scan ? formatRelativeScanTime(scan.at) : t('reports.lastScan.none')}
            </p>
          </div>
        </div>
        {scan ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('reports.lastScan.health', { score: scan.healthScore })}
          </span>
        ) : null}
      </div>

      {scan ? (
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>{formatLastScannedAt(scan.at)}</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 tabular-nums backdrop-blur-sm">
                {t('reports.lastScan.files', { count: scan.filesScanned })}
              </span>
              <span className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 backdrop-blur-sm">
                {formatScanDuration(scan.durationMs)}
              </span>
              <span className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 tabular-nums backdrop-blur-sm">
                {t('reports.status.openIssues')}: {analytics.issuesFoundLatest}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
            onClick={() => navigate('/smart-scan')}
          >
            {t('reports.lastScan.open')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('reports.lastScan.hint')}</p>
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-lg text-[13px]"
            onClick={() => navigate('/smart-scan')}
          >
            <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
            {t('reports.empty.ctaScan')}
          </Button>
        </div>
      )}
    </section>
  )
}
