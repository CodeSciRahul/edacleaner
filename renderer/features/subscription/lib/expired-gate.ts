const PENDING_KEY = 'eda-cleaner-subscription-expired-pending'
const FROM_TRIAL_KEY = 'eda-cleaner-subscription-expired-from-trial'

export function readExpiredGatePending(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

export function writeExpiredGatePending(pending: boolean): void {
  try {
    if (pending) localStorage.setItem(PENDING_KEY, '1')
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    // Quota / private mode
  }
}

export function readExpiredFromTrial(): boolean {
  try {
    return localStorage.getItem(FROM_TRIAL_KEY) === '1'
  } catch {
    return false
  }
}

export function writeExpiredFromTrial(fromTrial: boolean): void {
  try {
    if (fromTrial) localStorage.setItem(FROM_TRIAL_KEY, '1')
    else localStorage.removeItem(FROM_TRIAL_KEY)
  } catch {
    // Quota / private mode
  }
}

/** Paid plan with inactive access, or a previously flagged expiry that has not been cleared by a successful re-subscribe. */
export function computeExpiredGateEligible(input: {
  hasActiveAccess: boolean
  isPaid: boolean
  pending: boolean
}): boolean {
  if (!input.hasActiveAccess) return true
  if (input.pending && !input.isPaid) return true
  return false
}
