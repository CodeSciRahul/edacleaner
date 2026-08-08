import { Check, Crown, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  formatPlanPrice,
  normalizeBillingInterval,
  normalizePlanSlug,
  resolvePlanAction,
  type BillingInterval,
  type PlanSlug,
  type PublicPlan
} from '@/features/subscription/lib/plans'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface PlanCardProps {
  plan: PublicPlan
  currentPlan: PlanSlug
  currentInterval: BillingInterval
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
  currentInterval,
  pendingPlan,
  online,
  busy,
  disabled,
  recommended,
  onSelect
}: PlanCardProps): React.ReactElement {
  const { t, language } = useTranslation()
  const slug = normalizePlanSlug(plan.slug)
  const targetInterval = normalizeBillingInterval(plan.billingInterval)
  const action = resolvePlanAction(currentPlan, slug, {
    currentInterval,
    targetInterval
  })
  const isCurrent = action === 'current'
  const isFree = slug === 'free' || plan.monthlyPrice <= 0
  const price = formatPlanPrice(plan, language)
  const pendingMatches =
    pendingPlan != null && normalizePlanSlug(pendingPlan) === slug
  const discountPercent = plan.discountPercent ?? 0
  const hasTrial = plan.isTrialAvailable && plan.trialDays > 0 && !isCurrent

  const savingsLabel =
    typeof plan.savingsDisplay === 'number' && plan.savingsDisplay > 0
      ? new Intl.NumberFormat(language, {
          style: 'currency',
          currency: (plan.currency || 'usd').toUpperCase(),
          minimumFractionDigits: plan.savingsDisplay % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2
        }).format(plan.savingsDisplay)
      : null

  const actionLabel = isCurrent
    ? t('plans.action.current')
    : action === 'upgrade'
      ? t('plans.action.upgrade')
      : t('plans.action.downgrade')

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border p-5',
        'transition-all duration-200',
        recommended && !isCurrent
          ? 'border-primary/45 bg-gradient-to-b from-primary/[0.10] via-card to-card shadow-md shadow-primary/10'
          : isCurrent
            ? 'border-primary/35 bg-primary/[0.04]'
            : 'border-border bg-card hover:border-primary/25 hover:bg-muted/10'
      )}
    >
      {/* Badge strip — reserved height so cards stay aligned */}
      <div className="mb-4 flex min-h-[26px] flex-wrap items-center gap-1.5">
        {recommended ? (
          <Badge className="rounded-md px-2 py-0.5 text-[10px]" variant="default">
            {t('plans.recommended')}
          </Badge>
        ) : null}
        {discountPercent > 0 ? (
          <Badge
            variant="secondary"
            className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
          >
            {t('plans.savePercent', { percent: discountPercent })}
          </Badge>
        ) : null}
        {isCurrent ? (
          <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px]">
            {t('plans.currentBadge')}
          </Badge>
        ) : null}
      </div>

      {/* Title row */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            isFree
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
          )}
        >
          {slug === 'premium' ? (
            <Crown className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {plan.name}
          </h3>
          {pendingMatches ? (
            <p className="mt-0.5 text-[11px] text-primary">{t('plans.pendingHint')}</p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isFree
                ? t('plans.price.forever')
                : targetInterval === 'year'
                  ? t('plans.billing.yearly')
                  : t('plans.billing.monthly')}
            </p>
          )}
        </div>
      </div>

      {/* Price block — fixed height for column alignment */}
      <div className="mb-5 min-h-[72px]">
        {isFree ? (
          <>
            <p className="text-2xl font-semibold tracking-tight text-foreground">$0</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('plans.price.forever')}</p>
          </>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {price.amount}
              </span>
              {price.interval ? (
                <span className="text-xs font-medium text-muted-foreground">
                  / {t(price.interval === 'year' ? 'plans.interval.year' : 'plans.interval.month')}
                </span>
              ) : null}
            </p>
            <div className="mt-1.5 min-h-[18px] text-[11px] leading-snug text-muted-foreground">
              {price.compareAt ? (
                <p>
                  <span className="line-through opacity-70">{price.compareAt}</span>
                  {savingsLabel ? (
                    <span className="ml-1.5 font-medium text-primary">
                      {t('plans.saveAmount', { amount: savingsLabel })}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="opacity-0">—</p>
              )}
            </div>
            <div className="mt-1 min-h-[16px] text-[11px] text-muted-foreground">
              {hasTrial ? t('plans.trial', { days: plan.trialDays }) : <span className="opacity-0">—</span>}
            </div>
          </>
        )}
      </div>

      <div className="mb-5 h-px w-full bg-border/80" />

      {/* Features grow so CTAs align at the bottom */}
      <ul className="mb-5 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs leading-snug text-foreground/90">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        className="mt-auto h-10 w-full rounded-xl text-[13px] font-semibold"
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
