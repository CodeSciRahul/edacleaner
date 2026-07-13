import { useCallback, useEffect, useState, type FocusEvent, type MouseEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import type { SidebarNavItem as NavItem } from '@/components/layout/sidebar-nav'
import { useTranslation } from '@/i18n/useTranslation'

interface SidebarNavItemProps {
  item: NavItem
  collapsed: boolean
}

interface TooltipState {
  top: number
  left: number
}

export function SidebarNavItem({ item, collapsed }: SidebarNavItemProps): React.ReactElement {
  const { t } = useTranslation()
  const Icon = item.icon
  const label = t(item.labelKey)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const showTooltip = useCallback(
    (event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) => {
      if (!collapsed) return
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltip({ top: rect.top + rect.height / 2, left: rect.right + 10 })
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
        aria-label={label}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={({ isActive }) =>
          cn(
            'group relative flex min-h-[44px] items-center overflow-hidden rounded-lg outline-none',
            'text-[13px] font-medium transition-all duration-150 ease-out',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
            collapsed ? 'h-11 w-11 justify-center' : 'h-11 w-full gap-3 px-3',
            isActive
              ? 'bg-sidebar-active text-sidebar-active-foreground shadow-sm'
              : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground'
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary',
                'transition-opacity duration-150',
                isActive ? 'opacity-100' : 'opacity-0'
              )}
            />
            <Icon
              className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-150',
                isActive ? 'text-primary' : 'text-sidebar-foreground group-hover:text-foreground'
              )}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            {!collapsed && <span className="truncate">{label}</span>}
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
              'rounded-lg border border-border bg-popover px-2.5 py-1.5',
              'text-xs font-medium text-popover-foreground shadow-md',
              'animate-sidebar-tooltip'
            )}
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {label}
          </span>,
          document.body
        )}
    </>
  )
}
