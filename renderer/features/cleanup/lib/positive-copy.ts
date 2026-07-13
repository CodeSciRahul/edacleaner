import type { CleanupStepResult, CleanupStepStatus } from '@shared/interfaces'

/** Messages that are normal during cleanup (locked/in-use files), not real failures. */
export function isBenignCleanupNote(text: string | undefined): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return (
    lower.includes('eperm') ||
    lower.includes('operation not permitted') ||
    lower.includes('ebusy') ||
    lower.includes('resource busy') ||
    lower.includes('access is denied') ||
    lower.includes('eacces') ||
    lower.includes('locked') ||
    lower.includes('in use') ||
    lower.includes('permission was denied') ||
    lower.includes('busy')
  )
}

/**
 * Turns technical / negative cleanup notes into reassuring, premium copy.
 */
export function softCleanupNote(text: string | undefined): string | null {
  if (!text) return null
  const lower = text.toLowerCase()

  if (
    lower.includes('eperm') ||
    lower.includes('operation not permitted') ||
    lower.includes('locked')
  ) {
    return 'A few files were in use by other apps and left safely in place — that’s normal.'
  }
  if (lower.includes('ebusy') || lower.includes('resource busy') || lower.includes('in use')) {
    return 'Some items were busy, so we skipped them to keep your apps running smoothly.'
  }
  if (lower.includes('access is denied') || lower.includes('eacces') || lower.includes('permission')) {
    return 'Protected system items were left untouched for your safety.'
  }
  if (lower.includes('nothing to remove') || lower.includes('nothing to clean')) {
    return 'This area was already clear — great news.'
  }
  if (text.length > 140) {
    return `${text.slice(0, 137).trimEnd()}…`
  }
  return text
}

/** Map raw step status to a user-facing success-oriented status. */
export function stepDisplayStatus(step: CleanupStepResult): CleanupStepStatus | 'optimized' {
  if (step.status === 'completed') return 'optimized'
  if (step.status === 'failed' && isBenignCleanupNote(step.error)) return 'skipped'
  if (step.status === 'failed' && (step.bytesFreed > 0 || step.filesRemoved > 0)) {
    return 'optimized'
  }
  return step.status
}
