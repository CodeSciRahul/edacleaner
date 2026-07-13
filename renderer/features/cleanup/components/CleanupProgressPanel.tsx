import { HardDrive, Loader2, Sparkles } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import type { CleanupCategoryId } from '@shared/interfaces'
import { getCategoryVisual } from '@/features/cleanup/lib/category-meta'
import { cleanupCategoryLabelKey } from '@/features/cleanup/lib/category-i18n'
import { useTranslation } from '@/i18n/useTranslation'

interface CleanupCategoryStep {
  id: CleanupCategoryId
  label: string
}

interface CleanupProgressPanelProps {
  message: string
  percent: number
  currentItem?: string
  bytesFreedSoFar?: number
  categoryId?: CleanupCategoryId
  categories?: CleanupCategoryStep[]
  mode: 'scan' | 'clean'
}

function stepState(
  stepId: CleanupCategoryId,
  activeId: CleanupCategoryId | undefined,
  categories: CleanupCategoryStep[],
  percent: number
): 'done' | 'active' | 'pending' {
  if (!activeId) {
    return percent >= 100 ? 'done' : 'pending'
  }

  const activeIndex = categories.findIndex((c) => c.id === activeId)
  const stepIndex = categories.findIndex((c) => c.id === stepId)

  if (stepIndex < 0) return 'pending'
  if (percent >= 100) return 'done'
  if (stepIndex < activeIndex) return 'done'
  if (stepIndex === activeIndex) return 'active'
  return 'pending'
}

export function CleanupProgressPanel({
  message,
  percent,
  currentItem,
  bytesFreedSoFar,
  categoryId,
  categories = [],
  mode
}: CleanupProgressPanelProps): React.ReactElement {
  const { t } = useTranslation()
  const clamped = Math.min(100, Math.max(0, percent))
  const isClean = mode === 'clean'
  const freed = bytesFreedSoFar ?? 0

  if (!isClean) {
    return (
      <section
        aria-label={t('cleanup.progress.scan')}
        aria-live="polite"
        className="overflow-hidden rounded-xl border border-primary/25 bg-card shadow-card animate-in fade-in-0 slide-in-from-top-1 duration-300"
      >
        <div className="border-b border-border/60 bg-primary/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">{message}</p>
            <span className="ml-auto text-sm font-semibold tabular-nums text-primary">
              {clamped}%
            </span>
          </div>
        </div>
        <div className="px-5 py-4">
          <ProgressTrack percent={clamped} />
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {currentItem ?? t('cleanup.progress.scan')}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label={t('cleanup.progress.clean')}
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.08] shadow-card animate-in fade-in-0 zoom-in-95 duration-300"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-chart-ram/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <div
            className="absolute inset-0 scale-110 rounded-full bg-primary/10 blur-xl"
            aria-hidden="true"
          />
          <CircularProgress
            value={clamped}
            size={112}
            strokeWidth={9}
            color="cpu"
            label="done"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {t('cleanup.status.cleaningTitle')}
              </div>
              <p className="text-base font-semibold text-foreground sm:text-lg">{message}</p>
              <p className="truncate text-xs text-muted-foreground">
                {currentItem
                  ? t('cleanup.progress.working', { path: shortPath(currentItem) })
                  : t('cleanup.progress.clean')}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2">
              <HardDrive className="h-4 w-4 text-success" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-success/80">
                  {t('cleanup.results.reclaimed')}
                </p>
                <p className="text-sm font-semibold tabular-nums text-success">
                  {formatBytes(freed)}
                </p>
              </div>
            </div>
          </div>

          <ProgressTrack percent={clamped} animated />

          {categories.length > 0 ? (
            <ol className="flex flex-wrap gap-2" aria-label={t('cleanup.categories')}>
              {categories.map((category) => {
                const state = stepState(category.id, categoryId, categories, clamped)
                const visual = getCategoryVisual(category.id)
                const Icon = visual.icon

                return (
                  <li
                    key={category.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300',
                      state === 'active' &&
                        'border-primary/40 bg-primary/15 text-primary shadow-sm shadow-primary/10',
                      state === 'done' &&
                        'border-success/30 bg-success/10 text-success',
                      state === 'pending' &&
                        'border-border bg-muted/40 text-muted-foreground'
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
        </div>
      </div>
    </section>
  )
}

function ProgressTrack({
  percent,
  animated = false
}: {
  percent: number
  animated?: boolean
}): React.ReactElement {
  return (
    <div
      className="relative h-3 overflow-hidden rounded-full bg-muted/80"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary via-chart-ram to-chart-disk transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      >
        {animated ? (
          <div
            className="absolute inset-0 -translate-x-full animate-[cleanup-shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  )
}

function shortPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 3) return path
  return `…/${parts.slice(-3).join('/')}`
}
