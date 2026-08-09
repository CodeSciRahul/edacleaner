import { create } from 'zustand'
import {
  getEffectivePlan,
  type FeatureId,
  type PlanSlug
} from '@shared/entitlements'
import type { CachedSubscription } from '@shared/interfaces'

interface EntitlementsState {
  plan: PlanSlug
  hasActiveAccess: boolean
  syncedAt: number | null
  upgradePromptFeature: FeatureId | null
  plansModalOpen: boolean
  setFromSubscription: (subscription: CachedSubscription | null | undefined) => void
  openUpgradePrompt: (feature: FeatureId) => void
  closeUpgradePrompt: () => void
  openPlansModal: () => void
  closePlansModal: () => void
  /** Open plans after dismissing the upgrade prompt (Upgrade Now / Compare). */
  continueToPlans: () => void
}

export const useEntitlementsStore = create<EntitlementsState>((set) => ({
  plan: 'free',
  hasActiveAccess: true,
  syncedAt: null,
  upgradePromptFeature: null,
  plansModalOpen: false,

  setFromSubscription: (subscription) => {
    const hasActiveAccess = subscription?.hasActiveAccess !== false
    set({
      plan: getEffectivePlan(subscription?.currentPlan, hasActiveAccess),
      hasActiveAccess,
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
    })
}))
