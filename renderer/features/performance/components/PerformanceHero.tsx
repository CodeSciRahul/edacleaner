import type { LucideIcon } from 'lucide-react'
import {
  Cpu,
  Layers,
  Loader2,
  Lock,
  MemoryStick,
  Power,
  Sparkles,
  Square,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { formatBytes } from '@shared/utils'
import type { MemoryInfo } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { usePlanCheckout } from '@/features/subscription/hooks/usePlanCheckout'
import performanceHeroBgDark from '@/assets/performance/performance-hero-bg-dark.png'
import performanceHeroBgLight from '@/assets/performance/performance-hero-bg-light.png'

export type PerformanceHealth = 'good' | 'warning' | 'critical'

interface PerformanceHeroProps {
  score: number | null
  health: PerformanceHealth
  title: string
  message: string
  memory?: MemoryInfo
  /** Enabled startup apps count */
  startupCount?: number | null
  /** Estimated reclaimable memory bytes from suggestions */
  recoverableBytes?: number
  isBoosting: boolean
  isLoading: boolean
  onBoost: () => void
  onCancel: () => void
  onOpenStartup: () => void
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

const LOCKED_FEATURES: Array<{
  icon: LucideIcon
  labelKey: TranslationKey
  accentClass: string
}> = [
  {
    icon: Zap,
    labelKey: 'performance.hero.featureBoost',
    accentClass: 'bg-primary/15 text-primary'
  },
  {
    icon: Power,
    labelKey: 'performance.hero.featureStartup',
    accentClass: 'bg-warning/15 text-warning'
  },
  {
    icon: MemoryStick,
    labelKey: 'performance.hero.featureRam',
    accentClass: 'bg-chart-ram/15 text-chart-ram'
  }
]

export function PerformanceHero({
  score,
  health,
  title,
  message,
  memory,
  startupCount = null,
  recoverableBytes = 0,
  isBoosting,
  isLoading,
  onBoost,
  onCancel,
  onOpenStartup,
  boostLocked = false
}: PerformanceHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const { startCheckout, checkingOut } = usePlanCheckout()
  const locked = boostLocked
  const stroke = healthStroke[health]
  const scorePct = score == null ? 0 : Math.min(100, Math.max(0, score))

  // Show live memory when locked so the hero still feels like Performance,
  // not empty Storage/Monitor chrome. Startup/recoverable stay gated.
  const memoryValue = memory
    ? `${memory.usedPercent}%`
    : isLoading
      ? '…'
      : '—'
  const startupValue = locked
    ? '—'
    : startupCount == null
      ? isLoading
        ? '…'
        : '—'
      : String(startupCount)
  const recoverableValue = locked
    ? '—'
    : recoverableBytes > 0
      ? formatBytes(recoverableBytes)
      : isLoading
        ? '…'
        : '—'

  return (
    <section
      aria-label={t('performance.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        locked
          ? 'border-primary/20'
          : health === 'good'
            ? 'border-success/25'
            : health === 'warning'
              ? 'border-warning/25'
              : 'border-border'
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/92 via-card/62 to-transparent sm:via-card/45"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                locked
                  ? 'border-primary/25 bg-primary/10 text-primary'
                  : isBoosting
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : healthChip[health]
              )}
            >
              {locked ? (
                <Lock className="h-3 w-3" aria-hidden="true" />
              ) : isBoosting ? (
                <Sparkles className="h-3 w-3 animate-pulse" aria-hidden="true" />
              ) : (
                <Zap className="h-3 w-3" aria-hidden="true" />
              )}
              {locked
                ? t('performance.hero.badge')
                : isBoosting
                  ? t('performance.hero.boosting')
                  : t(healthLabelKey[health])}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('performance.hero.boostBadge')}
            </span>
            {locked ? <PremiumBadge plan="premium" size="md" /> : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MetricTile
              icon={MemoryStick}
              label={t('performance.hero.memory')}
              value={memoryValue}
              accentClass="bg-chart-ram/15 text-chart-ram"
            />
            <MetricTile
              icon={Power}
              label={t('performance.hero.startup')}
              value={startupValue}
              accentClass="bg-warning/15 text-warning"
            />
            <MetricTile
              icon={Layers}
              label={t('performance.hero.recoverable')}
              value={recoverableValue}
              accentClass="bg-primary/15 text-primary"
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
            ) : locked ? (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px] ring-1 ring-primary/20"
                disabled={checkingOut}
                onClick={() => void startCheckout('premium')}
              >
                {checkingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                )}
                {t('performance.upsell.cta')}
                <PremiumBadge plan="premium" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                disabled={isLoading}
                onClick={onBoost}
              >
                <Zap className="h-4 w-4" aria-hidden="true" />
                {t('performance.hero.boost')}
              </Button>
            )}
            {!locked ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onOpenStartup}
              >
                <Power className="h-4 w-4" aria-hidden="true" />
                {t('performance.hero.manageStartup')}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {locked ? t('performance.hero.lockedHint') : t('performance.hero.boostHint')}
          </p>
        </div>

        <div className="flex shrink-0 justify-center lg:justify-end">
          {locked ? (
            <LockedBoostPanel />
          ) : (
            <BoostScorePanel
              score={score}
              scorePct={scorePct}
              stroke={stroke}
              healthLabel={t(healthLabelKey[health])}
              recoverableLabel={
                recoverableBytes > 0
                  ? t('performance.hero.reclaimableHint', {
                      size: formatBytes(recoverableBytes)
                    })
                  : null
              }
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

function BoostScorePanel({
  score,
  scorePct,
  stroke,
  healthLabel,
  recoverableLabel
}: {
  score: number | null
  scorePct: number
  stroke: string
  healthLabel: string
  recoverableLabel: string | null
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'relative w-full max-w-[14.5rem] rounded-2xl border border-border/60',
        'bg-background/55 p-4 backdrop-blur-sm'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Zap className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('performance.hero.systemScore')}
          </p>
          <p className="text-xs font-medium text-foreground">{healthLabel}</p>
        </div>
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {score == null ? '—' : score}
        </span>
        <span className="mb-1.5 text-xs font-medium text-muted-foreground">/ 100</span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={t('performance.hero.systemScore')}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${scorePct}%`, backgroundColor: stroke }}
        />
      </div>

      {recoverableLabel ? (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Cpu className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
          {recoverableLabel}
        </p>
      ) : (
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          {t('performance.hero.scoreHint')}
        </p>
      )}
    </div>
  )
}

function LockedBoostPanel(): React.ReactElement {
  const { t } = useTranslation()
  const openPlansModal = useEntitlementsStore((s) => s.openPlansModal)

  return (
    <div
      className={cn(
        'relative w-full max-w-[14.5rem] rounded-2xl border border-primary/25',
        'bg-background/55 p-4 backdrop-blur-sm'
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {t('performance.hero.boostBadge')}
            </p>
            <p className="text-xs font-medium text-foreground">
              {t('performance.hero.lockedPanelTitle')}
            </p>
          </div>
        </div>
        <PremiumBadge plan="premium" />
      </div>

      <ul className="space-y-2">
        {LOCKED_FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <li
              key={feature.labelKey}
              className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/40 px-2.5 py-2"
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  feature.accentClass
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="text-xs font-medium text-foreground">
                {t(feature.labelKey)}
              </span>
            </li>
          )
        })}
      </ul>

      <Button
        size="sm"
        variant="outline"
        className="mt-3 h-8 w-full gap-1.5 rounded-lg border-primary/25 bg-primary/5 text-[12px] text-primary hover:bg-primary/10"
        onClick={openPlansModal}
      >
        {t('entitlements.prompt.compare')}
      </Button>
    </div>
  )
}
