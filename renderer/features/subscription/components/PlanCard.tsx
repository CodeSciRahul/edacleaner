import { Check, Crown, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  formatPlanPrice,
  normalizePlanSlug,
  resolvePlanAction,
  type PlanSlug,
  type PublicPlan
} from '@/features/subscription/lib/plans'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface PlanCardProps {
  plan: PublicPlan
  currentPlan: PlanSlug
  pendingPlan: string | null
  online: boolean
  busy: boolean
  disabled: boolean
  recommended: boolean
  onSelect: (plan: PublicPlan) => void
}

export function PlanCard({
  plan,
  currentPlan,
  pendingPlan,
  online,
  busy,
  disabled,
  recommended,
  onSelect
}: PlanCardProps): React.ReactElement {
  const { t, language } = useTranslation()
  const slug = normalizePlanSlug(plan.slug)
  const action = resolvePlanAction(currentPlan, slug)
  const isCurrent = action === 'current'
  const price = formatPlanPrice(plan, language)
  const pendingMatches =
    pendingPlan != null && normalizePlanSlug(pendingPlan) === slug

  const actionLabel = isCurrent
    ? t('plans.action.current')
    : action === 'upgrade'
      ? t('plans.action.upgrade')
      : t('plans.action.downgrade')

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm',
        'transition-all duration-200',
        isCurrent
          ? 'border-primary/40 bg-primary/[0.04] shadow-md shadow-primary/10'
          : 'border-border hover:border-primary/25'
      )}
    >
      {recommended ? (
        <Badge className="absolute right-3 top-3 rounded-md" variant="default">
          {t('plans.recommended')}
        </Badge>
      ) : null}

      <div className="mb-3 flex items-start gap-3 pr-16">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            slug === 'free'
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {slug === 'premium' ? (
            <Crown className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
            {isCurrent ? (
              <Badge variant="secondary" className="rounded-md">
                {t('plans.currentBadge')}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {price.amount === '0' ? t('plans.price.free') : price.amount}
            {price.interval ? (
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                / {t(price.interval === 'year' ? 'plans.interval.year' : 'plans.interval.month')}
              </span>
            ) : null}
          </p>
          {plan.isTrialAvailable && plan.trialDays > 0 && !isCurrent ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t('plans.trial', { days: plan.trialDays })}
            </p>
          ) : null}
          {pendingMatches ? (
            <p className="mt-0.5 text-[11px] text-primary">{t('plans.pendingHint')}</p>
          ) : null}
        </div>
      </div>

      <ul className="mb-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        className="h-9 w-full rounded-lg"
        variant={isCurrent ? 'secondary' : action === 'upgrade' ? 'default' : 'outline'}
        disabled={disabled || isCurrent || !online || busy}
        onClick={() => onSelect(plan)}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {t('plans.action.working')}
          </>
        ) : (
          actionLabel
        )}
      </Button>
    </div>
  )
}
