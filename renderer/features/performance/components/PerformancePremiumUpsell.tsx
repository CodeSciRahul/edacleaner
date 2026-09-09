import type { FeatureId } from '@shared/entitlements'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { usePlanCheckout } from '@/features/subscription/hooks/usePlanCheckout'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import performanceUpgradeUnlockGif from '@/assets/performance/performance-upgrade-unlock.gif'
import performanceUpsellIllustration from '@/assets/performance/performance-upsell-illustration.png'

interface PerformancePremiumUpsellProps {
  feature?: FeatureId
  className?: string
}

/**
 * Polished Premium upsell card for locked Performance surfaces.
 * Hierarchy: animation → benefit copy → Upgrade CTA (opens Premium checkout).
 */
export function PerformancePremiumUpsell({
  feature = 'performance_boost',
  className
}: PerformancePremiumUpsellProps): React.ReactElement {
  const { t } = useTranslation()
  const { requiredPlan } = useFeatureAccess(feature)
  const { startCheckout, checkingOut } = usePlanCheckout()

  return (
    <section
      aria-label={t('performance.upsell.title')}
      className={cn(
        'overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-card',
        'animate-in fade-in-0 duration-300',
        className
      )}
    >
      <div className="flex flex-col items-center px-5 py-6 text-center sm:px-8 sm:py-8">
        <div className="mb-2 inline-flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {t('performance.upsell.eyebrow')}
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
            src={performanceUpgradeUnlockGif}
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
              img.src = performanceUpsellIllustration
            }}
          />
        </div>

        <h2 className="mt-5 max-w-lg text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {t('performance.upsell.title')}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('performance.upsell.description')}
        </p>

        <Button
          type="button"
          size="default"
          className="mt-5 h-10 min-w-[160px] gap-2 rounded-lg px-5 text-[13px]"
          disabled={checkingOut}
          onClick={() =>
            void startCheckout(requiredPlan === 'free' ? 'premium' : requiredPlan)
          }
        >
          {checkingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t('performance.upsell.cta')}
        </Button>
      </div>
    </section>
  )
}
