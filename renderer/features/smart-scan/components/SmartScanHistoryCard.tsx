import {
  Clock,
  Files,
  Gauge,
  HardDrive,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { SmartScanPersistedRecord } from '@/features/smart-scan/lib/scan-history'
import {
  formatLastScannedAt,
  formatRelativeScanTime
} from '@/features/smart-scan/lib/scan-history'
import { formatScanDuration } from '@/features/smart-scan/lib/scan-meta'
import { useTranslation } from '@/i18n/useTranslation'

interface SmartScanHistoryCardProps {
  history: SmartScanPersistedRecord
  /** Bumps to re-trigger metric animations after a new scan */
  animateKey?: number
  className?: string
}

export function SmartScanHistoryCard({
  history,
  animateKey = 0,
  className
}: SmartScanHistoryCardProps): React.ReactElement {
  const { t } = useTranslation()

  const metrics = [
    {
      icon: HardDrive,
      label: t('smartScan.history.spaceReclaimed'),
      value: formatBytes(history.storageReclaimedBytes),
      accent: 'text-primary',
      wrap: 'bg-primary/10'
    },
    {
      icon: ShieldCheck,
      label: t('smartScan.history.issuesResolved'),
      value: history.issuesResolved.toLocaleString(),
      accent: 'text-success',
      wrap: 'bg-success/10'
    },
    {
      icon: Files,
      label: t('smartScan.history.filesScanned'),
      value: history.filesScanned.toLocaleString(),
      accent: 'text-chart-ram',
      wrap: 'bg-chart-ram/10'
    },
    {
      icon: Gauge,
      label: t('smartScan.history.healthScore'),
      value: String(history.healthScore),
      accent: 'text-chart-disk',
      wrap: 'bg-chart-disk/10'
    }
  ]

  const issuesLabel =
    history.issuesFound === 0
      ? t('smartScan.history.noIssues')
      : history.issuesFound === 1
        ? t('smartScan.history.issueFound')
        : t('smartScan.history.issuesFound', { count: history.issuesFound })

  const scansLabel =
    history.totalScans === 1
      ? t('smartScan.history.scanSaved')
      : t('smartScan.history.scansSaved', { count: history.totalScans })

  return (
    <section
      aria-label={t('smartScan.history.lastScanned')}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.06] shadow-card',
        'animate-in fade-in-0 slide-in-from-top-1 duration-300',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t('smartScan.history.lastScanned')}
            </div>
            <h2 className="text-section-title text-foreground">
              {formatLastScannedAt(history.lastScanAt)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatRelativeScanTime(history.lastScanAt)}
              {' · '}
              {issuesLabel}
              {' · '}
              {formatScanDuration(history.durationMs)}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{scansLabel}</span>
          </div>
        </div>
      </div>

      <div
        key={animateKey}
        className="relative grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4"
      >
        {metrics.map(({ icon: Icon, label, value, accent, wrap }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/70 px-3.5 py-3 animate-in fade-in-0 zoom-in-95 duration-500"
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                wrap,
                accent
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-base font-semibold tabular-nums tracking-tight text-foreground">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
