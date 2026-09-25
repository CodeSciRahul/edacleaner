import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, HardDrive, ShieldCheck, Sparkles } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'

interface DashboardProgressTeaserProps {
  analytics: ReportsAnalytics | null
  hasHistory: boolean
  hydrated: boolean
}

/**
 * Lightweight bridge to Reports — lifetime value only, not a second analytics dashboard.
 */
export function DashboardProgressTeaser({
  analytics,
  hasHistory,
  hydrated
}: DashboardProgressTeaserProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!hydrated) {
    return <div className="h-[140px] animate-pulse rounded-2xl border border-border bg-muted/40" />
  }

  if (!hasHistory || !analytics) {
    return (
      <section
        aria-label={t('home.progress.title')}
        className="relative flex flex-col overflow-hidden rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-card sm:flex-row sm:items-center sm:justify-between sm:text-left"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <BarChart3 className="h-6 w-6" strokeWidth={1.85} aria-hidden="true" />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-semibold text-foreground">{t('home.progress.emptyTitle')}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t('home.progress.emptyDesc')}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="relative z-10 mt-5 h-9 gap-1.5 rounded-lg px-4 text-[13px] sm:mt-0"
          onClick={() => navigate('/smart-scan')}
        >
          {t('home.scanNow')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </section>
    )
  }

  const tiles = [
    {
      icon: HardDrive,
      label: t('home.progress.reclaimed'),
      value: formatBytes(analytics.lifetimeBytesFreed),
      wrap: 'bg-chart-disk/15 text-chart-disk ring-1 ring-chart-disk/20'
    },
    {
      icon: ShieldCheck,
      label: t('home.progress.resolved'),
      value: String(analytics.issuesResolved),
      wrap: 'bg-success/15 text-success ring-1 ring-success/20'
    },
    {
      icon: Sparkles,
      label: t('home.progress.optimizations'),
      value: String(analytics.optimizations),
      wrap: 'bg-warning/15 text-warning ring-1 ring-warning/20'
    }
  ]

  return (
    <section
      aria-label={t('home.progress.title')}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card',
        'transition-shadow duration-200 hover:shadow-md'
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/8 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-section-title text-foreground">{t('home.progress.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {analytics.lastActivityAt
              ? t('home.progress.subtitle', {
                  when: formatRelativeScanTime(analytics.lastActivityAt)
                })
              : t('home.progress.subtitleFallback')}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
          onClick={() => navigate('/reports')}
        >
          {t('home.viewReports')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-3">
        {tiles.map(({ icon: Icon, label, value, wrap }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/50 px-3.5 py-3 backdrop-blur-sm"
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', wrap)}>
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-base font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
