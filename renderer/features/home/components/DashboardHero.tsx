import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  HardDrive,
  HeartPulse,
  MemoryStick,
  ScanSearch,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { formatBytes } from '@shared/utils'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'
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

type HeroStatus = 'good' | 'warning' | 'critical'

function pressureStatus(cpu: number | null, ram: number | null): HeroStatus {
  const peak = Math.max(cpu ?? 0, ram ?? 0)
  if (peak >= 85) return 'critical'
  if (peak >= 70) return 'warning'
  return 'good'
}

const healthStroke: Record<HeroStatus, string> = {
  good: colors.semantic.success,
  warning: colors.semantic.warning,
  critical: colors.semantic.error
}

const healthChip: Record<HeroStatus, string> = {
  good: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive'
}

const healthBorder: Record<HeroStatus, string> = {
  good: 'border-success/25',
  warning: 'border-warning/25',
  critical: 'border-border'
}

const healthOrb: Record<HeroStatus, string> = {
  good: 'bg-success/15',
  warning: 'bg-warning/15',
  critical: 'bg-destructive/15'
}

const statusLabelKey: Record<HeroStatus, TranslationKey> = {
  good: 'home.hero.statusGood',
  warning: 'home.hero.statusAttention',
  critical: 'home.hero.statusPressure'
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
  let status: HeroStatus = live

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

  const healthValue =
    hasHistory && analytics?.healthScore != null ? String(analytics.healthScore) : '—'
  const issuesValue =
    hasHistory && analytics ? String(analytics.issuesFoundLatest) : '—'
  const reclaimedValue =
    hasHistory && analytics ? formatBytes(analytics.lifetimeBytesFreed) : '—'
  const cpuValue = cpu != null ? `${cpu}%` : '—'
  const ramValue = ram != null ? `${ram}%` : '—'
  const diskValue = diskFreeLabel ?? '—'
  const livePeak = Math.max(cpu ?? 0, ram ?? 0)

  return (
    <section
      aria-label={t('home.hero.aria')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        healthBorder[status]
      )}
    >
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
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/92 via-card/62 to-transparent sm:via-card/45"
        aria-hidden="true"
      />
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full blur-3xl',
          healthOrb[status]
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                healthChip[status]
              )}
            >
              {status === 'critical' ? (
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3 w-3" aria-hidden="true" />
              )}
              {t(statusLabelKey[status])}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('home.hero.badge')}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t(titleKey)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
                <MetricTile
                  icon={HeartPulse}
                  label={t('home.hero.statHealth')}
                  value={healthValue}
                  accentClass="bg-success/15 text-success"
                />
                <MetricTile
                  icon={AlertTriangle}
                  label={t('home.hero.statIssues')}
                  value={issuesValue}
                  accentClass="bg-warning/15 text-warning"
                />
                <MetricTile
                  icon={HardDrive}
                  label={t('home.hero.statReclaimed')}
                  value={reclaimedValue}
                  accentClass="bg-chart-disk/15 text-chart-disk"
                />
              </>
            ) : (
              <>
                <MetricTile
                  icon={Activity}
                  label={t('home.metric.cpu')}
                  value={cpuValue}
                  accentClass="bg-chart-cpu/15 text-chart-cpu"
                />
                <MetricTile
                  icon={MemoryStick}
                  label={t('home.metric.ram')}
                  value={ramValue}
                  accentClass="bg-chart-ram/15 text-chart-ram"
                />
                <MetricTile
                  icon={HardDrive}
                  label={t('home.hero.statDiskFree')}
                  value={diskValue}
                  accentClass="bg-chart-disk/15 text-chart-disk"
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => navigate('/smart-scan')}
            >
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              {t('home.scanNow')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              onClick={() => navigate('/cleanup')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('home.junkAction')}
            </Button>
            <button
              type="button"
              onClick={() => navigate('/performance')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <Zap className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.performance')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/storage')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <HardDrive className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.storage')}
            </button>
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

        <div className="flex shrink-0 justify-center lg:justify-end">
          {hasHistory && analytics?.healthScore != null ? (
            <ScorePanel
              score={analytics.healthScore}
              stroke={healthStroke[status]}
              statusLabel={t(statusLabelKey[status])}
              title={t('home.hero.healthScore')}
              hint={
                analytics.issuesFoundLatest > 0
                  ? t('home.hero.issuesPanelHint', {
                      count: analytics.issuesFoundLatest
                    })
                  : t('home.hero.scoreHint')
              }
            />
          ) : (
            <ScorePanel
              score={livePeak > 0 ? Math.round(100 - livePeak) : null}
              stroke={healthStroke[live]}
              statusLabel={t(statusLabelKey[live])}
              title={t('home.hero.livePanelTitle')}
              hint={t('home.hero.livePanelHint')}
              suffix="/ 100"
            />
          )}
        </div>
      </div>
    </section>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  accentClass
}: {
  icon: LucideIcon
  label: string
  value: string
  accentClass: string
}): React.ReactElement {
  return (
    <div className="flex min-w-[7.25rem] items-center gap-2.5 rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          accentClass
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

function ScorePanel({
  score,
  stroke,
  statusLabel,
  title,
  hint,
  suffix = '/ 100'
}: {
  score: number | null
  stroke: string
  statusLabel: string
  title: string
  hint: string
  suffix?: string
}): React.ReactElement {
  const barPct = score == null ? 0 : Math.min(100, Math.max(0, score))

  return (
    <div
      className={cn(
        'relative w-full max-w-[14.5rem] rounded-2xl border border-border/60',
        'bg-background/55 p-4 backdrop-blur-sm'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <HeartPulse className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-xs font-medium text-foreground">{statusLabel}</p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {score == null ? '—' : score}
        </span>
        <span className="mb-1.5 text-xs font-medium text-muted-foreground">{suffix}</span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={title}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${barPct}%`, backgroundColor: stroke }}
        />
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}
