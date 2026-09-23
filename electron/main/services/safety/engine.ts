import {
  DEFAULT_SAFE_DECISION,
  RISK_RANK,
  type AssertDeletableOptions,
  type FileSafetyInfo,
  type SafetyDecision,
  type SafetyEngineOptions,
  type SafetyRiskLevel,
  type SafetyRule
} from './types'
import {
  expandUserPath,
  isPathInsideOrEqual,
  normalizePathForSafety,
  normalizePathLexical,
  toComparePath
} from './path-normalize'
import { SAFETY_RULES } from './rules'

function logBlocked(payload: Record<string, unknown>): void {
  // Structured diagnostics for developers; avoid noisy test output
  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') return
  try {
    // Lazy-load so unit tests do not require a live Electron app
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createLogger } = require('@main/utils/logger') as typeof import('@main/utils/logger')
    createLogger('safety').info('Deletion blocked by safety engine', payload)
  } catch {
    console.info('[safety] Deletion blocked', payload)
  }
}

interface CompiledRule {
  rule: SafetyRule
  /** Compare-folded pattern with `/` separators (globs preserved). */
  pattern: string
  specificity: number
}

function platformMatches(
  rule: SafetyRule,
  platform: NodeJS.Platform
): boolean {
  return rule.platforms.includes('all') || rule.platforms.includes(platform as 'win32' | 'darwin' | 'linux')
}

/**
 * Expand a rule pattern to a compare-path glob.
 * Leading drive letters and roots are preserved.
 */
function compilePattern(
  pathPattern: string,
  options: SafetyEngineOptions
): { pattern: string; specificity: number } {
  const platform = options.platform ?? process.platform
  const trimmed = pathPattern.trim()

  // Glob-only patterns (**/node_modules/**) — do not resolve against home
  if (trimmed.startsWith('**') || trimmed.startsWith('*')) {
    const pattern = toComparePath(platform, trimmed.replace(/\\/g, '/'))
    return { pattern, specificity: pattern.replace(/[*?]/g, '').length }
  }

  // Split trailing glob from concrete prefix for expansion
  const globIdx = trimmed.search(/[*?]/)
  const concrete = globIdx === -1 ? trimmed : trimmed.slice(0, globIdx)
  const globTail = globIdx === -1 ? '' : trimmed.slice(globIdx)

  let expandedConcrete = concrete
  if (concrete) {
    // Avoid expandUserPath eating trailing slash intent
    const cleaned = concrete.replace(/[/\\]+$/, '')
    expandedConcrete = cleaned ? expandUserPath(cleaned, options) : cleaned
  }

  const combined = `${expandedConcrete.replace(/\\/g, '/')}${globTail ? (expandedConcrete ? '/' : '') + globTail.replace(/\\/g, '/') : ''}`
    .replace(/\/+/g, '/')
    .replace(/\/\*\*$/, '/**')

  const pattern = toComparePath(platform, combined)
  const specificity = pattern.replace(/[*?]/g, '').length
  return { pattern, specificity }
}

/** Convert a simplified glob (`*`, `**`) to a RegExp matching full paths. */
function globToRegExp(glob: string): RegExp {
  let source = '^'
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]
    if (ch === '*' && glob[i + 1] === '*') {
      // ** spans directories
      if (glob[i + 2] === '/') {
        source += '(?:.*/)?'
        i += 2
      } else {
        source += '.*'
        i += 1
      }
      continue
    }
    if (ch === '*') {
      source += '[^/]*'
      continue
    }
    if (ch === '?') {
      source += '[^/]'
      continue
    }
    if ('\\.|^$+{}()[]'.includes(ch)) {
      source += `\\${ch}`
    } else {
      source += ch
    }
  }
  source += '$'
  return new RegExp(source)
}

function matchesGlob(pathCompare: string, pattern: string): boolean {
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return isPathInsideOrEqual(pathCompare, pattern)
  }

  // Fast prefix check when pattern is `prefix/**`
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3)
    if (prefix && !prefix.includes('*') && !prefix.includes('?')) {
      return isPathInsideOrEqual(pathCompare, prefix)
    }
  }

  return globToRegExp(pattern).test(pathCompare)
}

