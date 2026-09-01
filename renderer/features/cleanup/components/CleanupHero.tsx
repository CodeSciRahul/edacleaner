import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { CleanupWorkflowPhase } from '@/features/cleanup/lib/category-meta'
import { useTranslation } from '@/i18n/useTranslation'
import cleanupHeroBgDark from '@/assets/cleanup/cleanup-hero-bg-dark.png'
import cleanupHeroBgLight from '@/assets/cleanup/cleanup-hero-bg-light.png'

interface CleanupHeroProps {
  phase: CleanupWorkflowPhase
  reclaimableBytes: number
  selectedCount: number
  scanned: boolean
  lastBytesFreed?: number
  busy: boolean
  isCleaning: boolean
  cancelPending: boolean
  optimizeDisabled: boolean
  onScan: () => void
  onCancel: () => void
  onOptimize: () => void
}

const STEP_IDS: CleanupWorkflowPhase[] = ['scan', 'review', 'clean']

function stepIndex(phase: CleanupWorkflowPhase): number {
  if (phase === 'idle') return -1
  if (phase === 'scan') return 0
  if (phase === 'review') return 1
  if (phase === 'clean') return 2
  if (phase === 'done') return 2
  return 0
}

export function CleanupHero({
  phase,
  reclaimableBytes,
  selectedCount,
  scanned,
  lastBytesFreed,
  busy,
  isCleaning,
  cancelPending,
  optimizeDisabled,
  onScan,
  onCancel,
  onOptimize
}: CleanupHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const active = stepIndex(phase)
  const optimized = phase === 'done'

  const steps = [
    { id: STEP_IDS[0], label: t('cleanup.hero.scan') },
    { id: STEP_IDS[1], label: t('cleanup.hero.review') },
    { id: STEP_IDS[2], label: t('cleanup.hero.optimize') }
  ]

  let headline: string
  let subtext: string

  if (optimized) {
    headline =
      typeof lastBytesFreed === 'number' && lastBytesFreed > 0
        ? t('cleanup.hero.reclaimed', { bytes: formatBytes(lastBytesFreed) })
        : t('cleanup.hero.improved')
    subtext = t('cleanup.hero.doneSub')
  } else if (!scanned) {
    headline = t('cleanup.hero.idleHeadline')
    subtext = t('cleanup.hero.idleSub')
  } else if (reclaimableBytes > 0) {
    headline = t('cleanup.hero.readyHeadline', { bytes: formatBytes(reclaimableBytes) })
    subtext =
      selectedCount > 0
        ? selectedCount === 1
          ? t('cleanup.hero.selectedSubOne')
          : t('cleanup.hero.selectedSub', { count: selectedCount })
        : t('cleanup.hero.selectSub')
  } else {
    headline = t('cleanup.hero.tidyHeadline')
    subtext = t('cleanup.hero.tidySub')
  }

  return (
    <section
      aria-label={t('cleanup.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        optimized ? 'border-success/25' : 'border-border'
      )}
    >
      {/* Full-card cleanup art — `.light` / `.dark` on <html> */}
      <img
        src={cleanupHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={cleanupHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      {/* Soft left scrim keeps headline/steps readable over calm left of art */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
            {optimized ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            )}
            {optimized ? t('cleanup.hero.badgeSuccess') : t('cleanup.hero.badgeSafe')}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {headline}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {busy ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onCancel}
                disabled={cancelPending}
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                {t('common.pause')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onScan}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {scanned ? t('cleanup.rescan') : t('cleanup.scan')}
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={onOptimize}
              disabled={optimizeDisabled}
            >
              {isCleaning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {selectedCount > 0
                ? t('cleanup.optimizeCount', { count: selectedCount })
                : t('cleanup.optimize')}
            </Button>
          </div>
        </div>

        <ol className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label={t('cleanup.hero.overview')}>
          {steps.map((step, index) => {
            const isActive = index === active && !optimized
            const isDone = index < active || optimized
            const Icon =
              index === 0 ? Search : index === 1 ? Sparkles : optimized ? CheckCircle2 : ShieldCheck

            return (
              <li key={step.id} className="flex items-center gap-2 sm:gap-3">
                {index > 0 ? (
                  <div
                    className={cn(
                      'h-px w-4 sm:w-8',
                      isDone || isActive ? 'bg-primary/50' : 'bg-border',
                      optimized && 'bg-success/40'
                    )}
                    aria-hidden="true"
                  />
                ) : null}
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors duration-200',
                    isActive && 'border-primary/40 bg-primary/10 text-primary',
                    isDone && !isActive && 'border-success/30 bg-success/10 text-success',
                    !isActive && !isDone && 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  <span>{step.label}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
