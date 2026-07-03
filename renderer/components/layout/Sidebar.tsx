import { PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { useUiStore } from '@/store/ui-store'
import { sidebarNavItems } from '@/components/layout/sidebar-nav'
import { SidebarNavItem } from '@/components/layout/SidebarNavItem'
import { SidebarUpgradeCard } from '@/components/layout/SidebarUpgradeCard'

export function Sidebar(): React.ReactElement {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <aside
      aria-label="Main navigation"
      data-collapsed={collapsed}
      className={cn(
        'group/sidebar relative flex h-full shrink-0 flex-col overflow-hidden',
        'border-r border-sidebar-border bg-sidebar',
        'transition-[width] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'motion-reduce:transition-none',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      <div
        className={cn(
          'flex h-[60px] shrink-0 items-center',
          'transition-[padding,gap] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'justify-center' : 'gap-3 px-3.5'
        )}
      >
        <div
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
            'text-white shadow-md shadow-blue-500/25',
            'ring-1 ring-white/10',
            'transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30'
          )}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-white/20"
            aria-hidden="true"
          />
          <Sparkles
            className="relative h-4 w-4 transition-transform duration-300 group-hover/sidebar:rotate-12"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>

        <div
          className={cn(
            'min-w-0 overflow-hidden whitespace-nowrap',
            'transform-gpu transition-[max-width,opacity,transform] duration-[360ms]',
            'ease-[cubic-bezier(0.22,1,0.36,1)]',
            collapsed
              ? 'pointer-events-none max-w-0 -translate-x-2 opacity-0'
              : 'max-w-[150px] translate-x-0 opacity-100'
          )}
          aria-hidden={collapsed}
          aria-label={APP_NAME}
        >
          <p className="truncate text-[15px] font-semibold leading-none tracking-[-0.03em]">
            <span className="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent dark:from-sky-300 dark:via-blue-300 dark:to-indigo-300">
              EDA
            </span>
            <span className="text-foreground"> Cleaner</span>
          </p>
          <p className="mt-1 truncate text-[11px] font-medium tracking-[0.08em] text-muted-foreground/75">
            PC OPTIMIZER
          </p>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg outline-none',
            'text-muted-foreground transform-gpu',
            'transition-[background-color,color,transform,opacity,width,height,margin] duration-300',
            'ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:bg-sidebar-hover hover:text-foreground hover:scale-105',
            'focus-visible:ring-2 focus-visible:ring-ring',
            'active:scale-95',
            collapsed
              ? 'pointer-events-none h-0 w-0 opacity-0'
              : 'ml-auto h-8 w-8 opacity-100'
          )}
          tabIndex={collapsed ? -1 : 0}
        >
          <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <nav
        className={cn(
          'sidebar-scroll flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-2',
          'transition-[padding,gap] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'items-center gap-1 px-0' : 'gap-0.5 px-3'
        )}
        aria-label="Primary"
      >
        {sidebarNavItems.map((item, index) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            index={index}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div
        className={cn(
          'flex shrink-0 flex-col pb-3 pt-1',
          'transition-[padding,gap] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'items-center gap-2' : 'gap-3 px-3'
        )}
      >
        <SidebarUpgradeCard collapsed={collapsed} />

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className={cn(
            'flex items-center justify-center rounded-xl outline-none',
            'text-muted-foreground transform-gpu',
            'transition-[background-color,color,transform,opacity,height,width] duration-300',
            'ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:bg-sidebar-hover hover:text-foreground hover:scale-105',
            'focus-visible:ring-2 focus-visible:ring-ring',
            'active:scale-95',
            collapsed
              ? 'h-9 w-9 opacity-100'
              : 'pointer-events-none h-0 w-0 overflow-hidden opacity-0'
          )}
          tabIndex={collapsed ? 0 : -1}
        >
          <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
