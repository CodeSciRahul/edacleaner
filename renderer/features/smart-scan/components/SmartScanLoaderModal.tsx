import { Loader2, ScanSearch, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { SmartScanAreaId } from '@shared/interfaces'
import { smartScanAreaIcons } from '@/features/smart-scan/lib/scan-meta'
import { smartScanAreaLabelKey } from '@/features/smart-scan/lib/area-i18n'
import { useTranslation } from '@/i18n/useTranslation'
import scanLoader from '@/assets/smart-scan/scan-loader.webp'
import loaderModalBgDark from '@/assets/smart-scan/loader-modal-bg-dark.png'
import loaderModalBgLight from '@/assets/smart-scan/loader-modal-bg-light.png'

interface SmartScanLoaderModalProps {
  open: boolean
  message?: string
  percent?: number
  currentItem?: string
  areaId?: SmartScanAreaId
  areaOrder: SmartScanAreaId[]
  onCancel: () => void
  cancelPending?: boolean
}

function areaState(
  id: SmartScanAreaId,
  activeId: SmartScanAreaId | undefined,
  order: SmartScanAreaId[],
  percent: number
): 'done' | 'active' | 'pending' {
  if (percent >= 100) return 'done'
  if (!activeId) return 'pending'
  const activeIndex = order.indexOf(activeId)
  const index = order.indexOf(id)
  if (index < 0) return 'pending'
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'pending'
}

export function SmartScanLoaderModal({
  open,
  message,
  percent = 0,
  currentItem,
  areaId,
  areaOrder,
  onCancel,
  cancelPending = false
}: SmartScanLoaderModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, percent))
  const liveMessage = message ?? t('smartScan.status.scanningMsg')
  const itemLine = currentItem ? currentItem : t('smartScan.progress.fallback')

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Scrim — non-dismissive; cancel only via explicit control */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-scan-loader-title"
        aria-describedby="smart-scan-loader-desc"
        className="relative z-[1] flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl shadow-black/15 animate-in fade-in-0 zoom-in-95 duration-300"
      >
        {/* Full-bleed brand art — `.light` / `.dark` on <html> */}
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
        {/* Soft theme scrim: art shows at edges/top; mid-panel stays readable */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/45 via-card/70 to-card/85 dark:from-card/40 dark:via-card/65 dark:to-card/80"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--card)_/_0.55)_0%,transparent_72%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full flex-col items-center px-5 py-6 sm:px-6 sm:py-7">
          {/* Transparent WebP loader — no black plate behind it */}
          <div className="relative mx-auto">
            <img
              src={scanLoader}
              alt=""
              className="block h-44 w-44 object-contain object-center sm:h-52 sm:w-52"
              draggable={false}
              aria-hidden="true"
            />
          </div>

          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
            <ScanSearch className="h-3 w-3" aria-hidden="true" />
            {t('common.scanning')}
          </div>

          <h2
            id="smart-scan-loader-title"
            className="mt-3 text-base font-semibold tracking-tight text-foreground sm:text-lg"
          >
            {t('smartScan.status.scanningTitle')}
          </h2>

          <div
            id="smart-scan-loader-desc"
            className="mt-2 w-full space-y-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm font-medium tabular-nums text-foreground">
              {Math.round(clamped)}%
              <span className="sr-only"> {t('smartScan.status.scanningTitle')}</span>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{liveMessage}</p>
            <p className="truncate text-xs text-muted-foreground">{itemLine}</p>
          </div>

          <div
            className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/40 backdrop-blur-sm"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('smartScan.status.scanningTitle')}
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

          <ol
            className="mt-4 flex w-full flex-wrap justify-center gap-1.5"
            aria-label={t('smartScan.areas')}
          >
            {areaOrder.map((id) => {
              const state = areaState(id, areaId, areaOrder, clamped)
              const Icon = smartScanAreaIcons[id]
              const label = t(smartScanAreaLabelKey(id))

              return (
                <li
                  key={id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition-all duration-300',
                    state === 'active' &&
                      'border-primary/40 bg-primary/20 text-primary shadow-sm shadow-primary/10',
                    state === 'done' && 'border-success/35 bg-success/15 text-success',
                    state === 'pending' &&
                      'border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  {state === 'active' ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  )}
                  <span>{label}</span>
                </li>
              )
            })}
          </ol>

          <Button
            size="sm"
            variant="outline"
            className="mt-5 h-9 gap-2 rounded-lg bg-card/60 px-4 text-[13px] backdrop-blur-sm"
            onClick={onCancel}
            disabled={cancelPending}
          >
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            {t('common.pause')}
          </Button>
        </div>
      </div>
    </div>
  )
}
