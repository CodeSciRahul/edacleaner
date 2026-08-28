import { Check, Copy, Loader2, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import { useTranslation } from '@/i18n/useTranslation'
import { FeatureLockButton } from '@/features/entitlements/components/FeatureLockButton'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import duplicatesHeroBgDark from '@/assets/storage/duplicates-hero-bg-dark.png'
import duplicatesHeroBgLight from '@/assets/storage/duplicates-hero-bg-light.png'

interface DuplicatesHeroProps {
  isLoading: boolean
  isFetching: boolean
  accessAllowed: boolean
  groupCount: number
  wasteBytes: number
  selectedCount: number
  selectDisabled: boolean
  clearDisabled: boolean
  deleteDisabled: boolean
  onRefresh: () => void
  onSelectDuplicates: () => void
  onClear: () => void
  onDelete: () => void
}

export function DuplicatesHero({
  isLoading,
  isFetching,
  accessAllowed,
  groupCount,
  wasteBytes,
  selectedCount,
  selectDisabled,
  clearDisabled,
  deleteDisabled,
  onRefresh,
  onSelectDuplicates,
  onClear,
  onDelete
}: DuplicatesHeroProps): React.ReactElement {
  const { t } = useTranslation()

  let headline: string
  let subtext: string

  if (isLoading) {
    headline = t('storage.duplicates.hero.scanningHeadline')
    subtext = t('storage.duplicates.hero.scanningSub')
  } else if (groupCount === 0) {
    headline = t('storage.duplicates.hero.emptyHeadline')
    subtext = t('storage.duplicates.hero.emptySub')
  } else if (selectedCount > 0) {
    headline = t('storage.duplicates.hero.selectedHeadline', { count: selectedCount })
    subtext = t('storage.duplicates.hero.selectedSub')
  } else {
    headline = t('storage.duplicates.hero.readyHeadline', {
      count: groupCount,
      bytes: formatBytes(wasteBytes)
    })
    subtext = t('storage.duplicates.hero.readySub')
  }

  return (
    <section
      aria-label={t('storage.duplicates.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        'animate-in fade-in-0 duration-300',
        'border-border'
      )}
    >
      <img
        src={duplicatesHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={duplicatesHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-w-2xl flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-600 backdrop-blur-sm dark:text-violet-400">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" aria-hidden="true" />
          )}
          {isLoading ? t('storage.duplicates.hero.badgeScanning') : t('storage.duplicates.hero.badge')}
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {headline}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {!accessAllowed ? <PremiumBadge plan="pro" /> : null}
          <FeatureLockButton
            feature="duplicates"
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
            forceDisabled={isFetching}
            onClick={onRefresh}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
            {t('common.refresh')}
          </FeatureLockButton>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
            disabled={selectDisabled}
            onClick={onSelectDuplicates}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('storage.duplicates.hero.selectDuplicates')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
            disabled={clearDisabled}
            onClick={onClear}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t('common.clear')}
          </Button>
          <FeatureLockButton
            feature="duplicates"
            size="sm"
            variant="destructive"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            forceDisabled={deleteDisabled}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('duplicates.delete', { count: selectedCount })}
          </FeatureLockButton>
        </div>
      </div>
    </section>
  )
}
