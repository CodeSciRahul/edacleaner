import { PanelLeftOpen } from 'lucide-react'
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
      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-2 py-2" aria-label={t('sidebar.navPrimary')}>
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
