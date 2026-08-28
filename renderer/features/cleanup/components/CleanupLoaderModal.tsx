import { HardDrive, Loader2, Sparkles, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { CleanupCategoryId } from '@shared/interfaces'
import { getCategoryVisual } from '@/features/cleanup/lib/category-meta'
import { cleanupCategoryLabelKey } from '@/features/cleanup/lib/category-i18n'
import { useTranslation } from '@/i18n/useTranslation'
import cleanupLoader from '@/assets/cleanup/cleanup-loader.webp'
import loaderModalBgDark from '@/assets/cleanup/loader-modal-bg-dark.png'
import loaderModalBgLight from '@/assets/cleanup/loader-modal-bg-light.png'

interface CleanupCategoryStep {
  id: CleanupCategoryId
  label: string
}

interface CleanupLoaderModalProps {
  open: boolean
  message?: string
  percent?: number
  currentItem?: string
  bytesFreedSoFar?: number
  categoryId?: CleanupCategoryId
  categories?: CleanupCategoryStep[]
  onCancel: () => void
  cancelPending?: boolean
}

function stepState(
  stepId: CleanupCategoryId,
  activeId: CleanupCategoryId | undefined,
  categories: CleanupCategoryStep[],
  percent: number
): 'done' | 'active' | 'pending' {
  if (percent >= 100) return 'done'
  if (!activeId) return 'pending'
  const activeIndex = categories.findIndex((c) => c.id === activeId)
  const stepIndex = categories.findIndex((c) => c.id === stepId)
  if (stepIndex < 0) return 'pending'
  if (stepIndex < activeIndex) return 'done'
  if (stepIndex === activeIndex) return 'active'
  return 'pending'
}

function shortPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 3) return path
  return `…/${parts.slice(-3).join('/')}`
}

export function CleanupLoaderModal({
  open,
  message,
  percent = 0,
  currentItem,
  bytesFreedSoFar = 0,
  categoryId,
  categories = [],
  onCancel,
  cancelPending = false
}: CleanupLoaderModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, percent))
  const liveMessage = message ?? t('cleanup.status.cleaningMsg')
  const itemLine = currentItem
    ? t('cleanup.progress.working', { path: shortPath(currentItem) })
    : t('cleanup.progress.clean')

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
        aria-labelledby="cleanup-loader-title"
        aria-describedby="cleanup-loader-desc"
        className="relative z-[1] flex w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl shadow-black/15 animate-in fade-in-0 zoom-in-95 duration-300"
      >
        {/* Full-bleed cleanup brand art — `.light` / `.dark` on <html> */}
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
        {/* Soft theme scrim: art shows at edges; mid-panel stays readable */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/45 via-card/70 to-card/85 dark:from-card/40 dark:via-card/65 dark:to-card/80"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--card)_/_0.55)_0%,transparent_72%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full flex-col items-center px-4 pb-5 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
          {/* Animated person + jhadu sweeping junk — primary focal art */}
          <div className="relative mx-auto">
            <img
              src={cleanupLoader}
              alt=""
              className="block h-44 w-44 object-contain object-center sm:h-48 sm:w-48"
              draggable={false}
              aria-hidden="true"
            />
          </div>

          <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('common.optimizing')}
          </div>

          <h2
            id="cleanup-loader-title"
            className="mt-2 text-sm font-semibold tracking-tight text-foreground sm:text-base"
          >
            {t('cleanup.status.cleaningTitle')}
          </h2>

          <div
            id="cleanup-loader-desc"
            className="mt-1.5 w-full space-y-0.5"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm font-medium tabular-nums text-foreground">
              {Math.round(clamped)}%
              <span className="sr-only"> {t('cleanup.status.cleaningTitle')}</span>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{liveMessage}</p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{itemLine}</p>
          </div>

          {bytesFreedSoFar > 0 ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-success/25 bg-success/10 px-2.5 py-1.5 backdrop-blur-sm">
              <HardDrive className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <div className="text-left">
                <p className="text-[9px] font-medium uppercase tracking-wide text-success/80">
                  {t('cleanup.results.reclaimed')}
                </p>
                <p className="text-xs font-semibold tabular-nums text-success sm:text-sm">
                  {formatBytes(bytesFreedSoFar)}
                </p>
              </div>
            </div>
          ) : null}

          <div
            className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/40 backdrop-blur-sm"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('cleanup.status.cleaningTitle')}
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

          {categories.length > 0 ? (
            <ol
              className="mt-3 flex w-full flex-wrap justify-center gap-1"
              aria-label={t('cleanup.categories')}
            >
              {categories.map((category) => {
                const state = stepState(category.id, categoryId, categories, clamped)
                const visual = getCategoryVisual(category.id)
                const Icon = visual.icon

                return (
                  <li
                    key={category.id}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm transition-all duration-300 sm:text-xs',
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
                    <span>{t(cleanupCategoryLabelKey(category.id))}</span>
                  </li>
                )
              })}
            </ol>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            className="mt-4 h-8 gap-1.5 rounded-lg bg-card/60 px-3.5 text-xs backdrop-blur-sm"
            onClick={onCancel}
            disabled={cancelPending}
          >
            <Square className="h-3 w-3" aria-hidden="true" />
            {t('common.pause')}
          </Button>
        </div>
      </div>
    </div>
  )
}
