import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { useUiStore } from '@/store/ui-store'
import { sidebarNavItems } from '@/components/layout/sidebar-nav'
import { SidebarNavItem } from '@/components/layout/SidebarNavItem'
import { SidebarUpgradeCard } from '@/components/layout/SidebarUpgradeCard'
import { SidebarOfflineStatus } from '@/components/layout/SidebarOfflineStatus'
import { useTranslation } from '@/i18n/useTranslation'

export function Sidebar(): React.ReactElement {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { t } = useTranslation()

  return (
    <aside
      aria-label={t('sidebar.navMain')}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar',
        'transition-[width] duration-300 ease-out',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      <div
        className={cn(
          'flex h-toolbar shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
              {APP_NAME}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{t('sidebar.tagline')}</p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t('sidebar.collapse')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground',
              'transition-colors duration-150 hover:bg-sidebar-hover hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label={t('sidebar.navPrimary')}>
        {sidebarNavItems.map((item) => (
          <SidebarNavItem key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-2 border-t border-sidebar-border p-2', collapsed && 'px-1.5')}>
        <SidebarUpgradeCard collapsed={collapsed} />

        <SidebarOfflineStatus collapsed={collapsed} />

        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t('sidebar.expand')}
            className={cn(
              'mx-auto flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground',
              'transition-colors duration-150 hover:bg-sidebar-hover hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  )
}
