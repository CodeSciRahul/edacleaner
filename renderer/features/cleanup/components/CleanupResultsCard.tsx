import {
  CheckCircle2,
  Clock,
  Files,
  HardDrive,
  Info,
  MinusCircle,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { CleanupResult, CleanupStepResult, CleanupStepStatus } from '@shared/interfaces'
import {
  isBenignCleanupNote,
  softCleanupNote,
  stepDisplayStatus
} from '@/features/cleanup/lib/positive-copy'

interface CleanupResultsCardProps {
  result: CleanupResult
}

const stepStatusMeta: Record<
  CleanupStepStatus | 'optimized',
  {
    label: string
    icon: typeof CheckCircle2
    tone: string
    badgeClass: string
  }
> = {
  completed: {
    label: 'Optimized',
    icon: CheckCircle2,
    tone: 'bg-success/10 text-success border-success/20',
    badgeClass: 'border-success/30 bg-success/15 text-success'
  },
  optimized: {
    label: 'Optimized',
    icon: CheckCircle2,
    tone: 'bg-success/10 text-success border-success/20',
    badgeClass: 'border-success/30 bg-success/15 text-success'
  },
  failed: {
    label: 'Needs attention',
    icon: Info,
    tone: 'bg-muted text-muted-foreground border-border',
    badgeClass: 'border-border bg-muted text-muted-foreground'
  },
  skipped: {
    label: 'Already clear',
    icon: SkipForward,
    tone: 'bg-primary/10 text-primary border-primary/20',
    badgeClass: 'border-primary/25 bg-primary/10 text-primary'
  },
  cancelled: {
    label: 'Paused',
    icon: MinusCircle,
    tone: 'bg-muted text-muted-foreground border-border',
    badgeClass: 'border-border bg-muted text-muted-foreground'
  },
  pending: {
    label: 'Queued',
    icon: Clock,
    tone: 'bg-muted text-muted-foreground border-border',
    badgeClass: 'border-border bg-muted text-muted-foreground'
  },
  running: {
    label: 'Optimizing',
    icon: Sparkles,
    tone: 'bg-primary/10 text-primary border-primary/20',
    badgeClass: 'border-primary/30 bg-primary/15 text-primary'
  }
}

function outcomeFor(result: CleanupResult): {
  title: string
  message: string
  tone: string
  Icon: typeof CheckCircle2
  showBenignNote: boolean
} {
  const hasProgress = result.bytesFreed > 0 || result.filesRemoved > 0
  const completed = result.steps.filter((s) => s.status === 'completed').length
  const hardFailures = result.steps.filter(
    (s) => s.status === 'failed' && !isBenignCleanupNote(s.error)
  ).length
  const benignNotes = result.steps.some(
    (s) => Boolean(s.error) && isBenignCleanupNote(s.error)
  )

  if (result.cancelled) {
    return {
      title: hasProgress ? 'Optimization paused' : 'Cleanup paused',
      message: hasProgress
        ? `Progress saved — ${formatBytes(result.bytesFreed)} already reclaimed. Resume anytime.`
        : 'No changes were made. You can start again whenever you are ready.',
      tone: 'border-primary/25 bg-primary/5',
      Icon: MinusCircle,
      showBenignNote: false
    }
  }

  if (hasProgress || completed > 0) {
    return {
      title:
        result.bytesFreed > 0
          ? 'Optimization complete'
          : 'System health improved',
      message:
        result.bytesFreed > 0
          ? `Storage successfully reclaimed — ${formatBytes(result.bytesFreed)} freed in ${(result.durationMs / 1000).toFixed(1)}s.`
          : `Your PC is cleaner and more organized. Finished in ${(result.durationMs / 1000).toFixed(1)}s.`,
      tone: 'border-success/30 bg-success/10',
      Icon: CheckCircle2,
      showBenignNote: benignNotes
    }
  }

  if (hardFailures > 0 && completed === 0) {
    return {
      title: 'Almost there',
      message:
        'We could not free space this round. Close open apps and try again for best results.',
      tone: 'border-primary/25 bg-primary/5',
      Icon: Zap,
      showBenignNote: false
    }
  }

  return {
    title: 'No action required',
    message: 'Everything looks tidy — your system is already in good shape.',
    tone: 'border-success/30 bg-success/10',
    Icon: ShieldCheck,
    showBenignNote: benignNotes
  }
}

function stepDetailText(step: CleanupStepResult): string | undefined {
  if (step.detail && !isBenignCleanupNote(step.detail)) {
    if (step.detail.length > 140) {
      return `${step.detail.slice(0, 137).trimEnd()}…`
    }
    return step.detail
  }
  if (step.status === 'skipped') {
    return 'Nothing needed here — looking good.'
  }
  if (step.status === 'completed' && step.bytesFreed === 0 && step.filesRemoved === 0) {
    return 'Checked and optimized — protected items left untouched.'
  }
  return step.detail
}

export function CleanupResultsCard({ result }: CleanupResultsCardProps): React.ReactElement {
  const outcome = outcomeFor(result)
  const OutcomeIcon = outcome.Icon
  const actionableWarnings = result.warnings.filter((w) => !isBenignCleanupNote(w))

  return (
    <section
      aria-label="Optimization results"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card animate-in fade-in-0 zoom-in-95 duration-300"
    >
      <div className={cn('flex items-start gap-3 border-b border-border px-5 py-4', outcome.tone)}>
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card/90 text-success shadow-sm">
          <OutcomeIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-section-title text-foreground">{outcome.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{outcome.message}</p>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <ResultStat
          icon={HardDrive}
          label="Storage reclaimed"
          value={formatBytes(result.bytesFreed)}
          accent="text-primary"
        />
        <ResultStat
          icon={Files}
          label="Items cleaned"
          value={result.filesRemoved.toLocaleString()}
          accent="text-success"
        />
        <ResultStat
          icon={Zap}
          label="Optimized in"
          value={`${(result.durationMs / 1000).toFixed(1)}s`}
          accent="text-chart-ram"
        />
      </div>

      <div className="border-t border-border px-5 pb-5 pt-1">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          What we optimized
        </p>
        <ul className="space-y-2.5">
          {result.steps.map((step) => {
            const display = stepDisplayStatus(step)
            const meta = stepStatusMeta[display === 'optimized' ? 'optimized' : display]
            const StatusIcon = meta.icon
            const detail = stepDetailText(step)
            const note = softCleanupNote(step.error)

            return (
              <li
                key={`${step.id}-${step.label}`}
                className="flex gap-3 rounded-xl border border-border bg-muted/25 px-3.5 py-3 transition-colors"
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    meta.tone
                  )}
                >
                  <StatusIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <Badge
                      variant="outline"
                      className={cn('shrink-0 rounded-md font-medium', meta.badgeClass)}
                    >
                      {meta.label}
                    </Badge>
                  </div>
                  {detail ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
                  ) : null}
                  {step.bytesFreed > 0 ? (
                    <p className="mt-1 text-xs font-medium tabular-nums text-success">
                      {formatBytes(step.bytesFreed)} reclaimed
                      {step.filesRemoved > 0
                        ? ` · ${step.filesRemoved.toLocaleString()} items`
                        : ''}
                    </p>
                  ) : null}
                  {note ? (
                    <p className="mt-2 flex gap-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                      <Info
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{note}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        {outcome.showBenignNote && actionableWarnings.length === 0 ? (
          <div className="mt-4 flex gap-2 rounded-xl border border-success/20 bg-success/5 px-3.5 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-foreground">Smart protection active</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                A few files in active use were left alone so your apps stay stable. Run cleanup again
                later to reclaim a little more.
              </p>
            </div>
          </div>
        ) : null}

        {actionableWarnings.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <p className="text-xs font-medium text-foreground">Helpful tip</p>
            <ul className="mt-1 space-y-1">
              {actionableWarnings.slice(0, 3).map((warning) => (
                <li key={warning} className="text-xs text-muted-foreground">
                  {softCleanupNote(warning) ?? warning}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ResultStat({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: typeof HardDrive
  label: string
  value: string
  accent: string
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card',
          accent
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-base font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}
