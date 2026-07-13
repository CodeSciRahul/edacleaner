import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { CleanupCategorySummary } from '@shared/interfaces'
import { getCategoryVisual } from '@/features/cleanup/lib/category-meta'
import {
  cleanupCategoryDescKey,
  cleanupCategoryLabelKey
} from '@/features/cleanup/lib/category-i18n'
import { useTranslation } from '@/i18n/useTranslation'

interface CleanupCategoryCardProps {
  category: CleanupCategorySummary
  selected: boolean
  disabled?: boolean
  onToggle: () => void
}

export function CleanupCategoryCard({
  category,
  selected,
  disabled = false,
  onToggle
}: CleanupCategoryCardProps): React.ReactElement {
  const { t } = useTranslation()
  const visual = getCategoryVisual(category.id)
  const Icon = visual.icon
  const isDisabled = disabled || !category.available
  const sizeLabel =
    category.id === 'recycle' && category.estimatedBytes === 0 && category.available
      ? t('cleanup.card.ready')
      : formatBytes(category.estimatedBytes)

  const description = category.available
    ? t(cleanupCategoryDescKey(category.id))
    : category.unavailableReason ?? t('cleanup.card.nothing')

  const itemHint = category.available
    ? category.estimatedFiles > 0
      ? t('common.items', { count: category.estimatedFiles.toLocaleString() })
      : category.id === 'recycle'
        ? t('cleanup.card.readyEmpty')
        : t('cleanup.card.alreadyClear')
    : t('cleanup.card.allClear')

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      aria-pressed={selected}
      aria-disabled={isDisabled}
      className={cn(
        'group relative flex w-full flex-col gap-4 overflow-hidden rounded-2xl border p-5 text-left',
        'outline-none transition-all duration-200 ease-out',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-55',
        selected
          ? 'border-primary/35 bg-primary/[0.06] shadow-md shadow-primary/5'
          : 'border-border bg-card hover:border-border hover:bg-accent/40 hover:shadow-sm'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity duration-300',
          selected ? 'bg-primary/30 opacity-70' : 'bg-muted'
        )}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
            selected ? visual.iconWrapClass : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>

        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background'
          )}
          aria-hidden="true"
        >
          {selected ? (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
              <path d="M10.28 2.28a1 1 0 0 1 0 1.42l-5.5 5.5a1 1 0 0 1-1.42 0l-2.5-2.5a1 1 0 1 1 1.42-1.42L4.5 7.08l4.79-4.8a1 1 0 0 1 1.42 0z" />
            </svg>
          ) : null}
        </div>
      </div>

      <div className="relative min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {t(cleanupCategoryLabelKey(category.id))}
          </p>
          <Badge variant={category.risk === 'safe' ? 'secondary' : 'outline'}>
            {category.risk === 'safe' ? t('cleanup.risk.safe') : t('cleanup.risk.review')}
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="relative mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-3">
        <div>
          <p
            className={cn(
              'text-base font-semibold tabular-nums tracking-tight',
              selected ? 'text-primary' : 'text-foreground'
            )}
          >
            {sizeLabel}
          </p>
          <p className="text-xs text-muted-foreground">{itemHint}</p>
        </div>
      </div>
    </button>
  )
}
