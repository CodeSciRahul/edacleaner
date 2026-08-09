import { createHash } from 'crypto'
import { app } from 'electron'
import type { ApiRequestConfig, ApiResponseEnvelope } from '@shared/interfaces'
import { cacheManager } from '@main/services/offline/cache-manager'
import { stableStringify } from '@main/utils/stable-stringify'
import { createLogger } from '@main/utils/logger'

const log = createLogger('ApiCache')

export const API_CACHE_NAMESPACE = 'api'

export interface CachedApiPayload<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
  cachedAt: number
}

export function resolveApiBaseUrl(): string {
  const fromEnv =
    typeof import.meta.env.SERVER_API_BASE_URL === 'string'
      ? import.meta.env.SERVER_API_BASE_URL
      : undefined
  const fallback = 'https://edacleaner.com/api/v1'
  const resolved = (fromEnv?.trim() || fallback).replace(/\/$/, '')

  if (app.isPackaged) {
    if (!fromEnv?.trim()) {
      log.error('SERVER_API_BASE_URL is required in packaged builds')
      throw new Error('API base URL is not configured for production')
    }
    if (!/^https:\/\//i.test(resolved)) {
      log.error('Packaged builds require HTTPS API base URL', { resolved })
      throw new Error('API base URL must use HTTPS in production')
    }
  }

  return resolved
}

/**
 * Build a request URL relative to the API base. Absolute URLs are rejected
 * to prevent SSRF via IPC.
 */
export function buildRequestUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    throw new Error('Absolute API URLs are not allowed')
  }
  if (path.includes('://') || path.includes('\\')) {
    throw new Error('Invalid API path')
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized.includes('..')) {
    throw new Error('API path traversal is not allowed')
  }
  return `${baseUrl}${normalized}`
}

export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function buildCacheKey(config: ApiRequestConfig, url: string): string {
  if (config.cache && typeof config.cache === 'object' && config.cache.key) {
    return config.cache.key
  }

  const params = config.params ? stableStringify(config.params) : ''
  const body =
    config.data !== undefined && config.method !== 'GET' && config.method !== 'HEAD'
      ? stableStringify(config.data)
      : ''

  return createHash('sha256')
    .update(`${config.method}:${url}:${params}:${body}`)
    .digest('hex')
}

export function isCacheableMethod(method: ApiRequestConfig['method']): boolean {
  return method === 'GET' || method === 'HEAD'
}

export function shouldUseCache(config: ApiRequestConfig): boolean {
  if (config.skipOfflineCache) return false
  if (config.cache === false) return false
  if (config.cache === true || (config.cache && typeof config.cache === 'object')) {
    return true
  }
  return isCacheableMethod(config.method)
}

export function getCacheTtl(config: ApiRequestConfig): number {
  if (config.cache && typeof config.cache === 'object' && config.cache.ttlMs) {
    return config.cache.ttlMs
  }
  return 5 * 60 * 1000
}

export function readApiCache<T>(
  key: string,
  namespace = API_CACHE_NAMESPACE
): CachedApiPayload<T> | null {
  return cacheManager.get<CachedApiPayload<T>>(key, namespace)
}

export function writeApiCache<T>(
  key: string,
  payload: CachedApiPayload<T>,
  config: ApiRequestConfig,
  namespace = API_CACHE_NAMESPACE
): void {
  cacheManager.set(key, payload, {
    namespace,
    ttlMs: getCacheTtl(config)
  })
}

export function unwrapEnvelope<T>(body: unknown): T {
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    (body as ApiResponseEnvelope).success === true &&
    'data' in body
  ) {
    return (body as ApiResponseEnvelope<T>).data as T
  }
  return body as T
}
