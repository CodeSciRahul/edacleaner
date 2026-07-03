import { useCallback, useEffect, useState, type FocusEvent, type MouseEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import {
  sidebarActiveSurface,
  type SidebarNavItem as NavItem
} from '@/components/layout/sidebar-nav'

interface SidebarNavItemProps {
  item: NavItem
  collapsed: boolean
  index: number
}

interface TooltipState {
  top: number
  left: number
}

export function SidebarNavItem({
  item,
  collapsed,
  index
}: SidebarNavItemProps): React.ReactElement {
  const Icon = item.icon
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const showTooltip = useCallback(
    (event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) => {
      if (!collapsed) return
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltip({
        top: rect.top + rect.height / 2,
        left: rect.right + 10
      })
    },
    [collapsed]
  )

  const hideTooltip = useCallback(() => setTooltip(null), [])

  useEffect(() => {
    if (!collapsed) setTooltip(null)
  }, [collapsed])

  return (
    <>
      <NavLink
        to={item.href}
        end={item.href === '/'}
        aria-label={item.label}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        style={{ transitionDelay: collapsed ? '0ms' : `${index * 18}ms` }}
        className={({ isActive }) =>
          cn(
            'group relative z-[1] flex items-center overflow-hidden rounded-xl outline-none',
            'text-[13px] font-medium tracking-[-0.01em]',
            'transform-gpu',
            'transition-[background-color,color,box-shadow,transform] duration-300',
            'ease-[cubic-bezier(0.22,1,0.36,1)]',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
            'active:scale-[0.98]',
            collapsed
              ? 'h-9 w-9 shrink-0 justify-center'
              : 'h-11 w-full gap-3 px-3',
            isActive
              ? cn('text-sidebar-active-foreground', sidebarActiveSurface)
              : cn(
                  'text-sidebar-foreground',
                  'hover:-translate-y-px hover:bg-sidebar-hover/80 hover:text-foreground'
                )
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full',
                'origin-center transform-gpu',
                'transition-[transform,opacity,background-color] duration-300',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',
                item.accent.bar,
                collapsed || !isActive ? 'scale-y-50 opacity-0' : 'scale-y-100 opacity-100'
              )}
            />

            <Icon
              className={cn(
                'h-[18px] w-[18px] shrink-0 transform-gpu',
                'transition-[color,transform,filter] duration-300',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',
                'group-hover:scale-110',
                isActive
                  ? cn(item.accent.iconActive, 'drop-shadow-sm')
                  : cn(item.accent.icon, 'group-hover:brightness-110')
              )}
              strokeWidth={1.75}
              aria-hidden="true"
            />

            <span
              className={cn(
                'truncate transform-gpu',
                'transition-[opacity,transform,max-width] duration-[360ms]',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',
                collapsed
                  ? 'max-w-0 translate-x-1 opacity-0'
                  : 'max-w-[140px] translate-x-0 opacity-100'
              )}
              aria-hidden={collapsed}
            >
              {item.label}
            </span>
          </>
        )}
      </NavLink>

      {collapsed &&
        tooltip &&
        createPortal(
          <span
            role="tooltip"
            className={cn(
              'pointer-events-none fixed z-[100] -translate-y-1/2',
              'rounded-lg border border-border/80 bg-popover px-2.5 py-1.5',
              'text-xs font-medium text-popover-foreground',
              'shadow-lg shadow-black/10 dark:shadow-black/40',
              'animate-sidebar-tooltip'
            )}
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {item.label}
          </span>,
          document.body
        )}
    </>
  )
}
