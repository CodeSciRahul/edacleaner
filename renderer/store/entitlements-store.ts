import { create } from 'zustand'
import {
  getEffectivePlan,
  normalizePlanSlug,
  type FeatureId,
  type PlanSlug
} from '@shared/entitlements'
import type { CachedSubscription } from '@shared/interfaces'
import {
  computeExpiredGateEligible,
  readExpiredFromTrial,
  readExpiredGatePending,
  writeExpiredFromTrial,
  writeExpiredGatePending
} from '@/features/subscription/lib/expired-gate'

export interface PlanChangeSuccess {
  plan: PlanSlug
  kind: 'upgraded' | 'activated'
}

interface EntitlementsState {
  plan: PlanSlug
  hasActiveAccess: boolean
  /** Last known paid + active snapshot — used to detect demotion to Free. */
  wasPaidActive: boolean
  /** Raw subscription fields for expired-screen copy (not the effective Free plan). */
  subscriptionStatus: string | null
  isTrialing: boolean
  /** True when the lapse we are surfacing started from a trial window. */
  expiredFromTrial: boolean
  expiresAt: string | null
  currentPeriodStart: string | null
  trialStart: string | null
  expiredGateEligible: boolean
  expiredGateDismissed: boolean
  syncedAt: number | null
  upgradePromptFeature: FeatureId | null
  plansModalOpen: boolean
  planChangeSuccess: PlanChangeSuccess | null
  setFromSubscription: (subscription: CachedSubscription | null | undefined) => void
  openUpgradePrompt: (feature: FeatureId) => void
  closeUpgradePrompt: () => void
  openPlansModal: () => void
  closePlansModal: () => void
  /** Open plans after dismissing the upgrade prompt (Upgrade Now / Compare). */
  continueToPlans: () => void
  showPlanChangeSuccess: (success: PlanChangeSuccess) => void
  clearPlanChangeSuccess: () => void
  dismissExpiredGate: () => void
}

function isPaidSubscription(subscription: CachedSubscription | null | undefined): boolean {
  if (!subscription) return false
  if (subscription.isPaid) return true
  const plan = normalizePlanSlug(subscription.currentPlan)
  return plan === 'pro' || plan === 'premium'
}

export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  plan: 'free',
  hasActiveAccess: true,
  wasPaidActive: false,
  subscriptionStatus: null,
  isTrialing: false,
  expiredFromTrial: false,
  expiresAt: null,
  currentPeriodStart: null,
  trialStart: null,
  expiredGateEligible: false,
  expiredGateDismissed: false,
  syncedAt: null,
  upgradePromptFeature: null,
  plansModalOpen: false,
  planChangeSuccess: null,

  setFromSubscription: (subscription) => {
    const hasActiveAccess = subscription?.hasActiveAccess !== false
    const isPaid = isPaidSubscription(subscription)
    const prev = get()

    const status = (subscription?.status ?? '').toLowerCase()
    const isTrialingNow = Boolean(subscription?.isTrialing) || status === 'trialing'

    let pending = readExpiredGatePending()
    if (!hasActiveAccess) {
      pending = true
      writeExpiredGatePending(true)
    }
    if (prev.wasPaidActive && (!isPaid || !hasActiveAccess)) {
      pending = true
      writeExpiredGatePending(true)
    }

    let expiredFromTrial = prev.expiredFromTrial || readExpiredFromTrial()
    if (!hasActiveAccess && (isTrialingNow || status === 'incomplete_expired')) {
      expiredFromTrial = true
    }
    if (prev.wasPaidActive && !prev.isTrialing && (!isPaid || !hasActiveAccess)) {
      expiredFromTrial = false
    }

    if (hasActiveAccess && isPaid) {
      pending = false
      expiredFromTrial = false
      writeExpiredGatePending(false)
      writeExpiredFromTrial(false)
    } else {
      writeExpiredFromTrial(expiredFromTrial)
    }

    const expiredGateEligible = computeExpiredGateEligible({
      hasActiveAccess,
      isPaid,
      pending
    })

    set({
      plan: getEffectivePlan(subscription?.currentPlan, hasActiveAccess),
      hasActiveAccess,
      wasPaidActive: hasActiveAccess && isPaid,
      subscriptionStatus: subscription?.status ?? null,
      isTrialing: isTrialingNow,
      expiredFromTrial,
      expiresAt: subscription?.expiresAt ?? null,
      currentPeriodStart: subscription?.currentPeriodStart ?? null,
      trialStart: subscription?.trialStart ?? null,
      expiredGateEligible,
      // Re-open the gate when access returns to inactive after a dismiss + re-lapse
      expiredGateDismissed: expiredGateEligible ? prev.expiredGateDismissed : false,
      syncedAt: subscription?.syncedAt ?? null
    })
  },

  openUpgradePrompt: (feature) => set({ upgradePromptFeature: feature }),
  closeUpgradePrompt: () => set({ upgradePromptFeature: null }),

  openPlansModal: () => set({ plansModalOpen: true }),
  closePlansModal: () => set({ plansModalOpen: false }),

  continueToPlans: () =>
    set({
      upgradePromptFeature: null,
      plansModalOpen: true
    }),

  showPlanChangeSuccess: (success) =>
    set({
      planChangeSuccess: success,
      upgradePromptFeature: null,
      plansModalOpen: false,
      expiredGateEligible: false,
      expiredGateDismissed: false
    }),

  clearPlanChangeSuccess: () => set({ planChangeSuccess: null }),

  dismissExpiredGate: () => set({ expiredGateDismissed: true })
}))
