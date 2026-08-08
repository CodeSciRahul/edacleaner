/**
 * Centralized subscription feature entitlements.
 * Used by main-process IPC guards and the renderer UX layer.
 */

export const PLAN_SLUGS = ['free', 'pro', 'premium'] as const
export type PlanSlug = (typeof PLAN_SLUGS)[number]

export const PLAN_RANK: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  premium: 2
}

/**
 * Stable feature IDs for gating. Map 1:1 to product capabilities
 * from the Free / Pro / Premium catalog.
 */
export const FEATURE_IDS = [
  'smart_scan',
  'cleanup_basic',
  'cleanup_temp',
  'storage_overview',
  'large_files',
  'duplicates',
  'performance_boost',
  'startup_apps',
  'background_apps',
  'cleanup_reports',
  'live_monitor'
] as const

export type FeatureId = (typeof FEATURE_IDS)[number]

/** Minimum plan required to execute each feature. */
export const FEATURE_MIN_PLAN: Record<FeatureId, PlanSlug> = {
  smart_scan: 'free',
  cleanup_basic: 'free',
  cleanup_temp: 'pro',
  storage_overview: 'pro',
  large_files: 'pro',
  duplicates: 'pro',
  performance_boost: 'premium',
  startup_apps: 'premium',
  background_apps: 'premium',
  cleanup_reports: 'premium',
  live_monitor: 'premium'
}

export const FEATURE_LABELS: Record<FeatureId, string> = {
  smart_scan: 'Smart Scan',
  cleanup_basic: 'One-click Cleanup',
  cleanup_temp: 'Temporary File Removal',
  storage_overview: 'Storage Overview Dashboard',
  large_files: 'Large File Finder',
  duplicates: 'Duplicate File Cleaner',
  performance_boost: 'Performance Boost',
  startup_apps: 'Startup App Manager',
  background_apps: 'Background App Control',
  cleanup_reports: 'Cleanup Reports',
  live_monitor: 'Live System Monitor'
}

export const PLAN_DISPLAY_NAMES: Record<PlanSlug, string> = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium'
}

/** Prefix used in IPC / API entitlement error messages. */
export const ENTITLEMENT_ERROR_PREFIX = 'ENTITLEMENT_REQUIRED:'

export function isPlanSlug(value: string): value is PlanSlug {
  return (PLAN_SLUGS as readonly string[]).includes(value)
}

export function normalizePlanSlug(value: string | null | undefined): PlanSlug {
  const slug = (value ?? 'free').trim().toLowerCase()
  return isPlanSlug(slug) ? slug : 'free'
}

export function isFeatureId(value: string): value is FeatureId {
  return (FEATURE_IDS as readonly string[]).includes(value)
}

export function requiredPlanFor(feature: FeatureId): PlanSlug {
  return FEATURE_MIN_PLAN[feature]
}

/**
 * Effective plan for gating: inactive paid access falls back to Free
 * so expired / unpaid subscriptions do not keep Pro/Premium unlocks.
 */
export function getEffectivePlan(
  currentPlan: string | null | undefined,
  hasActiveAccess?: boolean | null
): PlanSlug {
  const plan = normalizePlanSlug(currentPlan)
  if (plan === 'free') return 'free'
  if (hasActiveAccess === false) return 'free'
  return plan
}

export function planMeetsMinimum(
  currentPlan: string | null | undefined,
  minimum: PlanSlug,
  options?: { hasActiveAccess?: boolean | null }
): boolean {
  const effective = getEffectivePlan(currentPlan, options?.hasActiveAccess)
  return PLAN_RANK[effective] >= PLAN_RANK[minimum]
}

export function canAccessFeature(
  currentPlan: string | null | undefined,
  feature: FeatureId,
  options?: { hasActiveAccess?: boolean | null }
): boolean {
  return planMeetsMinimum(currentPlan, FEATURE_MIN_PLAN[feature], options)
}

export function listAccessibleFeatures(
  currentPlan: string | null | undefined,
  options?: { hasActiveAccess?: boolean | null }
): FeatureId[] {
  return FEATURE_IDS.filter((id) => canAccessFeature(currentPlan, id, options))
}

export function entitlementErrorMessage(feature: FeatureId): string {
  return `${ENTITLEMENT_ERROR_PREFIX}${feature}`
}

export function parseEntitlementError(message: string): FeatureId | null {
  if (!message.startsWith(ENTITLEMENT_ERROR_PREFIX)) return null
  const id = message.slice(ENTITLEMENT_ERROR_PREFIX.length).trim()
  return isFeatureId(id) ? id : null
}
