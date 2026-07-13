import {
  HardDrive,
  Files,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'

interface ReportsInsightGridProps {
  analytics: ReportsAnalytics
  animateKey?: number
}

export function ReportsInsightGrid({
  analytics,
  animateKey = 0
}: ReportsInsightGridProps): React.ReactElement {
  const { t } = useTranslation()

  const tiles = [
    {
      icon: HardDrive,
      label: t('reports.spaceRecovered'),
      value: formatBytes(analytics.lifetimeBytesFreed),
      hint: t('reports.allTime'),
      wrap: 'bg-primary/10 text-primary'
    },
    {
      icon: ShieldCheck,
      label: t('reports.issues.resolved'),
      value: String(analytics.issuesResolved),
      hint: t('reports.issues.resolvedHint'),
      wrap: 'bg-success/10 text-success'
    },
    {
      icon: ScanSearch,
      label: t('reports.smartScans'),
      value: String(analytics.totals.scanCount),
      hint: t('reports.issues.foundLatest', { count: analytics.issuesFoundLatest }),
      wrap: 'bg-chart-ram/10 text-chart-ram'
    },
    {
      icon: Zap,
      label: t('reports.perf.memory'),
      value: formatBytes(analytics.memoryReclaimedBytes),
      hint: t('reports.perf.boosts', { count: analytics.totals.boostCount }),
      wrap: 'bg-warning/10 text-warning'
    },
    {
      icon: Trash2,
      label: t('reports.totalCleanups'),
      value: String(analytics.totals.cleanupCount),
      hint: t('reports.optimizations'),
      wrap: 'bg-chart-disk/10 text-chart-disk'
    },
    {
      icon: Sparkles,
      label: t('reports.filesTouched'),
      value: analytics.filesTouched.toLocaleString(),
      hint: t('reports.filesTouchedHint'),
      wrap: 'bg-muted text-muted-foreground'
    }
  ]

  return (
    <section aria-label={t('reports.achievements')}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-section-title text-foreground">{t('reports.achievements')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('reports.achievementsHint')}</p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
          <Files className="h-3 w-3" aria-hidden="true" />
          {t('reports.hero.subline', {
            optimizations: analytics.optimizations,
            scans: analytics.totals.scanCount
          })}
        </div>
      </div>

      <div
        key={animateKey}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {tiles.map(({ icon: Icon, label, value, hint, wrap }) => (
          <div
            key={label}
            className={cn(
              'group flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-card',
              'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
              'animate-in fade-in-0 zoom-in-95 duration-500'
            )}
          >
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                wrap
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">
                {value}
              </p>
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
