import { createLogger } from '@main/utils/logger'

const log = createLogger('startup:safety')

/** Names we never allow toggling (substring match, case-insensitive). */
const PROTECTED_NAME_PATTERNS = [
  'securityhealth',
  'windows security',
  'defender',
  'msmpeng',
  'realtimeprotection',
  'ctfmon',
  'runtimebroker',
  'explorer',
  'dwm',
  'winlogon',
  'csrss',
  'lsass',
  'services',
  'system',
  'igfx',
  'nvidia',
  'amd',
  'intelgraphics',
  'rthdcpl',
  'audioendpointbuilder'
]

export function classifyStartupImpact(
  name: string
): 'high' | 'medium' | 'low' | 'unknown' {
  const lower = name.toLowerCase()
  const high = ['spotify', 'discord', 'steam', 'adobe', 'teams', 'zoom', 'slack', 'epic', 'skype']
  const medium = ['onedrive', 'dropbox', 'chrome', 'edge', 'firefox', 'iTunes', 'itunes']
  if (high.some((k) => lower.includes(k))) return 'high'
  if (medium.some((k) => lower.includes(k))) return 'medium'
  return 'unknown'
}

export function isProtectedStartupName(name: string): string | null {
  const lower = name.toLowerCase()
  for (const pattern of PROTECTED_NAME_PATTERNS) {
    if (lower.includes(pattern)) {
      log.debug('Protected startup name matched', name, pattern)
      return `Protected system-related entry (${pattern})`
    }
  }
  return null
}

export function encodeId(parts: string[]): string {
  return parts.map((p) => encodeURIComponent(p)).join('::')
}

export function decodeId(id: string): string[] {
  return id.split('::').map((p) => decodeURIComponent(p))
}
