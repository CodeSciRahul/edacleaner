import { ArrowUpRight, Crown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

interface SidebarUpgradeCardProps {
  collapsed: boolean
}

export function SidebarUpgradeCard({ collapsed }: SidebarUpgradeCardProps): React.ReactElement {
  if (collapsed) {
    return (
      <button
        type="button"
        title="Upgrade to Pro"
        aria-label="Upgrade to Pro"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          'bg-gradient-to-br from-amber-500/90 to-orange-600/90 text-white',
          'shadow-md shadow-amber-500/20 outline-none',
          'transform-gpu transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'hover:scale-110 hover:shadow-lg hover:shadow-amber-500/30',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
          'active:scale-95'
        )}
      >
        <Crown
          className="h-4 w-4 transition-transform duration-300 group-hover:rotate-6"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-amber-500/15 p-3.5',
        'bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-transparent',
        'transform-gpu transition-[transform,box-shadow,border-color] duration-300',
        'ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:-translate-y-px hover:border-amber-500/25 hover:shadow-md hover:shadow-amber-500/10',
        'animate-sidebar-fade-in'
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl transition-opacity duration-300"
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
            'shadow-sm shadow-amber-500/25',
            'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:scale-105'
          )}
        >
          <Crown className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
            Upgrade to Pro
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Unlock deeper scans and advanced optimization.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        className={cn(
          'mt-3 h-8 w-full rounded-lg text-xs font-semibold',
          'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
          'shadow-sm shadow-amber-500/20',
          'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'hover:from-amber-500/95 hover:to-orange-600/95 hover:shadow-md hover:shadow-amber-500/25',
          'active:scale-[0.98]'
        )}
      >
        Go Pro
        <ArrowUpRight
          className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Button>
    </div>
  )
}
