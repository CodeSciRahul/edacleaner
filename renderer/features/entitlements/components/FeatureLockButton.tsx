import * as React from 'react'
import { Lock } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { FeatureId } from '@shared/entitlements'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'

export interface FeatureLockButtonProps extends ButtonProps {
  feature: FeatureId
  /** When true, still show lock chrome but keep native disabled (e.g. busy). */
  forceDisabled?: boolean
}

/**
 * Primary action button that stays clickable when locked so users can
 * discover the upgrade path instead of a dead disabled control.
 */
export const FeatureLockButton = React.forwardRef<HTMLButtonElement, FeatureLockButtonProps>(
  (
    {
      feature,
      forceDisabled,
      disabled,
      onClick,
      className,
      children,
      title,
      ...props
    },
    ref
  ) => {
    const { allowed, requiredPlan, guard, requestUpgrade } = useFeatureAccess(feature)
    const locked = !allowed
    const isDisabled = allowed ? Boolean(forceDisabled || disabled) : false

    return (
      <Button
        ref={ref}
        type="button"
        disabled={isDisabled}
        title={
          locked
            ? title ?? `Requires ${requiredPlan === 'premium' ? 'Premium' : 'Pro'}`
            : title
        }
        className={cn(
          locked && !isDisabled && 'relative opacity-90 ring-1 ring-primary/20',
          className
        )}
        onClick={(event) => {
          if (locked) {
            event.preventDefault()
            requestUpgrade()
            return
          }
          if (!guard()) return
          onClick?.(event)
        }}
        {...props}
      >
        {locked ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        {children}
        {locked ? <PremiumBadge plan={requiredPlan} className="ml-0.5" /> : null}
      </Button>
    )
  }
)
FeatureLockButton.displayName = 'FeatureLockButton'
