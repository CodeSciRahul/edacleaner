/**
 * Deterministic JSON stringify for fingerprints / cache keys.
 * Shared by API cache layer and offline queue.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortValue(obj[key])
    }
    return sorted
  }
  return value
}
