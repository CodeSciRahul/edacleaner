const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token'
])

/**
 * Strip credentials from headers before durable queue persistence or IPC exposure.
 */
export function stripSensitiveHeaders(
  headers: Record<string, string> | undefined | null
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!headers) return out

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) continue
    if (typeof value !== 'string') continue
    out[key] = value
  }
  return out
}

/** Public DTO for queue items returned to the renderer. */
export function toPublicQueueItem<T extends { headers: Record<string, string>; body: unknown }>(
  item: T
): T {
  return {
    ...item,
    headers: stripSensitiveHeaders(item.headers),
    // Bodies may contain PII; keep structure but avoid huge payloads in IPC.
    body: truncateBody(item.body)
  }
}

function truncateBody(body: unknown): unknown {
  if (body == null) return body
  try {
    const raw = typeof body === 'string' ? body : JSON.stringify(body)
    if (raw.length <= 8_192) return body
    return { truncated: true, bytes: raw.length }
  } catch {
    return null
  }
}
