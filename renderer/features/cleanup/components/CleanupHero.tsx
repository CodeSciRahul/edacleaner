import { Search, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { CleanupWorkflowPhase } from '@/features/cleanup/lib/category-meta'

interface CleanupHeroProps {
  phase: CleanupWorkflowPhase
  reclaimableBytes: number
  selectedCount: number
  scanned: boolean
  lastBytesFreed?: number
}

const steps: Array<{ id: CleanupWorkflowPhase; label: string }> = [
  { id: 'scan', label: 'Scan' },
  { id: 'review', label: 'Review' },
  { id: 'clean', label: 'Optimize' }
]

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
  lastBytesFreed
}: CleanupHeroProps): React.ReactElement {
  const active = stepIndex(phase)
  const optimized = phase === 'done'

  let headline: string
  let subtext: string

  if (optimized) {
    headline =
      typeof lastBytesFreed === 'number' && lastBytesFreed > 0
        ? `${formatBytes(lastBytesFreed)} successfully reclaimed`
        : 'System health improved'
    subtext =
      'Your PC is cleaner and more optimized. Run another scan anytime to keep it that way.'
  } else if (!scanned) {
    headline = 'Clear clutter. Feel the difference.'
    subtext =
      'Scan junk, temp files, caches, and Trash — then optimize only what you choose. Personal files stay safe.'
  } else if (reclaimableBytes > 0) {
    headline = `${formatBytes(reclaimableBytes)} ready to reclaim`
    subtext =
      selectedCount > 0
        ? `${selectedCount} categor${selectedCount === 1 ? 'y' : 'ies'} selected. Review badges, then optimize with confidence.`
        : 'Select categories below, then start optimization.'
  } else {
    headline = 'Looking great — no action required'
    subtext = 'Your system already looks tidy. Empty Trash anytime if you like an extra polish.'
  }

  return (
    <section
      aria-label="Cleanup overview"
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6 shadow-card sm:p-7',
        optimized
          ? 'border-success/25 bg-gradient-to-br from-card via-card to-success/[0.08]'
          : 'border-border bg-gradient-to-br from-card via-card to-primary/[0.07]'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl',
          optimized ? 'bg-success/15' : 'bg-primary/10'
        )}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-chart-ram/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
            {optimized ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            )}
            {optimized ? 'Optimization successful' : 'Safe-by-default cleanup'}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {headline}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{subtext}</p>
        </div>

        <ol className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Cleanup workflow">
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
                    'flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors duration-200',
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
