import { HardDrive, Loader2, PieChart, ShieldCheck } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import { FeatureLockButton } from '@/features/entitlements/components/FeatureLockButton'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import type { DriveTotals } from '@/features/storage/lib/storage-health'
import storageHeroBgDark from '@/assets/storage/storage-hero-bg-dark.png'
import storageHeroBgLight from '@/assets/storage/storage-hero-bg-light.png'

interface StorageHeroProps {
  isAnalyzing: boolean
  analyzeDisabled: boolean
  storageAllowed: boolean
  hasUsage: boolean
  storageTotals?: DriveTotals
  onAnalyze: () => void
}

export function StorageHero({
  isAnalyzing,
  analyzeDisabled,
  storageAllowed,
  hasUsage,
  storageTotals,
  onAnalyze
}: StorageHeroProps): React.ReactElement {
  const { t } = useTranslation()

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

  return (
    <section
      aria-label={t('storage.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
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

      <div className="relative z-10 flex max-w-2xl flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
          {isAnalyzing ? (
            <PieChart className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          )}
          {isAnalyzing ? t('storage.analyzing.badge') : t('storage.hero.badge')}
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {headline}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {!storageAllowed ? <PremiumBadge plan="pro" /> : null}
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
      </div>
    </section>
  )
}
