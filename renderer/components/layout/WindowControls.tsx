import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

interface WindowControlsProps {
  maximized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
  className?: string
}

function RestoreIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="3.5" y="1.5" width="7" height="7" rx="0.8" />
      <path d="M8.5 4.5H2.2A.7.7 0 0 0 1.5 5.2v4.6a.7.7 0 0 0 .7.7h4.6a.7.7 0 0 0 .7-.7V8.5" />
    </svg>
  )
}

export function WindowControls({
  maximized,
  onMinimize,
  onMaximize,
  onClose,
  className
}: WindowControlsProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div
      className={cn('app-region-no-drag flex h-full items-stretch', className)}
      role="group"
      aria-label={t('titlebar.windowControls')}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onMinimize}
        aria-label={t('titlebar.minimize')}
        className={cn(
          'flex h-full w-[46px] items-center justify-center text-muted-foreground',
          'transition-colors duration-150 hover:bg-sidebar-hover hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onMaximize}
        aria-label={maximized ? t('titlebar.restore') : t('titlebar.maximize')}
        className={cn(
          'flex h-full w-[46px] items-center justify-center text-muted-foreground',
          'transition-colors duration-150 hover:bg-sidebar-hover hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
      >
        {maximized ? (
          <RestoreIcon />
        ) : (
          <Square className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label={t('titlebar.close')}
        className={cn(
          'flex h-full w-[46px] items-center justify-center text-muted-foreground',
          'transition-colors duration-150 hover:bg-destructive hover:text-destructive-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}
