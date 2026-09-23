import { lstat, realpath } from 'fs/promises'
import { homedir } from 'os'
import { isAbsolute, normalize, resolve, sep } from 'path'
import type { SafetyEngineOptions } from './types'

export interface NormalizedPath {
  input: string
  absolute: string
  realPath: string
  isSymlink: boolean
  /** Lowercase absolute for case-insensitive platforms. */
  comparePath: string
  realComparePath: string
}

function caseFold(platform: NodeJS.Platform, value: string): string {
  return platform === 'win32' || platform === 'darwin' ? value.toLowerCase() : value
}

function expandEnvVars(raw: string, env: NodeJS.ProcessEnv): string {
  return raw
    .replace(/%([^%]+)%/g, (_m, name: string) => env[name] ?? env[name.toUpperCase()] ?? '')
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, name: string) => env[name] ?? '')
}

/**
 * Expand `~` and env vars, then resolve to an absolute normalized path
 * without following symlinks (caller may realpath separately).
 */
export function expandUserPath(
  pattern: string,
  options: Pick<SafetyEngineOptions, 'homeDir' | 'env' | 'platform'> = {}
): string {
  const home = options.homeDir ?? homedir()
  const env = options.env ?? process.env
  let next = expandEnvVars(pattern.trim(), env)

  if (next === '~') {
    next = home
  } else if (next.startsWith('~/') || next.startsWith('~\\')) {
    next = home + next.slice(1)
  }

  // Empty env expansions can produce odd fragments — resolve from cwd-safe root
  if (!next) return resolve(home)

  return normalize(isAbsolute(next) ? next : resolve(home, next))
}

export function toComparePath(platform: NodeJS.Platform, absolutePath: string): string {
  const normalized = normalize(absolutePath)
  // Unify separators for matching
  const withForward = normalized.split(sep).join('/')
  return caseFold(platform, withForward.replace(/\/+$/, '') || '/')
}

export async function normalizePathForSafety(
  input: string,
  options: SafetyEngineOptions = {}
): Promise<NormalizedPath> {
  const platform = options.platform ?? process.platform
  const absolute = expandUserPath(input, options)
  let real = absolute
  let isSymlink = false

  try {
    const info = await lstat(absolute)
    if (info.isSymbolicLink()) {
      isSymlink = true
    }
    // realpath resolves symlinks and normalizes `.` / `..`
    real = await realpath(absolute)
  } catch {
    // Path may not exist yet (TOCTOU / deleted) — still evaluate lexical path
    real = absolute
  }

  // If lexical path differed from realpath without lstat symlink flag (junction/etc.)
  if (!isSymlink && toComparePath(platform, absolute) !== toComparePath(platform, real)) {
    isSymlink = true
  }

  return {
    input,
    absolute,
    realPath: real,
    isSymlink,
    comparePath: toComparePath(platform, absolute),
    realComparePath: toComparePath(platform, real)
  }
}

/** Synchronous lexical normalize (no FS). Used for rule compilation & tests. */
export function normalizePathLexical(
  input: string,
  options: SafetyEngineOptions = {}
): Omit<NormalizedPath, 'isSymlink'> & { isSymlink: false } {
  const platform = options.platform ?? process.platform
  const absolute = expandUserPath(input, options)
  return {
    input,
    absolute,
    realPath: absolute,
    isSymlink: false,
    comparePath: toComparePath(platform, absolute),
    realComparePath: toComparePath(platform, absolute)
  }
}

/**
 * True when `child` is the same as or nested under `parent`
 * (both already compare-folded with `/` separators).
 */
export function isPathInsideOrEqual(child: string, parent: string): boolean {
  if (child === parent) return true
  const prefix = parent.endsWith('/') ? parent : `${parent}/`
  return child.startsWith(prefix)
}
