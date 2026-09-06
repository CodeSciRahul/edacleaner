import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectedIndicatorProps {
  selected: boolean
}

/**
 * Polished selection badge for settings option cards.
 * Place inside a `relative` card; sits at the top-right corner.
 * Accessibility is owned by the parent radio/button (`aria-checked`).
 */
export function SelectedIndicator({ selected }: SelectedIndicatorProps): React.ReactElement {
  return (
    <span
      className={cn(
        'pointer-events-none absolute right-2.5 top-2.5 z-10',
        'flex h-5 w-5 items-center justify-center rounded-full',
        'transition-all duration-200 ease-out',
        selected
          ? [
              'scale-100 opacity-100',
              'bg-gradient-to-br from-sky-400 via-primary to-blue-600',
              'text-primary-foreground',
              'shadow-md shadow-primary/40',
              'ring-2 ring-background'
            ]
          : 'scale-75 border border-border/80 bg-background/90 opacity-0 group-hover:scale-90 group-hover:opacity-40'
      )}
      aria-hidden="true"
    >
      {selected ? <Check className="h-3 w-3 drop-shadow-sm" strokeWidth={2.75} /> : null}
    </span>
  )
}
