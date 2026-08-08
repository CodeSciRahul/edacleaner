import type { SubscriptionPlanSlug } from '@shared/interfaces'

export type PlanSlug = Extract<SubscriptionPlanSlug, 'free' | 'pro' | 'premium'>

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
}

export type ChangePlanResult = CheckoutSessionPayload | PlanChangeStatusPayload

export type PlanActionKind = 'current' | 'upgrade' | 'downgrade'

export function isPlanSlug(value: string): value is PlanSlug {
  return value === 'free' || value === 'pro' || value === 'premium'
}

export function normalizePlanSlug(value: string | null | undefined): PlanSlug {
  const slug = (value ?? 'free').trim().toLowerCase()
  return isPlanSlug(slug) ? slug : 'free'
}

export function resolvePlanAction(
  current: PlanSlug,
  target: PlanSlug
): PlanActionKind {
  if (current === target) return 'current'
  return PLAN_RANK[target] > PLAN_RANK[current] ? 'upgrade' : 'downgrade'
}

export function formatPlanPrice(
  plan: PublicPlan,
  language: string
): { amount: string; interval: string | null } {
  if (plan.monthlyPrice <= 0 || plan.priceDisplay <= 0) {
    return { amount: '0', interval: null }
  }

  const currency = (plan.currency || 'usd').toUpperCase()
  try {
    const amount = new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      minimumFractionDigits: plan.priceDisplay % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(plan.priceDisplay)
    const interval =
      plan.billingInterval === 'year'
        ? 'year'
        : plan.billingInterval === 'month'
          ? 'month'
          : plan.billingInterval || 'month'
    return { amount, interval }
  } catch {
    return {
      amount: `${plan.priceDisplay} ${currency}`,
      interval: plan.billingInterval || 'month'
    }
  }
}

export function isCheckoutResult(
  result: ChangePlanResult
): result is CheckoutSessionPayload {
  return result.mode === 'checkout'
}
