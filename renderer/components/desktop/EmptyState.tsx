import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { AppIcon } from '@/components/brand'

interface EmptyStateProps {
  icon?: LucideIcon
  /** When true (or when no icon is provided), show the product mark. */
  branded?: boolean
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  branded,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps): React.ReactElement {
  const showBrand = branded || !Icon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border',
        'bg-muted/30 px-8 py-16 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {showBrand ? (
          <AppIcon size="md" className="h-10 w-10" />
        ) : Icon ? (
          <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
        ) : null}
      </div>
      <h3 className="text-section-title text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-6" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
