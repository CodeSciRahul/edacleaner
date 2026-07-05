import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

interface MetricCardProps {
  icon: LucideIcon
  title: string
  description?: string
  value: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function MetricCard({
  icon: Icon,
  title,
  description,
  value,
  actionLabel,
  onAction,
  className
}: MetricCardProps): React.ReactElement {
  return (
    <article
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card p-card-pad',
        'shadow-card transition-all duration-150 ease-out',
        'hover:-translate-y-[2px] hover:shadow-card-hover',
        className
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-card-title font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}
      <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="link"
          size="sm"
          className="mt-3 h-auto p-0 text-[13px] font-medium text-primary"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </article>
  )
}
