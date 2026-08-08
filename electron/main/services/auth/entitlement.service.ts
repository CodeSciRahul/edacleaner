import {
  canAccessFeature,
  entitlementErrorMessage,
  type FeatureId
} from '@shared/entitlements'
import { subscriptionSessionService } from './subscription-session.service'

/**
 * Main-process entitlement checks against the locally cached subscription.
 * Offline-first: uses last verified plan until the next successful sync.
 */
export class EntitlementService {
  canAccess(feature: FeatureId): boolean {
    const sub = subscriptionSessionService.getCached()
    return canAccessFeature(sub?.currentPlan, feature, {
      hasActiveAccess: sub?.hasActiveAccess
    })
  }

  /**
   * Throws a stable ENTITLEMENT_REQUIRED:<feature> error for IPC failure payloads.
   */
  assertAccess(feature: FeatureId): void {
    if (!this.canAccess(feature)) {
      throw new Error(entitlementErrorMessage(feature))
    }
  }
}

export const entitlementService = new EntitlementService()