function scoreMatch(compiled: CompiledRule, pathCompare: string): number | null {
  if (!matchesGlob(pathCompare, compiled.pattern)) return null
  // priority dominates; then specificity; then risk severity
  return (
    compiled.rule.priority * 1_000_000 +
    compiled.specificity * 100 +
    RISK_RANK[compiled.rule.risk]
  )
}

function decisionFromRule(
  rule: SafetyRule,
  viaSymlink: boolean
): FileSafetyInfo {
  return {
    riskLevel: rule.risk,
    deletionAllowed: rule.deletionAllowed,
    reason: rule.reason,
    ruleId: rule.id,
    category: rule.category,
    regeneratable: rule.regeneratable ?? false,
    recoverable: rule.recoverable ?? rule.deletionAllowed,
    viaSymlink
  }
}

function pickBest(
  compiledRules: CompiledRule[],
  pathCompare: string
): SafetyRule | null {
  let best: { rule: SafetyRule; score: number } | null = null
  for (const compiled of compiledRules) {
    const score = scoreMatch(compiled, pathCompare)
    if (score == null) continue
    if (!best || score > best.score) {
      best = { rule: compiled.rule, score }
    }
  }
  return best?.rule ?? null
}

export class SafetyEngine {
  private readonly options: SafetyEngineOptions
  private readonly compiled: CompiledRule[]
  private readonly appProtected: string[]
  private readonly appCaches: string[]

  constructor(options: SafetyEngineOptions = {}, rules: SafetyRule[] = SAFETY_RULES) {
    this.options = {
      platform: options.platform ?? process.platform,
      homeDir: options.homeDir,
      env: options.env ?? process.env,
      appProtectedRoots: options.appProtectedRoots ?? [],
      appCacheRoots: options.appCacheRoots ?? []
    }

    const platform = this.options.platform ?? process.platform
    this.compiled = rules
      .filter((rule) => platformMatches(rule, platform))
      .map((rule) => {
        const { pattern, specificity } = compilePattern(rule.pathPattern, this.options)
        return { rule, pattern, specificity }
      })

    this.appProtected = (this.options.appProtectedRoots ?? []).map((p) =>
      toComparePath(platform, expandUserPath(p, this.options))
    )
    this.appCaches = (this.options.appCacheRoots ?? []).map((p) =>
      toComparePath(platform, expandUserPath(p, this.options))
    )
  }

  /** Fast evaluate using lexical path only (scan-time). */
  evaluateLexical(filePath: string): FileSafetyInfo {
    const platform = this.options.platform ?? process.platform
    const normalized = normalizePathLexical(filePath, this.options)
    return this.classify(normalized.comparePath, false, platform)
  }

  /** Full evaluate with symlink/realpath resolution (delete-time). */
  async evaluate(filePath: string): Promise<SafetyDecision> {
    const platform = this.options.platform ?? process.platform
    const normalized = await normalizePathForSafety(filePath, this.options)

    // Apply rules to BOTH lexical and real paths — symlink must not bypass protection
    const lexical = this.classify(normalized.comparePath, normalized.isSymlink, platform)
    const real = this.classify(normalized.realComparePath, normalized.isSymlink, platform)

    const chosen =
      RISK_RANK[real.riskLevel] >= RISK_RANK[lexical.riskLevel] ? real : lexical

    return {
      ...chosen,
      viaSymlink: normalized.isSymlink || chosen.viaSymlink,
      path: normalized.absolute,
      realPath: normalized.realPath
    }
  }

  /**
   * Re-check immediately before deletion. Throws nothing — returns decision.
   * Permanent deletes additionally block HIGH_RISK.
   */
  async assertDeletable(
    filePath: string,
    options: AssertDeletableOptions = {}
  ): Promise<SafetyDecision> {
    const decision = await this.evaluate(filePath)
    const permanent = options.permanent === true

    let deletionAllowed = decision.deletionAllowed
    let riskLevel: SafetyRiskLevel = decision.riskLevel
    let reason = decision.reason

    if (permanent && decision.riskLevel === 'HIGH_RISK') {
      deletionAllowed = false
      riskLevel = 'PROTECTED'
      reason = `${decision.reason} Permanent deletion is blocked for high-risk locations.`
    }

    if (permanent && decision.riskLevel === 'CAUTION' && !decision.regeneratable) {
      // keep allowed for regeneratable caution caches
    }

    const finalDecision: SafetyDecision = {
      ...decision,
      riskLevel,
      deletionAllowed,
      reason
    }

    if (!deletionAllowed) {
      logBlocked({
        path: decision.path,
        matchedRule: decision.ruleId,
        risk: riskLevel,
        deletionAllowed: false,
        reason,
        permanent
      })
    }

    return finalDecision
  }

