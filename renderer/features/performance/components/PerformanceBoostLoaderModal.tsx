import { Square, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/useTranslation'
import loaderModalBgDark from '@/assets/performance/loader-modal-bg-dark.png'
import loaderModalBgLight from '@/assets/performance/loader-modal-bg-light.png'
import { BoostRocketLoader } from '@/features/performance/components/BoostRocketLoader'

interface PerformanceBoostLoaderModalProps {
  open: boolean
  message?: string
  percent?: number
  currentItem?: string
  onCancel: () => void
  cancelPending?: boolean
}

function shortPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 3) return path
  return `…/${parts.slice(-3).join('/')}`
}

export function PerformanceBoostLoaderModal({
  open,
  message,
  percent = 0,
  currentItem,
  onCancel,
  cancelPending = false
}: PerformanceBoostLoaderModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, percent))
  const liveMessage = message ?? t('performance.boosting.message')
  const itemLine = currentItem
    ? t('performance.boosting.working', { path: shortPath(currentItem) })
    : t('performance.boosting.scanning')

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-loader-title"
        aria-describedby="boost-loader-desc"
        className="relative z-[1] flex w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl shadow-black/15 animate-in fade-in-0 zoom-in-95 duration-300"
      >
        <img
          src={loaderModalBgLight}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center dark:hidden"
          draggable={false}
          aria-hidden="true"
        />
        <img
          src={loaderModalBgDark}
          alt=""
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-center dark:block"
          draggable={false}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/40 via-card/68 to-card/85 dark:from-card/35 dark:via-card/62 dark:to-card/80"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--card)_/_0.52)_0%,transparent_72%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full flex-col items-center px-4 pb-5 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
          <BoostRocketLoader />

          <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
            <Zap className="h-3 w-3" aria-hidden="true" />
            {t('performance.boosting.badge')}
          </div>

          <h2
            id="boost-loader-title"
            className="mt-2 text-sm font-semibold tracking-tight text-foreground sm:text-base"
          >
            {t('performance.boosting.title')}
          </h2>

          <div
            id="boost-loader-desc"
            className="mt-1.5 w-full space-y-0.5"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm font-medium tabular-nums text-foreground">
              {Math.round(clamped)}%
              <span className="sr-only"> {t('performance.boosting.title')}</span>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{liveMessage}</p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{itemLine}</p>
          </div>

          <div
            className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/40 backdrop-blur-sm"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('performance.boosting.title')}
          >
            <div
              className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary via-chart-ram to-chart-disk transition-[width] duration-500 ease-out"
              style={{ width: `${clamped}%` }}
            >
              <div
                className="absolute inset-0 -translate-x-full animate-[cleanup-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                aria-hidden="true"
              />
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="mt-4 h-8 gap-1.5 rounded-lg bg-card/60 px-3.5 text-xs backdrop-blur-sm"
            onClick={onCancel}
            disabled={cancelPending}
          >
            <Square className="h-3 w-3" aria-hidden="true" />
            {t('performance.hero.cancelBoost')}
          </Button>
        </div>
      </div>
    </div>
  )
}
