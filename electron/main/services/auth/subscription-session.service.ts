import { createLogger } from '@main/utils/logger'
import { localStorageService } from '@main/services/offline/local-storage-service'
import type { CachedSubscription } from '@shared/interfaces'

const log = createLogger('SubscriptionSession')

const NS = 'subscription'
const KEY_STATUS = 'status'

function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const t = Date.parse(value)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/**
 * Durable local cache of subscription / plan entitlements.
 * Used offline and between syncs so temporary outages never force a re-login.
 */
export class SubscriptionSessionService {
  getCached(): CachedSubscription | null {
    return localStorageService.get<CachedSubscription>(KEY_STATUS, undefined, NS) ?? null
  }

  save(input: Partial<CachedSubscription> & { currentPlan: string; status: string }): CachedSubscription {
    const trialStart = asIso(input.trialStart) ?? null
    const trialEnd = asIso(input.trialEnd) ?? null
    const currentPeriodStart = asIso(input.currentPeriodStart) ?? null
    const currentPeriodEnd = asIso(input.currentPeriodEnd) ?? null
    const status = String(input.status)
    const isTrialing =
      status === 'trialing' ||
      (trialEnd != null && Date.parse(trialEnd) > Date.now())

    const cached: CachedSubscription = {
      currentPlan: input.currentPlan,
      status,
      cancelAtPeriodEnd: Boolean(input.cancelAtPeriodEnd),
      pendingPlan:
        typeof input.pendingPlan === 'string' ? input.pendingPlan : null,
      trialStart,
      trialEnd,
      currentPeriodStart,
      currentPeriodEnd,
      features: asStringArray(input.features),
      isPaid: Boolean(input.isPaid),
      hasActiveAccess:
        input.hasActiveAccess !== undefined
          ? Boolean(input.hasActiveAccess)
          : input.currentPlan === 'free' ||
            status === 'active' ||
            status === 'trialing' ||
            status === 'past_due',
      isTrialing,
      expiresAt: trialEnd ?? currentPeriodEnd,
      billingInterval:
        typeof input.billingInterval === 'string' ? input.billingInterval : null,
      syncedAt: Date.now()
    }

    localStorageService.set(KEY_STATUS, cached, NS)
    log.info('Subscription cache updated', {
      plan: cached.currentPlan,
      status: cached.status,
      isTrialing: cached.isTrialing
    })
    return cached
  }

  clear(): void {
    localStorageService.delete(KEY_STATUS, NS)
  }

  hasFeature(feature: string): boolean {
    const sub = this.getCached()
    if (!sub) return false
    return sub.features.some(
      (f) => f.toLowerCase() === feature.toLowerCase()
    )
  }

  getCurrentPlan(): string {
    return this.getCached()?.currentPlan ?? 'free'
  }

  getExpiry(): string | null {
    return this.getCached()?.expiresAt ?? null
  }

  getFeatures(): string[] {
    return this.getCached()?.features ?? []
  }

  getTrialStatus(): { isTrialing: boolean; trialEnd: string | null } {
    const sub = this.getCached()
    return {
      isTrialing: sub?.isTrialing ?? false,
      trialEnd: sub?.trialEnd ?? null
    }
  }
}

export const subscriptionSessionService = new SubscriptionSessionService()
