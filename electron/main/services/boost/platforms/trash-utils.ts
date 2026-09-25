/**
 * Detect "already empty / nothing to delete" trash errors so Boost can treat
 * them as a friendly completed step instead of a harsh Failed result.
 *
 * Parses the Finder / shell error body (after "execution error:") so we do not
 * match the literal "empty trash" command text that often appears in the prefix.
 */
export function isBenignEmptyTrashError(message: string): boolean {
  const lower = message.toLowerCase()
  const executionIdx = lower.lastIndexOf('execution error:')
  const body = executionIdx >= 0 ? lower.slice(executionIdx) : lower

  return (
    /already\s+empty/.test(body) ||
    /trash\s+is\s+empty/.test(body) ||
    /the\s+trash\s+is\s+empty/.test(body) ||
    /recycle\s+bin\s+is\s+empty/.test(body) ||
    /no\s+items?\s+(in\s+)?(the\s+)?trash/.test(body) ||
    /nothing\s+to\s+(delete|empty|remove)/.test(body) ||
    /there\s+are\s+no\s+items/.test(body) ||
    /no\s+junk/.test(body)
  )
}
