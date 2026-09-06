import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Gauge,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import type { HealthStatus } from '../types'
import monitoringHeroBgDark from '@/assets/monitoring/monitoring-hero-bg-dark.png'
import monitoringHeroBgLight from '@/assets/monitoring/monitoring-hero-bg-light.png'

export type MonitoringHeroPhase = 'loading' | 'live' | 'paused' | 'offline' | 'error'

interface MonitoringHeroProps {
  phase: MonitoringHeroPhase
  overallStatus: HealthStatus
  title: string
  message: string
  cpuLabel: string
  memoryLabel: string
  cpuValue: number | null
  memoryValue: number | null
  isRefreshing: boolean
  locked?: boolean
  onPause: () => void
  onResume: () => void
  onRefresh: () => void
}

const healthChip: Record<HealthStatus, string> = {
  normal: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive'
}

const healthLabelKey: Record<HealthStatus, TranslationKey> = {
  normal: 'monitoring.level.normal',
  warning: 'monitoring.level.warning',
  critical: 'monitoring.level.critical'
}

const phaseChip: Record<MonitoringHeroPhase, string> = {
  loading: 'border-border bg-muted/50 text-muted-foreground',
  live: 'border-success/30 bg-success/10 text-success',
  paused: 'border-warning/30 bg-warning/10 text-warning',
  offline: 'border-border bg-muted/50 text-muted-foreground',
  error: 'border-destructive/30 bg-destructive/10 text-destructive'
}

const phaseLabelKey: Record<MonitoringHeroPhase, TranslationKey> = {
  loading: 'monitoring.hero.connecting',
  live: 'monitoring.live',
  paused: 'monitoring.paused',
  offline: 'monitoring.offline',
  error: 'monitoring.unavailable'
}

const healthBorder: Record<HealthStatus, string> = {
  normal: 'border-success/25',
  warning: 'border-warning/25',
  critical: 'border-destructive/25'
}

export function MonitoringHero({
  phase,
  overallStatus,
  title,
  message,
  cpuLabel,
  memoryLabel,
  cpuValue,
  memoryValue,
  isRefreshing,
  locked = false,
  onPause,
  onResume,
  onRefresh
}: MonitoringHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const showHealthChip = phase === 'live' && !locked
  const borderClass =
    phase === 'error'
      ? 'border-destructive/25'
      : phase === 'paused'
        ? 'border-warning/25'
        : phase === 'live'
          ? healthBorder[overallStatus]
          : 'border-border'

  return (
    <section
      aria-label={t('monitoring.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        'animate-in fade-in-0 duration-300',
        borderClass
      )}
    >
      <img
        src={monitoringHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={monitoringHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/92 via-card/60 to-transparent sm:via-card/42"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                locked ? 'border-primary/25 bg-primary/10 text-primary' : phaseChip[phase]
              )}
            >
              {locked ? (
                <Lock className="h-3 w-3" aria-hidden="true" />
              ) : phase === 'live' ? (
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
              ) : (
                <Activity className="h-3 w-3" aria-hidden="true" />
              )}
              {locked ? t('monitoring.hero.badge') : t(phaseLabelKey[phase])}
            </div>
            {showHealthChip ? (
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                  healthChip[overallStatus]
                )}
              >
                <Gauge className="h-3 w-3" aria-hidden="true" />
                {t(healthLabelKey[overallStatus])}
              </div>
            ) : (
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('monitoring.hero.badge')}
              </span>
            )}
            {locked ? <PremiumBadge plan="premium" size="md" /> : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={t('monitoring.metric.cpuShort')} value={cpuLabel} />
            <StatPill label={t('monitoring.metric.memoryShort')} value={memoryLabel} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {locked ? (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px] ring-1 ring-primary/20"
                disabled
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                {t('monitoring.live')}
                <PremiumBadge plan="premium" />
              </Button>
            ) : phase === 'paused' ? (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                onClick={onResume}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {t('monitoring.resume')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onPause}
                disabled={phase === 'loading' || phase === 'error'}
              >
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                {t('monitoring.pause')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              disabled={locked || isRefreshing}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                aria-hidden="true"
              />
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              onClick={() => navigate('/performance')}
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              {t('monitoring.hero.openPerformance')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('monitoring.hero.hint')}</p>
        </div>

        <div className="flex shrink-0 justify-center lg:justify-end">
          <div className="inline-flex items-center gap-4 rounded-2xl border border-border/60 bg-background/50 px-4 py-3 backdrop-blur-sm">
            <MiniGauge
              label={t('monitoring.metric.cpuShort')}
              value={cpuValue}
              color="cpu"
            />
            <div className="h-14 w-px bg-border/70" aria-hidden="true" />
            <MiniGauge
              label={t('monitoring.metric.memoryShort')}
              value={memoryValue}
              color="ram"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniGauge({
  label,
  value,
  color
}: {
  label: string
  value: number | null
  color: 'cpu' | 'ram'
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-1">
      <CircularProgress
        value={value ?? 0}
        color={color}
        size={72}
        strokeWidth={6}
        className={cn(value == null && 'opacity-40')}
      />
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
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
