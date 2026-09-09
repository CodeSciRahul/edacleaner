import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  HardDrive,
  ScanSearch,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import {
  formatRelativeScanTime
} from '@/features/smart-scan/lib/scan-history'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import heroCardBgDark from '@/assets/dashboard/hero-card-bg-dark.png'
import heroCardBgLight from '@/assets/dashboard/hero-card-bg-light.png'

interface DashboardHeroProps {
  analytics: ReportsAnalytics | null
  hasHistory: boolean
  cpu: number | null
  ram: number | null
  diskFreeLabel?: string | null
}

function pressureStatus(
  cpu: number | null,
  ram: number | null
): 'good' | 'warning' | 'critical' {
  const peak = Math.max(cpu ?? 0, ram ?? 0)
  if (peak >= 85) return 'critical'
  if (peak >= 70) return 'warning'
  return 'good'
}

export function DashboardHero({
  analytics,
  hasHistory,
  cpu,
  ram,
  diskFreeLabel = null
}: DashboardHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const live = pressureStatus(cpu, ram)

  let titleKey: TranslationKey = 'home.hero.readyTitle'
  let messageKey: TranslationKey = 'home.hero.readyMessage'
  let status: 'good' | 'warning' | 'critical' = live

  if (hasHistory && analytics) {
    if (analytics.issuesFoundLatest > 0) {
      titleKey = 'home.hero.issuesTitle'
      messageKey = 'home.hero.issuesMessage'
      status = analytics.issuesFoundLatest >= 3 ? 'warning' : 'good'
    } else if (analytics.healthScore != null && analytics.healthScore < 55) {
      titleKey = 'home.hero.boostTitle'
      messageKey = 'home.hero.boostMessage'
      status = 'warning'
    } else if (live === 'critical') {
      titleKey = 'home.hero.pressureTitle'
      messageKey = 'home.hero.pressureMessage'
      status = 'critical'
    } else {
      titleKey = 'home.hero.goodTitle'
      messageKey = 'home.hero.goodMessage'
      status = 'good'
    }
  } else if (live === 'critical' || live === 'warning') {
    titleKey = 'home.hero.pressureTitle'
    messageKey = 'home.hero.pressureMessage'
    status = live
  }

  const statusWrap = {
    good: 'border-success/25 bg-success/10 text-success',
    warning: 'border-warning/25 bg-warning/10 text-warning',
    critical: 'border-destructive/25 bg-destructive/10 text-destructive'
  }[status]

  const healthValue =
    hasHistory && analytics?.healthScore != null ? String(analytics.healthScore) : '—'
  const issuesValue =
    hasHistory && analytics ? String(analytics.issuesFoundLatest) : '—'
  const reclaimedValue =
    hasHistory && analytics ? formatBytes(analytics.lifetimeBytesFreed) : '—'
  const cpuValue = cpu != null ? `${cpu}%` : '—'
  const ramValue = ram != null ? `${ram}%` : '—'
  const diskValue = diskFreeLabel ?? '—'

  return (
    <section
      aria-label={t('home.hero.aria')}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 slide-in-from-top-1 duration-300'
      )}
    >
      {/* Full-card theme backgrounds — `.light` / `.dark` on <html> */}
      <img
        src={heroCardBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={heroCardBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      {/* Soft left scrim keeps title/CTAs readable if the art bleeds left */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
              statusWrap
            )}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('home.hero.badge')}
          </div>
          <div>
            <h2 className="text-section-title text-foreground sm:text-2xl">{t(titleKey)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(messageKey, {
                score: analytics?.healthScore ?? '—',
                issues: analytics?.issuesFoundLatest ?? 0,
                bytes: formatBytes(analytics?.lifetimeBytesFreed ?? 0)
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasHistory ? (
              <>
                <StatPill label={t('home.hero.statHealth')} value={healthValue} />
                <StatPill label={t('home.hero.statIssues')} value={issuesValue} />
                <StatPill label={t('home.hero.statReclaimed')} value={reclaimedValue} />
              </>
            ) : (
              <>
                <StatPill label={t('home.metric.cpu')} value={cpuValue} />
                <StatPill label={t('home.metric.ram')} value={ramValue} />
                <StatPill label={t('home.hero.statDiskFree')} value={diskValue} />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              className="h-10 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => navigate('/smart-scan')}
            >
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              {t('home.scanNow')}
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => navigate('/cleanup')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('home.junkAction')}
            </Button>
            {hasHistory ? (
              <Button
                variant="ghost"
                className="h-10 gap-1.5 rounded-lg px-3 text-[13px]"
                onClick={() => navigate('/reports')}
              >
                {t('home.viewReports')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <JumpChip
              icon={Zap}
              label={t('nav.performance')}
              onClick={() => navigate('/performance')}
            />
            <JumpChip
              icon={HardDrive}
              label={t('nav.storage')}
              onClick={() => navigate('/storage')}
            />
          </div>

          {hasHistory && analytics?.lastActivityAt ? (
            <p className="text-xs text-muted-foreground">
              {t('home.hero.lastActivity', {
                when: formatRelativeScanTime(analytics.lastActivityAt)
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('home.hero.firstRun')}</p>
          )}
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function JumpChip({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof Zap
  label: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/55 px-2.5 py-1',
        'text-[11px] font-medium text-muted-foreground backdrop-blur-sm',
        'transition-colors hover:border-primary/25 hover:bg-background/80 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
      {label}
    </button>
  )
}
