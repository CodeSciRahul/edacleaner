import { Copy, FileStack, HardDrive, Loader2, PieChart, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import { FeatureLockButton } from '@/features/entitlements/components/FeatureLockButton'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import type { DriveTotals } from '@/features/storage/lib/storage-health'
import storageHeroBgDark from '@/assets/storage/storage-hero-bg-dark.png'
import storageHeroBgLight from '@/assets/storage/storage-hero-bg-light.png'

interface StorageHeroProps {
  isAnalyzing: boolean
  analyzeDisabled: boolean
  storageAllowed: boolean
  hasUsage: boolean
  storageTotals?: DriveTotals
  largeFileCount?: number
  largeTotalBytes?: number
  duplicateGroupCount?: number
  duplicateWasteBytes?: number
  onAnalyze: () => void
}

export function StorageHero({
  isAnalyzing,
  analyzeDisabled,
  storageAllowed,
  hasUsage,
  storageTotals,
  largeFileCount = 0,
  largeTotalBytes = 0,
  duplicateGroupCount = 0,
  duplicateWasteBytes = 0,
  onAnalyze
}: StorageHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const hasStorageData = Boolean(storageTotals && storageTotals.totalBytes > 0)

  let headline: string
  let subtext: string

  if (isAnalyzing) {
    headline = t('storage.hero.analyzingHeadline')
    subtext = t('storage.hero.analyzingSub')
  } else if (hasStorageData && storageTotals) {
    headline = t('storage.hero.readyHeadline', {
      used: formatBytes(storageTotals.usedBytes),
      total: formatBytes(storageTotals.totalBytes),
      percent: storageTotals.usedPercent
    })
    subtext = hasUsage
      ? t('storage.hero.readySub')
      : t('storage.hero.readySubNoAnalysis')
  } else {
    headline = t('storage.hero.idleHeadline')
    subtext = t('storage.hero.idleSub')
  }

  const freeValue = hasStorageData && storageTotals
    ? formatBytes(storageTotals.freeBytes)
    : isAnalyzing
      ? '…'
      : '—'
  const usedValue = hasStorageData && storageTotals
    ? `${storageTotals.usedPercent}%`
    : isAnalyzing
      ? '…'
      : '—'
  const drivesValue = hasStorageData && storageTotals
    ? String(storageTotals.driveCount)
    : isAnalyzing
      ? '…'
      : '—'

  const showInsightPills = hasStorageData && (hasUsage || largeFileCount > 0 || duplicateGroupCount > 0)

  let tip: string
  if (isAnalyzing) {
    tip = t('storage.hero.tipAnalyzing')
  } else if (hasStorageData && hasUsage) {
    tip = t('storage.hero.tipReady', {
      large: formatBytes(largeTotalBytes),
      dupes: formatBytes(duplicateWasteBytes)
    })
  } else if (hasStorageData) {
    tip = t('storage.hero.tipDrivesOnly')
  } else {
    tip = t('storage.hero.tipIdle')
  }

  return (
    <section
      aria-label={t('storage.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        'border-border'
      )}
    >
      <img
        src={storageHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={storageHeroBgDark}
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
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
              {isAnalyzing ? (
                <PieChart className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              )}
              {isAnalyzing ? t('storage.analyzing.badge') : t('storage.hero.badge')}
            </div>
            {!storageAllowed ? <PremiumBadge plan="pro" size="md" /> : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {showInsightPills ? (
              <>
                <StatPill label={t('storage.hero.statFree')} value={freeValue} />
                <StatPill
                  label={t('storage.hero.statLarge')}
                  value={
                    isAnalyzing ? '…' : largeFileCount > 0 ? formatBytes(largeTotalBytes) : '—'
                  }
                />
                <StatPill
                  label={t('storage.hero.statDuplicates')}
                  value={
                    isAnalyzing
                      ? '…'
                      : duplicateGroupCount > 0
                        ? formatBytes(duplicateWasteBytes)
                        : '—'
                  }
                />
              </>
            ) : (
              <>
                <StatPill label={t('storage.hero.statFree')} value={freeValue} />
                <StatPill label={t('storage.hero.statUsed')} value={usedValue} />
                <StatPill label={t('storage.hero.statDrives')} value={drivesValue} />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <FeatureLockButton
              feature="storage_overview"
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              forceDisabled={analyzeDisabled}
              onClick={onAnalyze}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <HardDrive className="h-4 w-4" aria-hidden="true" />
              )}
              {isAnalyzing ? t('storage.analyzing') : t('storage.analyze')}
            </FeatureLockButton>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <JumpChip
              icon={FileStack}
              label={t('storage.subnav.largeFiles')}
              onClick={() => navigate('/storage/large-files')}
            />
            <JumpChip
              icon={Copy}
              label={t('storage.subnav.duplicates')}
              onClick={() => navigate('/storage/duplicates')}
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
