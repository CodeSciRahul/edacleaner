import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ToolbarProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function Toolbar({
  title,
  description,
  actions,
  className
}: ToolbarProps): React.ReactElement {
  return (
    <header
      className={cn(
        'flex h-toolbar shrink-0 items-center justify-between gap-4',
        'border-b border-border bg-surface px-content-pad',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-page-title text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
