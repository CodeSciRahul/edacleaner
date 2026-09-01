import { getEffectivePlan } from '@shared/entitlements'
import type { AuthSessionSnapshot } from '@shared/interfaces'

export function sessionHasPaidPlan(session: AuthSessionSnapshot | null): boolean {
  if (!session?.authenticated || !session.subscription) return false
  if (session.subscription.hasActiveAccess === false) return false
  const plan = getEffectivePlan(
    session.subscription.currentPlan,
    session.subscription.hasActiveAccess
  )
  return plan === 'pro' || plan === 'premium'
}
