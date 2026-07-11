import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface PerformanceActionItem {
  id: string
  icon: LucideIcon
  title: string
  description: string
  value: string
  actionLabel: string
  onAction: () => void
  accentClass: string
}

interface PerformanceActionGridProps {
  items: PerformanceActionItem[]
}

export function PerformanceActionGrid({
  items
}: PerformanceActionGridProps): React.ReactElement {
  return (
    <section aria-label="Quick actions">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-section-title text-foreground">Optimize further</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Jump into managers and reclaim more resources.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onAction}
              className={cn(
                'group flex flex-col rounded-xl border border-border bg-card p-4 text-left shadow-card',
                'transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    item.accentClass
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {item.value}
              </p>
              <span className="mt-2 text-[12px] font-medium text-primary">{item.actionLabel}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
