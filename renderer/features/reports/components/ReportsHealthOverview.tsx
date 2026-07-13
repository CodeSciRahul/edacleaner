import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Gauge,
  ScanSearch,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  formatLastScannedAt,
  formatRelativeScanTime
} from '@/features/smart-scan/lib/scan-history'
import { formatScanDuration } from '@/features/smart-scan/lib/scan-meta'
import type { ReportsAnalytics, HealthBand } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

interface ReportsHealthOverviewProps {
  analytics: ReportsAnalytics
  animateKey?: number
}

const bandColor: Record<HealthBand, 'battery' | 'cpu' | 'network' | 'disk'> = {
  excellent: 'battery',
  good: 'cpu',
  fair: 'network',
  attention: 'disk'
}

const bandTitleKey: Record<HealthBand, TranslationKey> = {
  excellent: 'reports.health.excellent',
  good: 'reports.health.good',
  fair: 'reports.health.fair',
  attention: 'reports.health.attention'
}

const bandDescKey: Record<HealthBand, TranslationKey> = {
  excellent: 'reports.health.excellentDesc',
  good: 'reports.health.goodDesc',
  fair: 'reports.health.fairDesc',
  attention: 'reports.health.attentionDesc'
}

export function ReportsHealthOverview({
  analytics,
  animateKey = 0
}: ReportsHealthOverviewProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const score = analytics.healthScore ?? 0
  const band = analytics.healthBand
  const scan = analytics.lastScan

  return (
    <section
      aria-label={t('reports.health.title')}
      className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.07] p-6 shadow-card sm:p-7',
          'animate-in fade-in-0 slide-in-from-top-1 duration-300'
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div key={animateKey} className="flex justify-center animate-in zoom-in-95 duration-500">
            <CircularProgress
              value={score}
              color={bandColor[band]}
              size={132}
              strokeWidth={10}
              label={t('reports.health.score')}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
              <Gauge className="h-3 w-3" aria-hidden="true" />
              {t('reports.health.title')}
            </div>
            <div>
              <h2 className="text-section-title text-foreground">{t(bandTitleKey[band])}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(bandDescKey[band])}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-lg border border-border/80 bg-card/70 px-2.5 py-1.5">
                {t('reports.health.avg', { score: analytics.avgHealth ?? '—' })}
              </span>
              <span className="rounded-lg border border-border/80 bg-card/70 px-2.5 py-1.5">
                {t('reports.health.scans', { count: analytics.totals.scanCount })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('reports.status.title')}
              </p>
              <p className="text-sm font-semibold text-foreground">{t(bandTitleKey[band])}</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex justify-between gap-3">
              <span>{t('reports.status.openIssues')}</span>
              <span className="font-medium tabular-nums text-foreground">
                {analytics.issuesFoundLatest}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span>{t('reports.status.resolved')}</span>
              <span className="font-medium tabular-nums text-success">
                {analytics.issuesResolved}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span>{t('reports.status.optimizations')}</span>
              <span className="font-medium tabular-nums text-foreground">
                {analytics.optimizations}
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ScanSearch className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('reports.lastScan.title')}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {scan
                    ? formatRelativeScanTime(scan.at)
                    : t('reports.lastScan.none')}
                </p>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-primary/60" aria-hidden="true" />
          </div>
          {scan ? (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>{formatLastScannedAt(scan.at)}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-muted/60 px-2 py-1 tabular-nums">
                  {t('reports.lastScan.health', { score: scan.healthScore })}
                </span>
                <span className="rounded-md bg-muted/60 px-2 py-1 tabular-nums">
                  {t('reports.lastScan.files', { count: scan.filesScanned })}
                </span>
                <span className="rounded-md bg-muted/60 px-2 py-1">
                  {formatScanDuration(scan.durationMs)}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-8 gap-1.5 px-2 text-xs"
                onClick={() => navigate('/smart-scan')}
              >
                {t('reports.lastScan.open')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('reports.lastScan.hint')}</p>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => navigate('/smart-scan')}
              >
                <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
                {t('reports.empty.ctaScan')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
