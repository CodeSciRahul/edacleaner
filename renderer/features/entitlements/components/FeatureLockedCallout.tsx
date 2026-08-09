import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { FeatureId } from '@shared/entitlements'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { useTranslation } from '@/i18n/useTranslation'

interface FeatureLockedCalloutProps {
  feature: FeatureId
  className?: string
  /** Compact inline banner vs padded section callout. */
  compact?: boolean
}

/** Non-blocking callout shown on premium screens while keeping page chrome visible. */
export function FeatureLockedCallout({
  feature,
  className,
  compact = false
}: FeatureLockedCalloutProps): React.ReactElement | null {
  const { t } = useTranslation()
  const { allowed, requiredPlan, requestUpgrade } = useFeatureAccess(feature)

  if (allowed) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.06]',
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        className
      )}
      role="status"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Lock className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {t('entitlements.callout.title', {
              plan: requiredPlan === 'premium' ? t('entitlements.badge.premium') : t('entitlements.badge.pro')
            })}
          </p>
          <PremiumBadge plan={requiredPlan} />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {t('entitlements.callout.body')}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-8 shrink-0 rounded-lg px-3 text-[12px]"
        onClick={requestUpgrade}
      >
        {t('entitlements.prompt.upgrade')}
      </Button>
    </div>
  )
}
