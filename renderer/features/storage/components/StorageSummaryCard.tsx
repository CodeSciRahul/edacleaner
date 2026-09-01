import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import {
  getSummaryVisual,
  type StorageSummaryCardId
} from '@/features/storage/lib/summary-meta'

interface StorageSummaryCardProps {
  cardId: StorageSummaryCardId
  label: string
  value: string
  badge?: ReactNode
}

export function StorageSummaryCard({
  cardId,
  label,
  value,
  badge
}: StorageSummaryCardProps): React.ReactElement {
  const visual = getSummaryVisual(cardId)
  const Icon = visual.icon

  return (
    <article
      className={cn(
        'group relative flex overflow-hidden rounded-2xl border border-border p-3.5',
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

      <div className="relative z-10 flex min-w-0 flex-1 items-start gap-2.5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg backdrop-blur-sm',
            visual.iconWrapClass
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[11px] font-medium leading-tight text-muted-foreground">
            {label}
          </h3>
          <p className="mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {badge}
        </div>
      </div>
    </article>
  )
}
