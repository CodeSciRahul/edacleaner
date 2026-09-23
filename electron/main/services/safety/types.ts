/** Shared risk classification for filesystem deletion candidates. */
export type SafetyRiskLevel = 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'PROTECTED'

export type SafetyPlatform = 'win32' | 'darwin' | 'linux' | 'all'

export type SafetyCategory =
  | 'os-system'
  | 'os-boot'
  | 'installed-apps'
  | 'user-identity'
  | 'browser-profile'
  | 'dev-tooling'
  | 'dev-cache'
  | 'project-build'
  | 'project-vcs'
  | 'app-self'
  | 'user-content'
  | 'cache'
  | 'temp'

export interface SafetyRule {
  id: string
  platforms: SafetyPlatform[]
  /**
   * Path pattern. Supports:
   * - `~` → user home
   * - `%ENV%` / `$ENV` → environment variables
   * - `**` and `*` globs
   * - Absolute roots (`/System`, `C:\\Windows` via env)
   */
  pathPattern: string
  risk: SafetyRiskLevel
  category: SafetyCategory
  reason: string
  /** Whether the UI/scanner may list this path. */
  scanAllowed: boolean
  /** Whether trash/permanent delete is allowed for this rule. */
  deletionAllowed: boolean
  /** Reserved for future advanced override flows. */
  userOverrideAllowed: boolean
  /**
   * Higher wins when multiple rules match the same path.
   * Prefer specific rules (e.g. wrapper dists) over generic trees.
   */
  priority: number
  regeneratable?: boolean
  recoverable?: boolean
}

export interface FileSafetyInfo {
  riskLevel: SafetyRiskLevel
  deletionAllowed: boolean
  reason: string
  ruleId: string | null
  category: SafetyCategory | null
  regeneratable: boolean
  recoverable: boolean
  /** True when the evaluated path was (or resolved through) a symlink/junction. */
  viaSymlink: boolean
}

export interface SafetyDecision extends FileSafetyInfo {
  path: string
  realPath: string
}

export interface SafetyEngineOptions {
  platform?: NodeJS.Platform
  homeDir?: string
  env?: NodeJS.ProcessEnv
  /** Absolute paths that must never be deleted (app exe, userData DB, etc.). */
  appProtectedRoots?: string[]
  /** Soft cache roots under app data that remain cleanable. */
  appCacheRoots?: string[]
}

export interface AssertDeletableOptions {
  /** Permanent delete is stricter than trash for HIGH_RISK. */
  permanent?: boolean
}

export const RISK_RANK: Record<SafetyRiskLevel, number> = {
  SAFE: 0,
  CAUTION: 1,
  HIGH_RISK: 2,
  PROTECTED: 3
}

export const DEFAULT_SAFE_DECISION: FileSafetyInfo = {
  riskLevel: 'SAFE',
  deletionAllowed: true,
  reason: 'Normal user file — safe to move to trash after confirmation.',
  ruleId: null,
  category: 'user-content',
  regeneratable: false,
  recoverable: true,
  viaSymlink: false
}
