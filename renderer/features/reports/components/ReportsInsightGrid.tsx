import type { LucideIcon } from 'lucide-react'
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

type InsightAccent = 'disk' | 'success' | 'scan' | 'boost' | 'cleanup' | 'neutral'

const ACCENT_STYLES: Record<
  InsightAccent,
  {
    wash: string
    orb: string
    iconWrap: string
    ringHover: string
  }
> = {
  disk: {
    wash: 'from-chart-disk/25 via-chart-disk/5 to-transparent',
    orb: 'bg-chart-disk/20',
    iconWrap: 'bg-chart-disk/10 text-chart-disk ring-1 ring-chart-disk/15',
    ringHover:
      'hover:border-chart-disk/40 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.35)]'
  },
  success: {
    wash: 'from-success/20 via-success/5 to-transparent',
    orb: 'bg-success/20',
    iconWrap: 'bg-success/10 text-success ring-1 ring-success/15',
    ringHover:
      'hover:border-success/40 hover:shadow-[0_18px_40px_-16px_rgba(34,197,94,0.35)]'
  },
  scan: {
    wash: 'from-primary/20 via-primary/5 to-transparent',
    orb: 'bg-primary/20',
    iconWrap: 'bg-primary/10 text-primary ring-1 ring-primary/15',
    ringHover:
      'hover:border-primary/40 hover:shadow-[0_18px_40px_-16px_rgba(37,99,235,0.35)]'
  },
  boost: {
    wash: 'from-warning/20 via-warning/5 to-transparent',
    orb: 'bg-warning/25',
    iconWrap: 'bg-warning/10 text-warning ring-1 ring-warning/15',
    ringHover:
      'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.4)]'
  },
  cleanup: {
    wash: 'from-chart-ram/25 via-chart-ram/5 to-transparent',
    orb: 'bg-chart-ram/20',
    iconWrap: 'bg-chart-ram/10 text-chart-ram ring-1 ring-chart-ram/15',
    ringHover:
      'hover:border-chart-ram/40 hover:shadow-[0_18px_40px_-16px_rgba(6,182,212,0.4)]'
  },
  neutral: {
    wash: 'from-muted-foreground/15 via-muted-foreground/5 to-transparent',
    orb: 'bg-muted-foreground/15',
    iconWrap: 'bg-muted text-muted-foreground ring-1 ring-border',
    ringHover: 'hover:border-border hover:shadow-md'
  }
}

export function ReportsInsightGrid({
  analytics,
  animateKey = 0
}: ReportsInsightGridProps): React.ReactElement {
  const { t } = useTranslation()

  const tiles: Array<{
    icon: LucideIcon
    label: string
    value: string
    hint: string
    accent: InsightAccent
  }> = [
    {
      icon: HardDrive,
      label: t('reports.spaceRecovered'),
      value: formatBytes(analytics.lifetimeBytesFreed),
      hint: t('reports.allTime'),
      accent: 'disk'
    },
    {
      icon: ShieldCheck,
      label: t('reports.issues.resolved'),
      value: String(analytics.issuesResolved),
      hint: t('reports.issues.resolvedHint'),
      accent: 'success'
    },
    {
      icon: ScanSearch,
      label: t('reports.smartScans'),
      value: String(analytics.totals.scanCount),
      hint: t('reports.issues.foundLatest', { count: analytics.issuesFoundLatest }),
      accent: 'scan'
    },
    {
      icon: Zap,
      label: t('reports.perf.memory'),
      value: formatBytes(analytics.memoryReclaimedBytes),
      hint: t('reports.perf.boosts', { count: analytics.totals.boostCount }),
      accent: 'boost'
    },
    {
      icon: Trash2,
      label: t('reports.totalCleanups'),
      value: String(analytics.totals.cleanupCount),
      hint: t('reports.optimizations'),
      accent: 'cleanup'
    },
    {
      icon: Sparkles,
      label: t('reports.filesTouched'),
      value: analytics.filesTouched.toLocaleString(),
      hint: t('reports.filesTouchedHint'),
      accent: 'neutral'
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

      <div key={animateKey} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ icon: Icon, label, value, hint, accent }) => {
          const style = ACCENT_STYLES[accent]

          return (
            <article
              key={label}
              className={cn(
                'group relative flex min-h-[108px] overflow-hidden rounded-2xl border border-border',
                'bg-card shadow-card',
                'transition-all duration-200 ease-out hover:-translate-y-1',
                'animate-in fade-in-0 zoom-in-95 duration-500',
                style.ringHover
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b',
                  style.wash
                )}
                aria-hidden="true"
              />
              <div
                className={cn(
                  'pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl',
                  'opacity-70 transition-opacity duration-200 group-hover:opacity-100',
                  style.orb
                )}
                aria-hidden="true"
              />

              <div className="relative z-10 flex w-full items-center gap-3.5 p-4">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105',
                    style.iconWrap
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
            </article>
          )
        })}
      </div>
    </section>
  )
}
