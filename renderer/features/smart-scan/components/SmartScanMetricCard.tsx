import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  getMetricVisual,
  type SmartScanMetricId
} from '@/features/smart-scan/lib/metric-meta'

interface SmartScanMetricCardProps {
  metricId: SmartScanMetricId
  title: string
  value: string
  actionLabel?: string
  onAction?: () => void
  /** Override default metric icon when area-specific icon is preferred */
  icon?: LucideIcon
}

export function SmartScanMetricCard({
  metricId,
  title,
  value,
  actionLabel,
  onAction,
  icon
}: SmartScanMetricCardProps): React.ReactElement {
  const visual = getMetricVisual(metricId)
  const Icon = icon ?? visual.icon
  const showAction = Boolean(actionLabel && onAction)

  return (
    <article
      className={cn(
        'group relative flex min-h-[112px] overflow-hidden rounded-2xl border border-border',
        'shadow-card transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-hover'
      )}
    >
      <img
        src={visual.bgImage}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/96 via-card/78 to-card/25 dark:from-card/94 dark:via-card/80 dark:to-card/35"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent dark:from-card/75"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl backdrop-blur-sm',
              visual.iconWrapClass
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          {showAction ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/55 text-muted-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
        </div>

        {showAction ? (
          <Button
            variant="link"
            size="sm"
            className="mt-auto h-auto w-fit gap-0.5 p-0 text-[11px] font-medium text-primary hover:text-primary/80"
            onClick={onAction}
          >
            {actionLabel}
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </article>
  )
}
