import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { FeatureId } from '@shared/entitlements'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { useTranslation } from '@/i18n/useTranslation'

interface FeatureTeaserBlockProps {
  feature: FeatureId
  /** Extra rows rendered under a blur + upgrade veil. */
  children: React.ReactNode
  className?: string
  /** Max height of the blurred peek area. */
  maxHeightClassName?: string
}

/**
 * Blurred “more below” peek for locked plan features — keeps discovery without
 * exposing the full interactive list.
 */
export function FeatureTeaserBlock({
  feature,
  children,
  className,
  maxHeightClassName = 'max-h-44'
}: FeatureTeaserBlockProps): React.ReactElement {
  const { t } = useTranslation()
  const { requiredPlan, requestUpgrade } = useFeatureAccess(feature)

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'pointer-events-none select-none overflow-hidden opacity-50 blur-[3px]',
          maxHeightClassName
        )}
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-b from-card/10 via-card/80 to-card px-4 text-center">
        <PremiumBadge plan={requiredPlan} size="md" />
        <p className="text-sm font-semibold text-foreground">
          {t('entitlements.teaser.title')}
        </p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {t('entitlements.teaser.body', {
            plan:
              requiredPlan === 'premium'
                ? t('entitlements.badge.premium')
                : t('entitlements.badge.pro')
          })}
        </p>
        <Button type="button" size="sm" className="mt-0.5 h-9 gap-1.5" onClick={requestUpgrade}>
          {t('entitlements.prompt.upgrade')}
        </Button>
      </div>
    </div>
  )
}
