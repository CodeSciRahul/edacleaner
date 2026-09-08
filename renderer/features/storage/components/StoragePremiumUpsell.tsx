import type { FeatureId } from '@shared/entitlements'
import { Button } from '@/components/ui/Button'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import storageUpgradeUnlockGif from '@/assets/storage/storage-upgrade-unlock.gif'
import storageUpsellIllustration from '@/assets/storage/storage-upsell-illustration.png'

type StorageUpsellVariant = 'overview' | 'largeFiles' | 'duplicates'

interface StoragePremiumUpsellProps {
  feature?: FeatureId
  variant?: StorageUpsellVariant
  className?: string
}

const TITLE_KEY: Record<StorageUpsellVariant, string> = {
  overview: 'storage.upsell.title',
  largeFiles: 'storage.upsell.largeFiles.title',
  duplicates: 'storage.upsell.duplicates.title'
}

const FEATURE_FOR_VARIANT: Record<StorageUpsellVariant, FeatureId> = {
  overview: 'storage_overview',
  largeFiles: 'large_files',
  duplicates: 'duplicates'
}

/**
 * Polished Pro upsell card for locked Storage surfaces.
 * Hierarchy: animation → benefit copy → Upgrade CTA.
 */
export function StoragePremiumUpsell({
  feature,
  variant = 'overview',
  className
}: StoragePremiumUpsellProps): React.ReactElement {
  const { t } = useTranslation()
  const featureId = feature ?? FEATURE_FOR_VARIANT[variant]
  const { requestUpgrade, requiredPlan } = useFeatureAccess(featureId)

  return (
    <section
      aria-label={t(TITLE_KEY[variant])}
      className={cn(
        'overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-card',
        'animate-in fade-in-0 duration-300',
        className
      )}
    >
      <div className="flex flex-col items-center px-5 py-6 text-center sm:px-8 sm:py-8">
        <div className="mb-2 inline-flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {t('storage.upsell.eyebrow')}
          </p>
          <PremiumBadge plan={requiredPlan} />
        </div>

        <div
          className={cn(
            'relative mx-auto w-full max-w-[560px] overflow-hidden rounded-xl',
            'border border-border/70 bg-muted/30',
            'aspect-video'
          )}
        >
          <img
            src={storageUpgradeUnlockGif}
            alt=""
            width={800}
            height={450}
            className="absolute inset-0 h-full w-full object-contain object-center"
            draggable={false}
            decoding="async"
            onError={(event) => {
              const img = event.currentTarget
              if (img.dataset.fallback === '1') return
              img.dataset.fallback = '1'
              img.src = storageUpsellIllustration
            }}
          />
        </div>

        <h2 className="mt-5 max-w-lg text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {t(TITLE_KEY[variant])}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('storage.upsell.description')}
        </p>

        <Button
          type="button"
          size="default"
          className="mt-5 h-10 min-w-[160px] rounded-lg px-5 text-[13px]"
          onClick={requestUpgrade}
        >
          {t('storage.upsell.cta')}
        </Button>
      </div>
    </section>
  )
}
