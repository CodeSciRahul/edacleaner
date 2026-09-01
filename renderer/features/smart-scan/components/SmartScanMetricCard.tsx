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
        'group relative flex overflow-hidden rounded-2xl border border-border p-3',
        'shadow-card transition-all duration-150 ease-out',
        'hover:-translate-y-0.5 hover:shadow-card-hover'
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

      <div className="relative z-10 grid w-full min-w-0 grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-0.5">
        <div
          className={cn(
            'row-span-2 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg backdrop-blur-sm',
            visual.iconWrapClass
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        </div>

        <h3 className="min-w-0 self-end truncate text-[11px] font-medium leading-tight text-muted-foreground">
          {title}
        </h3>

        <p className="min-w-0 truncate text-base font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>

        {showAction ? (
          <Button
            variant="link"
            size="sm"
            className="col-start-2 mt-1 h-auto w-fit gap-0.5 p-0 text-[11px] font-medium text-primary hover:text-primary/80"
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
