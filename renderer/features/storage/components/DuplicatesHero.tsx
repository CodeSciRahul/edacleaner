import { Check, Copy, FileStack, HardDrive, Loader2, RefreshCw, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import { useTranslation } from '@/i18n/useTranslation'
import { FeatureLockButton } from '@/features/entitlements/components/FeatureLockButton'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
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
  const navigate = useNavigate()
  const locked = !accessAllowed

  let headline: string
  let subtext: string

  if (locked) {
    headline = t('storage.duplicates.hero.lockedTitle')
    subtext = t('storage.duplicates.hero.lockedMsg')
  } else if (isLoading) {
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

  const groupsValue = locked ? '—' : isLoading ? '…' : String(groupCount)
  const wasteValue = locked
    ? '—'
    : isLoading
      ? '…'
      : groupCount > 0
        ? formatBytes(wasteBytes)
        : '—'
  const selectedValue = locked ? '—' : isLoading ? '…' : String(selectedCount)

  let tip: string
  if (locked) {
    tip = t('storage.duplicates.hero.lockedMsg')
  } else if (isLoading) {
    tip = t('storage.duplicates.hero.tipScanning')
  } else if (groupCount === 0) {
    tip = t('storage.duplicates.hero.tipEmpty')
  } else if (selectedCount > 0) {
    tip = t('storage.duplicates.hero.tipSelected', { count: selectedCount })
  } else {
    tip = t('storage.duplicates.hero.tipReady')
  }

  return (
    <section
      aria-label={t('storage.duplicates.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        locked ? 'border-primary/20' : 'border-border'
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

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-600 backdrop-blur-sm dark:text-violet-400">
              {isLoading && !locked ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              {isLoading && !locked
                ? t('storage.duplicates.hero.badgeScanning')
                : t('storage.duplicates.hero.badge')}
            </div>
            {locked ? <PremiumBadge plan="pro" size="md" /> : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={t('storage.duplicates.hero.statGroups')} value={groupsValue} />
            <StatPill label={t('storage.duplicates.hero.statWaste')} value={wasteValue} />
            <StatPill label={t('storage.duplicates.hero.statSelected')} value={selectedValue} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
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

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <JumpChip
              icon={HardDrive}
              label={t('storage.subnav.overview')}
              onClick={() => navigate('/storage')}
            />
            <JumpChip
              icon={FileStack}
              label={t('storage.subnav.largeFiles')}
              onClick={() => navigate('/storage/large-files')}
            />
          </div>

          <p className="text-xs text-muted-foreground">{tip}</p>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function JumpChip({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof HardDrive
  label: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/55 px-2.5 py-1',
        'text-[11px] font-medium text-muted-foreground backdrop-blur-sm',
        'transition-colors hover:border-primary/25 hover:bg-background/80 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
      {label}
    </button>
  )
}
