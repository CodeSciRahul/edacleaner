import { PanelLeftClose } from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { useUiStore } from '@/store/ui-store'
import { useTranslation } from '@/i18n/useTranslation'
import { WindowControls } from '@/components/desktop/WindowControls'
import { useWindowControls } from '@/hooks/useWindowControls'
import appIcon from '@/assets/app logo/App Icon1.svg'

interface TitleBarProps {
  /** `app` aligns the brand with the sidebar column. */
  variant?: 'app' | 'simple' | 'overlay'
  accessory?: React.ReactNode
}

function BrandMark({ size = 'sm' }: { size?: 'sm' | 'md' }): React.ReactElement {
  const dim = size === 'md' ? 'h-8 w-8' : 'h-7 w-7'
  return (
    <img
      src={appIcon}
      alt=""
      className={cn(dim, 'shrink-0 rounded-md object-contain shadow-sm')}
      draggable={false}
    />
  )
}

export function TitleBar({ variant = 'simple', accessory }: TitleBarProps): React.ReactElement {
  const { t } = useTranslation()
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const { toggleMaximize } = useWindowControls()

  if (variant === 'overlay') {
    return (
      <header className="flex h-titlebar shrink-0 select-none bg-gradient-to-b from-white/35 to-transparent">
        <div
          className="app-drag flex min-w-0 flex-1 items-center px-4"
        >
          {accessory ? <div className="app-no-drag min-w-0">{accessory}</div> : null}
        </div>
        <WindowControls showMaximize={false} />
      </header>
    )
  }

  if (variant === 'simple') {
    return (
      <header className="flex h-titlebar shrink-0 select-none border-b border-sidebar-border bg-sidebar">
        <div
          className="app-drag flex min-w-0 flex-1 items-center gap-2.5 px-4"
          onDoubleClick={toggleMaximize}
        >
          <BrandMark />
          <p className="truncate text-[13px] font-semibold leading-none tracking-tight text-foreground">
            {APP_NAME}
          </p>
          {accessory ? <div className="app-no-drag ml-3 min-w-0">{accessory}</div> : null}
        </div>
        <WindowControls />
      </header>
    )
  }

  return (
    <header className="flex h-titlebar shrink-0 select-none border-b border-sidebar-border bg-sidebar">
      <div
        className={cn(
          'app-drag flex h-full items-center border-r border-sidebar-border',
          'transition-[width] duration-300 ease-out',
          collapsed ? 'w-sidebar-collapsed justify-center px-2' : 'w-sidebar gap-2.5 px-4'
        )}
      >
        {collapsed ? (
          <button
            type="button"
            className={cn(
              'app-no-drag flex items-center justify-center rounded-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label={t('sidebar.expand')}
            onClick={toggleSidebar}
          >
            <BrandMark size="md" />
          </button>
        ) : (
          <>
            <BrandMark size="md" />
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none tracking-tight text-foreground">
              {APP_NAME}
            </p>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={t('sidebar.collapse')}
              className={cn(
                'app-no-drag flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground',
                'transition-colors duration-150 hover:bg-sidebar-hover hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div
        className="app-drag flex h-full min-w-0 flex-1 items-center"
        onDoubleClick={toggleMaximize}
      >
        {accessory ? (
          <div className="app-no-drag flex min-w-0 flex-1 items-center px-4">{accessory}</div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <WindowControls />
      </div>
    </header>
  )
}
