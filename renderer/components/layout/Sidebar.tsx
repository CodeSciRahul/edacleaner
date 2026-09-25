import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { isMacOS } from '@/utils/platform'
import { useUiStore } from '@/store/ui-store'
import { sidebarNavItems } from '@/components/layout/sidebar-nav'
import { SidebarNavItem } from '@/components/layout/SidebarNavItem'
import { SidebarUpgradeCard } from '@/components/layout/SidebarUpgradeCard'
import { SidebarOfflineStatus } from '@/components/layout/SidebarOfflineStatus'
import { useTranslation } from '@/i18n/useTranslation'
import appIcon from '@/assets/app logo/App Icon1.svg'

export function Sidebar(): React.ReactElement {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { t } = useTranslation()
  const mac = isMacOS()

  return (
    <aside
      aria-label={t('sidebar.navMain')}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar',
        'transition-[width] duration-300 ease-out',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      {/* macOS: brand sits in the sidebar rail under the traffic-light titlebar cell */}
      {mac ? (
        <div
          className={cn(
            'flex h-titlebar shrink-0 items-center',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
          )}
        >
          {collapsed ? (
            <button
              type="button"
              className={cn(
                'flex items-center justify-center rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
              aria-label={t('sidebar.expand')}
              onClick={toggleSidebar}
            >
              <img
                src={appIcon}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-contain shadow-sm"
                draggable={false}
              />
            </button>
          ) : (
            <>
              <img
                src={appIcon}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-contain shadow-sm"
                draggable={false}
              />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none tracking-tight text-foreground">
                {APP_NAME}
              </p>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t('sidebar.collapse')}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground',
                  'transition-colors duration-150 hover:bg-sidebar-hover hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      ) : null}

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
