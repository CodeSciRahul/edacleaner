import { Loader2, ScanSearch } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import type { SmartScanAreaId } from '@shared/interfaces'
import { smartScanAreaIcons } from '@/features/smart-scan/lib/scan-meta'
import { smartScanAreaLabelKey } from '@/features/smart-scan/lib/area-i18n'
import { useTranslation } from '@/i18n/useTranslation'

interface SmartScanProgressPanelProps {
  message: string
  percent: number
  currentItem?: string
  areaId?: SmartScanAreaId
  areaOrder: SmartScanAreaId[]
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

export function SmartScanProgressPanel({
  message,
  percent,
  currentItem,
  areaId,
  areaOrder
}: SmartScanProgressPanelProps): React.ReactElement {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <section
      aria-label={t('smartScan.status.scanningTitle')}
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.08] shadow-card animate-in fade-in-0 zoom-in-95 duration-300"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-chart-ram/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <div
            className="absolute inset-0 scale-110 rounded-full bg-primary/10 blur-xl"
            aria-hidden="true"
          />
          <CircularProgress value={clamped} size={112} strokeWidth={9} color="cpu" label="scanned" />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <ScanSearch className="h-3 w-3" aria-hidden="true" />
              {t('smartScan.status.scanningTitle')}
            </div>
            <p className="text-base font-semibold text-foreground sm:text-lg">{message}</p>
            <p className="truncate text-xs text-muted-foreground">
              {currentItem ? currentItem : t('smartScan.progress.fallback')}
            </p>
          </div>

          <div
            className="relative h-3 overflow-hidden rounded-full bg-muted/80"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
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

          <ol className="flex flex-wrap gap-2" aria-label={t('smartScan.areas')}>
            {areaOrder.map((id) => {
              const state = areaState(id, areaId, areaOrder, clamped)
              const Icon = smartScanAreaIcons[id]
              const label = t(smartScanAreaLabelKey(id))

              return (
                <li
                  key={id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300',
                    state === 'active' &&
                      'border-primary/40 bg-primary/15 text-primary shadow-sm shadow-primary/10',
                    state === 'done' && 'border-success/30 bg-success/10 text-success',
                    state === 'pending' &&
                      'border-border bg-muted/40 text-muted-foreground'
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
        </div>
      </div>
    </section>
  )
}
