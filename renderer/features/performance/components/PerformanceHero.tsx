import { Gauge, Lock, Monitor, Sparkles, Square, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { formatBytes } from '@shared/utils'
import type { MemoryInfo } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import performanceHeroBgDark from '@/assets/performance/performance-hero-bg-dark.png'
import performanceHeroBgLight from '@/assets/performance/performance-hero-bg-light.png'

export type PerformanceHealth = 'good' | 'warning' | 'critical'

interface PerformanceHeroProps {
  score: number | null
  health: PerformanceHealth
  title: string
  message: string
  memory?: MemoryInfo
  diskFreeLabel?: string
  isBoosting: boolean
  isLoading: boolean
  onBoost: () => void
  onCancel: () => void
  onOpenMonitoring: () => void
  boostLocked?: boolean
}

const healthStroke: Record<PerformanceHealth, string> = {
  good: colors.semantic.success,
  warning: colors.semantic.warning,
  critical: colors.semantic.error
}

const healthChip: Record<PerformanceHealth, string> = {
  good: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive'
}

const healthLabelKey: Record<PerformanceHealth, TranslationKey> = {
  good: 'performance.hero.healthy',
  warning: 'performance.hero.attention',
  critical: 'performance.hero.pressure'
}

export function PerformanceHero({
  score,
  health,
  title,
  message,
  memory,
  diskFreeLabel,
  isBoosting,
  isLoading,
  onBoost,
  onCancel,
  onOpenMonitoring,
  boostLocked = false
}: PerformanceHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const size = 128
  const strokeWidth = 9
  const pct = score ?? 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference
  const stroke = healthStroke[health]

  return (
    <section
      aria-label={t('performance.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        health === 'good' ? 'border-success/25' : health === 'warning' ? 'border-warning/25' : 'border-border'
      )}
    >
      <img
        src={performanceHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={performanceHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                healthChip[health]
              )}
            >
              {isBoosting ? (
                <Sparkles className="h-3 w-3 animate-pulse" aria-hidden="true" />
              ) : (
                <Gauge className="h-3 w-3" aria-hidden="true" />
              )}
              {isBoosting ? t('performance.hero.boosting') : t(healthLabelKey[health])}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('performance.hero.badge')}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill
              label={t('performance.hero.memory')}
              value={
                memory
                  ? `${memory.usedPercent}% · ${formatBytes(memory.used)}`
                  : isLoading
                    ? '…'
                    : '—'
              }
            />
            <StatPill
              label={t('performance.hero.diskFree')}
              value={diskFreeLabel ?? (isLoading ? '…' : '—')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {isBoosting ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onCancel}
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                {t('performance.hero.cancelBoost')}
              </Button>
            ) : (
              <Button
                size="sm"
                className={cn(
                  'h-9 gap-2 rounded-lg px-4 text-[13px]',
                  boostLocked && 'ring-1 ring-primary/20'
                )}
                disabled={isLoading && !boostLocked}
                onClick={onBoost}
              >
                {boostLocked ? (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Zap className="h-4 w-4" aria-hidden="true" />
                )}
                {t('performance.hero.boost')}
                {boostLocked ? <PremiumBadge plan="premium" /> : null}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              onClick={onOpenMonitoring}
            >
              <Monitor className="h-4 w-4" aria-hidden="true" />
              {t('performance.liveMonitoring')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('performance.hero.boostHint')}</p>
        </div>

        <div className="flex shrink-0 justify-center lg:justify-end">
          <div className="relative inline-flex flex-col items-center rounded-2xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/50"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={score == null ? circumference : offset}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {score == null ? '—' : score}
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('performance.hero.score')}
              </span>
            </div>
          </div>
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
