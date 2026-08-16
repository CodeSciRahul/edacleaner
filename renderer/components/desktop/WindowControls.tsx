import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import { useWindowControls } from '@/hooks/useWindowControls'

function RestoreIcon(): React.ReactElement {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M3 2.5H7.5V7"
        className="stroke-current"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <rect
        x="1.25"
        y="3.25"
        width="5.5"
        height="5.5"
        className="stroke-current"
        strokeWidth="1.15"
      />
    </svg>
  )
}

export function WindowControls(): React.ReactElement {
  const { t } = useTranslation()
  const { maximized, minimize, toggleMaximize, close } = useWindowControls()

  return (
    <div className="app-no-drag flex h-full shrink-0 items-stretch" role="group" aria-label={t('window.controls')}>
      <button
        type="button"
        className={cn(
          'flex w-[46px] items-center justify-center text-muted-foreground',
          'transition-colors duration-150',
          'hover:bg-sidebar-hover hover:text-foreground',
          'active:bg-sidebar-active',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
        aria-label={t('window.minimize')}
        onClick={minimize}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(
          'flex w-[46px] items-center justify-center text-muted-foreground',
          'transition-colors duration-150',
          'hover:bg-sidebar-hover hover:text-foreground',
          'active:bg-sidebar-active',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
        aria-label={maximized ? t('window.restore') : t('window.maximize')}
        onClick={toggleMaximize}
      >
        {maximized ? (
          <RestoreIcon />
        ) : (
          <Square className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        className={cn(
          'flex w-[46px] items-center justify-center text-muted-foreground',
          'transition-colors duration-150',
          'hover:bg-destructive hover:text-destructive-foreground',
          'active:bg-destructive/90 active:text-destructive-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
        aria-label={t('window.close')}
        onClick={close}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}