  private classify(
    pathCompare: string,
    viaSymlink: boolean,
    platform: NodeJS.Platform
  ): FileSafetyInfo {
    // App self-protection (except explicit cache roots)
    for (const root of this.appProtected) {
      if (!isPathInsideOrEqual(pathCompare, root)) continue
      const inCache = this.appCaches.some((cache) => isPathInsideOrEqual(pathCompare, cache))
      if (inCache) {
        return {
          riskLevel: 'CAUTION',
          deletionAllowed: true,
          reason: 'EDA Cleaner cache — safe to clear; the app will recreate it as needed.',
          ruleId: 'app-self-cache',
          category: 'app-self',
          regeneratable: true,
          recoverable: false,
          viaSymlink
        }
      }
      return {
        riskLevel: 'PROTECTED',
        deletionAllowed: false,
        reason:
          'EDA Cleaner application files — deleting these can break the cleaner itself.',
        ruleId: 'app-self',
        category: 'app-self',
        regeneratable: false,
        recoverable: true,
        viaSymlink
      }
    }

    const matched = pickBest(this.compiled, pathCompare)
    if (matched) {
      return decisionFromRule(matched, viaSymlink)
    }

    // Windows: protect any path under X:\Windows even if SystemRoot env missing in tests
    if (platform === 'win32') {
      if (/^[a-z]:\/windows(\/|$)/i.test(pathCompare)) {
        return {
          riskLevel: 'PROTECTED',
          deletionAllowed: false,
          reason:
            'Windows system files — deleting these can crash or prevent Windows from starting.',
          ruleId: 'win-system-root-fallback',
          category: 'os-system',
          regeneratable: false,
          recoverable: true,
          viaSymlink
        }
      }
    }

    return { ...DEFAULT_SAFE_DECISION, viaSymlink }
  }
}

let defaultEngine: SafetyEngine | null = null

/** Lazy singleton wired with Electron app paths when available. */
export function getSafetyEngine(): SafetyEngine {
  if (defaultEngine) return defaultEngine
  defaultEngine = createDefaultSafetyEngine()
  return defaultEngine
}

export function createDefaultSafetyEngine(): SafetyEngine {
  const appProtectedRoots: string[] = []
  const appCacheRoots: string[] = []

  try {
    // Lazy require so unit tests can run without Electron
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app && typeof app.getPath === 'function') {
      try {
        appProtectedRoots.push(app.getAppPath())
      } catch {
        // unpackaged edge cases
      }
      try {
        appProtectedRoots.push(app.getPath('exe'))
      } catch {
        // ignore
      }
      try {
        const userData = app.getPath('userData')
        appProtectedRoots.push(userData)
        appCacheRoots.push(`${userData}/Cache`)
        appCacheRoots.push(`${userData}/Code Cache`)
        appCacheRoots.push(`${userData}/GPUCache`)
      } catch {
        // ignore
      }
    }
  } catch {
    // electron not available (tests)
  }

  return new SafetyEngine({ appProtectedRoots, appCacheRoots })
}

/** Test helper — reset singleton between cases. */
export function resetSafetyEngineForTests(): void {
  defaultEngine = null
}

export function toFileSafetyInfo(decision: FileSafetyInfo): FileSafetyInfo {
  return {
    riskLevel: decision.riskLevel,
    deletionAllowed: decision.deletionAllowed,
    reason: decision.reason,
    ruleId: decision.ruleId,
    category: decision.category,
    regeneratable: decision.regeneratable,
    recoverable: decision.recoverable,
    viaSymlink: decision.viaSymlink
  }
}
