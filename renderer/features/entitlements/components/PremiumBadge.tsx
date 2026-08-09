import { Crown, Lock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import type { PlanSlug } from '@shared/entitlements'

interface PremiumBadgeProps {
  plan?: PlanSlug
  className?: string
  /** Compact pill for toolbars / cards. */
  size?: 'sm' | 'md'
}

export function PremiumBadge({
  plan = 'pro',
  className,
  size = 'sm'
}: PremiumBadgeProps): React.ReactElement {
  const { t } = useTranslation()
  const label =
    plan === 'premium' ? t('entitlements.badge.premium') : t('entitlements.badge.pro')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-semibold tracking-wide',
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10px]'
          : 'px-2 py-0.5 text-[11px]',
        plan === 'premium'
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-border bg-muted/80 text-muted-foreground',
        className
      )}
    >
      {plan === 'premium' ? (
        <Crown className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden="true" />
      ) : (
        <Lock className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden="true" />
      )}
      {label}
    </span>
  )
}
