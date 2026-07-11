import {
  CheckCircle2,
  Clock,
  HardDrive,
  MemoryStick,
  MinusCircle,
  OctagonX,
  SkipForward,
  XCircle,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { BoostResult, BoostStepResult, BoostStepStatus } from '@shared/interfaces'

interface BoostResultsCardProps {
  result: BoostResult
}

const stepStatusMeta: Record<
  BoostStepStatus,
  {
    label: string
    icon: typeof CheckCircle2
    tone: string
    badgeClass: string
  }
> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    tone: 'bg-success/10 text-success border-success/20',
    badgeClass: 'border-success/30 bg-success/15 text-success'
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    tone: 'bg-destructive/10 text-destructive border-destructive/20',
    badgeClass: 'border-destructive/30 bg-destructive/15 text-destructive'
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    tone: 'bg-muted text-muted-foreground border-border',
    badgeClass: 'border-border bg-muted text-muted-foreground'
  },
  cancelled: {
    label: 'Cancelled',
    icon: MinusCircle,
    tone: 'bg-warning/10 text-warning border-warning/20',
    badgeClass: 'border-warning/30 bg-warning/15 text-warning'
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    tone: 'bg-muted text-muted-foreground border-border',
    badgeClass: 'border-border bg-muted text-muted-foreground'
  },
  running: {
    label: 'Running',
    icon: Zap,
    tone: 'bg-primary/10 text-primary border-primary/20',
    badgeClass: 'border-primary/30 bg-primary/15 text-primary'
  }
}

function outcomeFor(result: BoostResult): {
  title: string
  message: string
  tone: string
  Icon: typeof CheckCircle2
} {
  if (result.cancelled) {
    return {
      title: 'Boost cancelled',
      message: 'The run stopped before finishing. Partial work may still have applied.',
      tone: 'border-warning/30 bg-warning/10',
      Icon: OctagonX
    }
  }

  const failed = result.steps.filter((s) => s.status === 'failed').length
  const completed = result.steps.filter((s) => s.status === 'completed').length

  if (failed > 0 && completed > 0) {
    return {
      title: 'Boost finished with issues',
      message: `${completed} step(s) completed · ${failed} needed attention`,
      tone: 'border-warning/30 bg-warning/10',
      Icon: OctagonX
    }
  }

  if (failed > 0) {
    return {
      title: 'Boost could not finish',
      message: 'No steps completed successfully. Try again or check permissions.',
      tone: 'border-destructive/30 bg-destructive/10',
      Icon: XCircle
    }
  }

  return {
    title: 'Boost completed',
    message: `Finished in ${(result.durationMs / 1000).toFixed(1)}s — resources reclaimed where possible.`,
    tone: 'border-success/30 bg-success/10',
    Icon: CheckCircle2
  }
}

function friendlyError(error: string): string {
  const lower = error.toLowerCase()
  if (lower.includes('eperm') || lower.includes('operation not permitted')) {
    return 'Some files were locked by another app and could not be removed.'
  }
  if (lower.includes('ebusy') || lower.includes('resource busy')) {
    return 'Some files were in use and skipped.'
  }
  if (lower.includes('access is denied') || lower.includes('eacces')) {
    return 'Permission was denied for some files.'
  }
  if (error.length > 120) {
    return `${error.slice(0, 117).trimEnd()}…`
  }
  return error
}

function stepDetail(step: BoostStepResult): string | undefined {
  if (step.detail && step.detail.length > 140) {
    return `${step.detail.slice(0, 137).trimEnd()}…`
  }
  return step.detail
}

export function BoostResultsCard({ result }: BoostResultsCardProps): React.ReactElement {
  const outcome = outcomeFor(result)
  const OutcomeIcon = outcome.Icon

  return (
    <section
      aria-label="Boost results"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <div className={cn('flex items-start gap-3 border-b border-border px-5 py-4', outcome.tone)}>
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card/80 text-foreground shadow-sm">
          <OutcomeIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-section-title text-foreground">{outcome.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{outcome.message}</p>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <ResultStat
          icon={HardDrive}
          label="Disk freed"
          value={formatBytes(result.diskFreedBytes)}
          accent="text-primary"
        />
        <ResultStat
          icon={MemoryStick}
          label="Free memory delta"
          value={formatBytes(result.memoryReclaimedBytes)}
          accent="text-success"
        />
        <ResultStat
          icon={Zap}
          label="Processes stopped"
          value={String(result.processesTerminated)}
          accent="text-warning"
        />
        <ResultStat
          icon={Clock}
          label="Duration"
          value={`${(result.durationMs / 1000).toFixed(1)}s`}
          accent="text-muted-foreground"
        />
      </div>

      <div className="border-t border-border px-5 pb-5 pt-1">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Steps
        </p>
        <ul className="space-y-2.5">
          {result.steps.map((step) => {
            const meta = stepStatusMeta[step.status]
            const StatusIcon = meta.icon
            const detail = stepDetail(step)

            return (
              <li
                key={`${step.id}-${step.label}`}
                className="flex gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3"
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
                  {step.error ? (
                    <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs leading-relaxed text-destructive/90">
                      {friendlyError(step.error)}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 px-3.5 py-3">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card border border-border',
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
