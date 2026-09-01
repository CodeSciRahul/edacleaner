import { HardDrive, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { TranslationKey } from '@/i18n/locales/en'
import { useTranslation } from '@/i18n/useTranslation'
import storageLoader from '@/assets/storage/storage-loader.webp'
import loaderModalBgDark from '@/assets/storage/loader-modal-bg-dark.png'
import loaderModalBgLight from '@/assets/storage/loader-modal-bg-light.png'

export type StorageAnalyzeStepId = 'drives' | 'usage' | 'largeFiles' | 'duplicates'

interface StorageAnalyzeStep {
  id: StorageAnalyzeStepId
  labelKey: TranslationKey
}

const ANALYZE_STEPS: StorageAnalyzeStep[] = [
  { id: 'drives', labelKey: 'storage.analyzing.step.drives' },
  { id: 'usage', labelKey: 'storage.analyzing.step.usage' },
  { id: 'largeFiles', labelKey: 'storage.analyzing.step.largeFiles' },
  { id: 'duplicates', labelKey: 'storage.analyzing.step.duplicates' }
]

interface StorageLoaderModalProps {
  open: boolean
  message?: string
  percent?: number
  currentItem?: string
  stepId?: StorageAnalyzeStepId
  onCancel?: () => void
  cancelPending?: boolean
}

function stepState(
  id: StorageAnalyzeStepId,
  activeId: StorageAnalyzeStepId | undefined,
  percent: number
): 'done' | 'active' | 'pending' {
  if (percent >= 100) return 'done'
  if (!activeId) return 'pending'
  const activeIndex = ANALYZE_STEPS.findIndex((s) => s.id === activeId)
  const index = ANALYZE_STEPS.findIndex((s) => s.id === id)
  if (index < 0) return 'pending'
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'pending'
}

function shortPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 3) return path
  return `…/${parts.slice(-3).join('/')}`
}

export function StorageLoaderModal({
  open,
  message,
  percent = 0,
  currentItem,
  stepId,
  onCancel,
  cancelPending = false
}: StorageLoaderModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, percent))
  const liveMessage = message ?? t('storage.analyzing.message')
  const itemLine = currentItem
    ? t('storage.analyzing.working', { path: shortPath(currentItem) })
    : t('storage.analyzing.scanning')

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      {/* Light scrim — storage UI stays visible behind */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-loader-title"
        aria-describedby="storage-loader-desc"
        className="relative z-[1] flex w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl shadow-black/15 animate-in fade-in-0 zoom-in-95 duration-300"
      >
        {/* Full-bleed storage brand art — `.light` / `.dark` on <html> */}
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
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/35 via-card/60 to-card/80 dark:from-card/30 dark:via-card/55 dark:to-card/75"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--card)_/_0.48)_0%,transparent_74%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full flex-col items-center px-4 pb-5 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
          {/* Transparent WebP loader — HDD scan + pie chart animation */}
          <div className="relative mx-auto">
            <img
              src={storageLoader}
              alt=""
              className="block h-44 w-44 object-contain object-center sm:h-48 sm:w-48"
              draggable={false}
              aria-hidden="true"
            />
          </div>

          <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
            <HardDrive className="h-3 w-3" aria-hidden="true" />
            {t('storage.analyzing.badge')}
          </div>

          <h2
            id="storage-loader-title"
            className="mt-2 text-sm font-semibold tracking-tight text-foreground sm:text-base"
          >
            {t('storage.analyzing.title')}
          </h2>

          <div
            id="storage-loader-desc"
            className="mt-1.5 w-full space-y-0.5"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm font-medium tabular-nums text-foreground">
              {Math.round(clamped)}%
              <span className="sr-only"> {t('storage.analyzing.title')}</span>
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
            aria-label={t('storage.analyzing.title')}
          >
            <div
              className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary via-chart-disk to-chart-ram transition-[width] duration-500 ease-out"
              style={{ width: `${clamped}%` }}
            >
              <div
                className="absolute inset-0 -translate-x-full animate-[cleanup-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                aria-hidden="true"
              />
            </div>
          </div>

          <ol
            className="mt-3 flex w-full flex-wrap justify-center gap-1"
            aria-label={t('storage.analyzing.steps')}
          >
            {ANALYZE_STEPS.map((step) => {
              const state = stepState(step.id, stepId, clamped)
              return (
                <li
                  key={step.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm transition-all duration-300 sm:text-xs',
                    state === 'active' &&
                      'border-primary/40 bg-primary/20 text-primary shadow-sm shadow-primary/10',
                    state === 'done' && 'border-success/35 bg-success/15 text-success',
                    state === 'pending' && 'border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  {state === 'active' ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <HardDrive className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  )}
                  <span>{t(step.labelKey)}</span>
                </li>
              )
            })}
          </ol>

          {onCancel ? (
            <button
              type="button"
              className="mt-4 h-8 rounded-lg border border-border bg-card/60 px-3.5 text-xs backdrop-blur-sm transition-colors hover:bg-muted/60 disabled:opacity-50"
              onClick={onCancel}
              disabled={cancelPending}
            >
              {t('common.cancel')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
