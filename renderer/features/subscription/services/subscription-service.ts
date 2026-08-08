import { apiClient, RendererApiError } from '@/services/api-client'
import { authService } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import {
  isCheckoutResult,
  type ChangePlanResult,
  type PublicPlan
} from '@/features/subscription/lib/plans'

function asPlanArray(data: unknown): PublicPlan[] {
  if (!Array.isArray(data)) return []
  return data
    .map((item): PublicPlan | null => {
      if (!item || typeof item !== 'object') return null
      const plan = item as Record<string, unknown>
      if (
        typeof plan.id !== 'string' ||
        typeof plan.name !== 'string' ||
        typeof plan.slug !== 'string' ||
        typeof plan.monthlyPrice !== 'number' ||
        !Array.isArray(plan.features)
      ) {
        return null
      }
      const monthlyPrice = plan.monthlyPrice
      const priceDisplay =
        typeof plan.priceDisplay === 'number' ? plan.priceDisplay : monthlyPrice / 100
      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        monthlyPrice,
        currency: typeof plan.currency === 'string' ? plan.currency : 'usd',
        billingInterval:
          typeof plan.billingInterval === 'string' ? plan.billingInterval : 'month',
        features: plan.features.filter((f): f is string => typeof f === 'string'),
        isTrialAvailable: Boolean(plan.isTrialAvailable),
        trialDays: typeof plan.trialDays === 'number' ? plan.trialDays : 0,
        priceDisplay
      }
    })
    .filter((plan): plan is PublicPlan => plan != null)
}

function asChangePlanResult(data: unknown): ChangePlanResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid plan change response')
  }
  const payload = data as Record<string, unknown>
  const mode = payload.mode

  if (mode === 'checkout') {
    const url = typeof payload.url === 'string' ? payload.url : null
    const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : ''
    if (!sessionId) {
      throw new Error('Checkout session is missing sessionId')
    }
    return {
      mode: 'checkout',
      sessionId,
      url,
      ...(typeof payload.publishableKey === 'string'
        ? { publishableKey: payload.publishableKey }
        : {})
    }
  }

  if (mode === 'immediate' || mode === 'scheduled') {
    if (typeof payload.currentPlan !== 'string' || typeof payload.status !== 'string') {
      throw new Error('Plan change response is missing subscription status')
    }
    return {
      mode,
      currentPlan: payload.currentPlan,
      status: payload.status,
      cancelAtPeriodEnd: Boolean(payload.cancelAtPeriodEnd),
      pendingPlan:
        typeof payload.pendingPlan === 'string' ? payload.pendingPlan : null,
      trialStart: typeof payload.trialStart === 'string' ? payload.trialStart : null,
      trialEnd: typeof payload.trialEnd === 'string' ? payload.trialEnd : null,
      currentPeriodStart:
        typeof payload.currentPeriodStart === 'string'
          ? payload.currentPeriodStart
          : null,
      currentPeriodEnd:
        typeof payload.currentPeriodEnd === 'string'
          ? payload.currentPeriodEnd
          : null,
      features: Array.isArray(payload.features)
        ? payload.features.filter((f): f is string => typeof f === 'string')
        : [],
      isPaid: Boolean(payload.isPaid),
      hasActiveAccess: Boolean(payload.hasActiveAccess)
    }
  }

  // Legacy checkout-only payload (POST /subscription/checkout)
  if (typeof payload.url === 'string' && typeof payload.sessionId === 'string') {
    return {
      mode: 'checkout',
      sessionId: payload.sessionId,
      url: payload.url,
      ...(typeof payload.publishableKey === 'string'
        ? { publishableKey: payload.publishableKey }
        : {})
    }
  }

  throw new Error('Unrecognized plan change response')
}

/**
 * Renderer facade for subscription catalog + plan changes.
 * HTTP goes through the main-process API client (auth + offline policy).
 */
export const subscriptionService = {
  async listPlans(): Promise<PublicPlan[]> {
    const response = await apiClient.get<PublicPlan[]>('/plans', {
      skipOfflineQueue: true,
      cache: { ttlMs: 5 * 60_000, key: 'plans:list' }
    })
    const plans = asPlanArray(response.data)
    return [...plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice)
  },

  async changePlan(planId: string): Promise<ChangePlanResult> {
    const response = await apiClient.post<unknown>(
      '/subscription/change-plan',
      { planId },
      {
        skipOfflineQueue: true,
        skipOfflineCache: true
      }
    )
    return asChangePlanResult(response.data)
  },

  async openCheckoutUrl(url: string): Promise<void> {
    const trimmed = url.trim()
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
      throw new Error('Invalid checkout URL')
    }
    await electronService.app().openExternal(trimmed)
  },

  async syncSubscriptionAfterPayment(): Promise<void> {
    await authService.sync('checkout-return')
  },

  mapError(error: unknown): { message: string; retryable: boolean; unauthorized: boolean } {
    if (error instanceof RendererApiError) {
      return {
        message: error.message,
        retryable: error.retryable || error.offline,
        unauthorized: error.status === 401
      }
    }
    if (error instanceof Error) {
      return {
        message: error.message,
        retryable: /network|offline|fetch|econnrefused/i.test(error.message),
        unauthorized: /unauthorized|401/i.test(error.message)
      }
    }
    return {
      message: 'Something went wrong. Please try again.',
      retryable: true,
      unauthorized: false
    }
  },

  isCheckoutResult
}
