import { apiClient, RendererApiError } from '@/services/api-client'
import { authService } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import {
  isCheckoutResult,
  type ChangePlanResult,
  type PublicPlan
} from '@/features/subscription/lib/plans'

export interface SubscriptionInvoice {
  id: string
  number?: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  total?: number
  subtotal?: number
  lineAmount?: number
  displayAmount?: number
  isTrialInvoice?: boolean
  billingReason?: string | null
  currency: string
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  description?: string | null
  created: string | null
  periodStart: string | null
  periodEnd: string | null
  paidAt?: string | null
}

export interface SubscriptionHistoryEvent {
  id: string
  eventType: string
  fromPlan: string | null
  toPlan: string | null
  message: string
  createdAt: string
}

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
        priceDisplay,
        compareAtPriceDisplay:
          typeof plan.compareAtPriceDisplay === 'number'
            ? plan.compareAtPriceDisplay
            : null,
        discountPercent:
          typeof plan.discountPercent === 'number' ? plan.discountPercent : 0,
        savingsDisplay:
          typeof plan.savingsDisplay === 'number' ? plan.savingsDisplay : null
      }
    })
    .filter((plan): plan is PublicPlan => plan != null)
}

function asInvoiceArray(data: unknown): SubscriptionInvoice[] {
  if (!Array.isArray(data)) return []
  return data
    .map((item): SubscriptionInvoice | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      if (typeof row.id !== 'string') return null
      return {
        id: row.id,
        number: typeof row.number === 'string' ? row.number : null,
        status: typeof row.status === 'string' ? row.status : null,
        amountDue: typeof row.amountDue === 'number' ? row.amountDue : 0,
        amountPaid: typeof row.amountPaid === 'number' ? row.amountPaid : 0,
        total: typeof row.total === 'number' ? row.total : undefined,
        subtotal: typeof row.subtotal === 'number' ? row.subtotal : undefined,
        lineAmount: typeof row.lineAmount === 'number' ? row.lineAmount : undefined,
        displayAmount:
          typeof row.displayAmount === 'number' ? row.displayAmount : undefined,
        isTrialInvoice: Boolean(row.isTrialInvoice),
        billingReason:
          typeof row.billingReason === 'string' ? row.billingReason : null,
        currency: typeof row.currency === 'string' ? row.currency : 'usd',
        hostedInvoiceUrl:
          typeof row.hostedInvoiceUrl === 'string' ? row.hostedInvoiceUrl : null,
        invoicePdf: typeof row.invoicePdf === 'string' ? row.invoicePdf : null,
        description: typeof row.description === 'string' ? row.description : null,
        created: typeof row.created === 'string' ? row.created : null,
        periodStart: typeof row.periodStart === 'string' ? row.periodStart : null,
        periodEnd: typeof row.periodEnd === 'string' ? row.periodEnd : null,
        paidAt: typeof row.paidAt === 'string' ? row.paidAt : null
      }
    })
    .filter((row): row is SubscriptionInvoice => row != null)
}

function asHistoryArray(data: unknown): SubscriptionHistoryEvent[] {
  if (!Array.isArray(data)) return []
  return data
    .map((item): SubscriptionHistoryEvent | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const id =
        typeof row.id === 'string'
          ? row.id
          : typeof row._id === 'string'
            ? row._id
            : null
      if (!id || typeof row.eventType !== 'string' || typeof row.message !== 'string') {
        return null
      }
      const createdAt =
        typeof row.createdAt === 'string'
          ? row.createdAt
          : row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : null
      if (!createdAt) return null
      return {
        id,
        eventType: row.eventType,
        fromPlan: typeof row.fromPlan === 'string' ? row.fromPlan : null,
        toPlan: typeof row.toPlan === 'string' ? row.toPlan : null,
        message: row.message,
        createdAt
      }
    })
    .filter((row): row is SubscriptionHistoryEvent => row != null)
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
      skipAuth: true,
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

  async listInvoices(): Promise<SubscriptionInvoice[]> {
    const response = await apiClient.get<unknown>('/subscription/invoices', {
      skipOfflineQueue: true,
      skipOfflineCache: true
    })
    return asInvoiceArray(response.data)
  },

  async listHistory(): Promise<SubscriptionHistoryEvent[]> {
    const response = await apiClient.get<unknown>('/subscription/history', {
      skipOfflineQueue: true,
      skipOfflineCache: true
    })
    return asHistoryArray(response.data)
  },

  async openBillingPortal(): Promise<void> {
    const response = await apiClient.get<{ url?: string }>('/subscription/billing-portal', {
      skipOfflineQueue: true,
      skipOfflineCache: true
    })
    const url = typeof response.data?.url === 'string' ? response.data.url : ''
    if (!url) {
      throw new Error('Billing portal URL missing')
    }
    await this.openCheckoutUrl(url)
  },

  async syncSubscriptionAfterPayment(): Promise<void> {
    await authService.sync('checkout-return')
  },

  mapError(error: unknown): {
    message: string
    retryable: boolean
    unauthorized: boolean
    offline: boolean
  } {
    if (error instanceof RendererApiError) {
      return {
        message: error.message,
        retryable: error.retryable || error.offline,
        unauthorized: error.status === 401,
        offline: error.offline
      }
    }
    if (error instanceof Error) {
      const offline = /network|offline|fetch|econnrefused/i.test(error.message)
      return {
        message: error.message,
        retryable: offline,
        unauthorized: /unauthorized|401/i.test(error.message),
        offline
      }
    }
    return {
      message: 'Something went wrong. Please try again.',
      retryable: true,
      unauthorized: false,
      offline: false
    }
  },

  isCheckoutResult
}
