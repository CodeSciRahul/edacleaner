import { ShieldCheck } from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { useWindowChrome } from '@/hooks/useWindowChrome'
import { useTranslation } from '@/i18n/useTranslation'
import { WindowControls } from '@/components/layout/WindowControls'

export function TitleBar(): React.ReactElement {
  const { t } = useTranslation()
  const { isMac, showCustomControls, maximized, minimize, toggleMaximize, close } =
    useWindowChrome()

  return (
    <header
      className={cn(
        'app-region-drag relative z-50 flex h-titlebar shrink-0 select-none items-center',
        'border-b border-sidebar-border bg-sidebar'
      )}
      onDoubleClick={() => void toggleMaximize()}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_90%_at_0%_0%,hsl(var(--primary)/0.14),transparent_52%)]"
      />

      <div
        className={cn(
          'relative flex min-w-0 flex-1 items-center gap-2.5 px-3',
          isMac && 'pl-[78px]'
        )}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[12px] font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{t('titlebar.subtitle')}</p>
        </div>
      </div>

      {showCustomControls ? (
        <WindowControls
          maximized={maximized}
          onMinimize={() => void minimize()}
          onMaximize={() => void toggleMaximize()}
          onClose={() => void close()}
        />
      ) : (
        <div className="w-3 shrink-0" aria-hidden="true" />
      )}
    </header>
  )
}
