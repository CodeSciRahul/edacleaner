import type { SubscriptionPlanSlug } from '@shared/interfaces'

export type PlanSlug = Extract<SubscriptionPlanSlug, 'free' | 'pro' | 'premium'>
export type BillingInterval = 'month' | 'year'

export const PLAN_RANK: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  premium: 2
}

export interface PublicPlan {
  id: string
  name: string
  slug: string
  monthlyPrice: number
  currency: string
  billingInterval: string
  features: string[]
  isTrialAvailable: boolean
  trialDays: number
  priceDisplay: number
  compareAtPriceDisplay?: number | null
  discountPercent?: number
  savingsDisplay?: number | null
}

export interface CheckoutSessionPayload {
  mode: 'checkout'
  sessionId: string
  url: string | null
  publishableKey?: string
}

export interface PlanChangeStatusPayload {
  mode: 'immediate' | 'scheduled'
  currentPlan: string
  status: string
  cancelAtPeriodEnd?: boolean
  pendingPlan?: string | null
  trialStart?: string | null
  trialEnd?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  features?: string[]
  isPaid?: boolean
  hasActiveAccess?: boolean
  billingInterval?: string
}

export type ChangePlanResult = CheckoutSessionPayload | PlanChangeStatusPayload

export type PlanActionKind = 'current' | 'upgrade' | 'downgrade' | 'activate'

export function isPlanSlug(value: string): value is PlanSlug {
  return value === 'free' || value === 'pro' || value === 'premium'
}

export function normalizePlanSlug(value: string | null | undefined): PlanSlug {
  const slug = (value ?? 'free').trim().toLowerCase()
  return isPlanSlug(slug) ? slug : 'free'
}

export function normalizeBillingInterval(
  value: string | null | undefined
): BillingInterval {
  return value === 'year' ? 'year' : 'month'
}

export function resolvePlanAction(
  current: PlanSlug | null,
  target: PlanSlug,
  options?: {
    currentInterval?: BillingInterval | null
    targetInterval?: BillingInterval | null
  }
): PlanActionKind {
  if (current == null) {
    return target === 'free' ? 'activate' : 'upgrade'
  }
  if (current === target) {
    const currentInterval = options?.currentInterval ?? 'month'
    const targetInterval = options?.targetInterval ?? 'month'
    if (currentInterval === targetInterval) return 'current'
    // Same tier, switching interval — treat yearly as upgrade from monthly.
    if (targetInterval === 'year' && currentInterval === 'month') return 'upgrade'
    return 'downgrade'
  }
  return PLAN_RANK[target] > PLAN_RANK[current] ? 'upgrade' : 'downgrade'
}

export function formatPlanPrice(
  plan: PublicPlan,
  language: string
): { amount: string; interval: string | null; compareAt: string | null } {
  if (plan.monthlyPrice <= 0 || plan.priceDisplay <= 0) {
    return { amount: '0', interval: null, compareAt: null }
  }

  const currency = (plan.currency || 'usd').toUpperCase()
  const formatMoney = (value: number): string => {
    try {
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      }).format(value)
    } catch {
      return `${value} ${currency}`
    }
  }

  const interval =
    plan.billingInterval === 'year'
      ? 'year'
      : plan.billingInterval === 'month'
        ? 'month'
        : plan.billingInterval || 'month'

  const compareAt =
    typeof plan.compareAtPriceDisplay === 'number' &&
    plan.compareAtPriceDisplay > plan.priceDisplay
      ? formatMoney(plan.compareAtPriceDisplay)
      : null

  return {
    amount: formatMoney(plan.priceDisplay),
    interval,
    compareAt
  }
}

export function isCheckoutResult(
  result: ChangePlanResult
): result is CheckoutSessionPayload {
  return result.mode === 'checkout'
}

export function filterPlansByInterval(
  plans: PublicPlan[],
  interval: BillingInterval
): PublicPlan[] {
  return plans.filter((plan) => {
    const slug = normalizePlanSlug(plan.slug)
    if (slug === 'free') return plan.billingInterval === 'month' || !plan.billingInterval
    return normalizeBillingInterval(plan.billingInterval) === interval
  })
}
