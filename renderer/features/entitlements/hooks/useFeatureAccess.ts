import { useCallback, useMemo } from 'react'
import {
  canAccessFeature,
  PLAN_DISPLAY_NAMES,
  requiredPlanFor,
  type FeatureId,
  type PlanSlug
} from '@shared/entitlements'
import { useEntitlementsStore } from '@/store/entitlements-store'

export interface FeatureAccess {
  feature: FeatureId
  allowed: boolean
  plan: PlanSlug
  requiredPlan: PlanSlug
  requiredPlanLabel: string
  /** Returns true if allowed; otherwise opens the upgrade prompt and returns false. */
  guard: () => boolean
  requestUpgrade: () => void
}

export function useFeatureAccess(feature: FeatureId): FeatureAccess {
  const plan = useEntitlementsStore((s) => s.plan)
  const hasActiveAccess = useEntitlementsStore((s) => s.hasActiveAccess)
  const openUpgradePrompt = useEntitlementsStore((s) => s.openUpgradePrompt)

  const requiredPlan = requiredPlanFor(feature)
  const allowed = useMemo(
    () => canAccessFeature(plan, feature, { hasActiveAccess }),
    [plan, feature, hasActiveAccess]
  )

  const requestUpgrade = useCallback(() => {
    openUpgradePrompt(feature)
  }, [feature, openUpgradePrompt])

  const guard = useCallback((): boolean => {
    if (allowed) return true
    openUpgradePrompt(feature)
    return false
  }, [allowed, feature, openUpgradePrompt])

  return {
    feature,
    allowed,
    plan,
    requiredPlan,
    requiredPlanLabel: PLAN_DISPLAY_NAMES[requiredPlan],
    guard,
    requestUpgrade
  }
}

export function useCanAccessFeature(feature: FeatureId): boolean {
  return useFeatureAccess(feature).allowed
}
