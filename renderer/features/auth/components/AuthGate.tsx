import splashLogoLoop from '@/assets/app logo/splash-logo-loop.gif'
import { WindowControls } from '@/components/desktop/WindowControls'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface SplashScreenProps {
  className?: string
  /** Show title-bar drag region + window controls (main window boot). */
  withWindowChrome?: boolean
  /** When chrome is shown, whether maximize is available. */
  showMaximize?: boolean
}

/**
 * Full-bleed brand splash used while the session restores after the native
 * splash window hands off to the main renderer.
 */
export function SplashScreen({
  className,
  withWindowChrome = true,
  showMaximize = true
}: SplashScreenProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#2563EB]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={t('auth.booting')}
    >
      {withWindowChrome ? (
        <header className="absolute inset-x-0 top-0 z-10 flex h-titlebar shrink-0 select-none">
          <div className="app-drag min-w-0 flex-1" />
          <WindowControls tone="light" showMaximize={showMaximize} />
        </header>
      ) : null}

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <img
          src={splashLogoLoop}
          alt=""
          className="h-[min(360px,70vmin)] w-[min(360px,70vmin)] object-contain"
          draggable={false}
        />
      </div>
      <span className="sr-only">{t('auth.booting')}</span>
    </div>
  )
}

/** @deprecated Prefer SplashScreen — kept as a named alias for existing imports. */
export function AuthBootScreen(): React.ReactElement {
  return <SplashScreen />
}
