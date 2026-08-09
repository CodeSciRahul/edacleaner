import { createLogger } from '@main/utils/logger'
import { connectivityService } from '@main/services/offline/connectivity-service'
import { queueService } from '@main/services/offline/queue'
import type { ApiRequestConfig, ApiClientResponse } from '@shared/interfaces'
import {
  ApiError,
  mapFetchError,
  toPublicApiError,
  type ApiErrorInterceptor,
  type ApiRequestInterceptor,
  type ApiResponseInterceptor
} from './api-error'
import {
  buildCacheKey,
  buildQueryString,
  buildRequestUrl,
  readApiCache,
  resolveApiBaseUrl,
  shouldUseCache,
  unwrapEnvelope,
  writeApiCache,
  type CachedApiPayload
} from './api-cache-layer'

const log = createLogger('ApiClient')

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 400

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

export type ApiAuthHandlers = {
  getAccessToken: () => Promise<string | null>
  refreshAccessToken: () => Promise<boolean>
}

export class ApiClient {
  private readonly requestInterceptors: ApiRequestInterceptor[] = []
  private readonly responseInterceptors: ApiResponseInterceptor[] = []
  private readonly errorInterceptors: ApiErrorInterceptor[] = []
  private authHandlers: ApiAuthHandlers | null = null

  constructor(private readonly baseUrl = resolveApiBaseUrl()) {
    this.useRequest(async (config) => {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...config.headers
      }

      if (
        config.data !== undefined &&
        config.method !== 'GET' &&
        config.method !== 'HEAD' &&
        !headers['Content-Type']
      ) {
        headers['Content-Type'] = 'application/json'
      }

      let authToken = config.authToken?.trim()
      if (!authToken && !config.skipAuth && this.authHandlers) {
        authToken = (await this.authHandlers.getAccessToken())?.trim() || undefined
      }

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      return { ...config, headers, ...(authToken ? { authToken } : {}) }
    })
  }

  /** Register session token providers (called by AuthSessionService). */
  setAuthHandlers(handlers: ApiAuthHandlers | null): void {
    this.authHandlers = handlers
  }

  useRequest(interceptor: ApiRequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  useResponse(interceptor: ApiResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  useError(interceptor: ApiErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
  }

  async request<T = unknown>(input: ApiRequestConfig): Promise<ApiClientResponse<T>> {
    const config = await this.runRequestInterceptors({ ...input })

    const url = buildRequestUrl(this.baseUrl, config.url) + buildQueryString(config.params)
    const cacheKey = buildCacheKey(config, url)
    const cacheEnabled = shouldUseCache(config)

    const online = await this.ensureConnectivitySignal()

    if (online) {
      try {
        const networkResponse = await this.executeWithRetry<T>(config, url)
        const processed = await this.runResponseInterceptors(networkResponse, config)

        if (cacheEnabled) {
          writeApiCache(
            cacheKey,
            {
              data: processed.data,
              status: processed.status,
              headers: processed.headers,
              cachedAt: Date.now()
            },
            config
          )
        }

        return {
          data: processed.data,
          status: processed.status,
          headers: processed.headers,
          fromCache: false,
          offline: false
        }
      } catch (error) {
        const mapped = await this.runErrorInterceptors(mapFetchError(error), config)

        const refreshed = await this.tryRefreshAndRetry<T>(mapped, config, url)
        if (refreshed) {
          const processed = await this.runResponseInterceptors(refreshed, config)
          if (cacheEnabled) {
            writeApiCache(
              cacheKey,
              {
                data: processed.data,
                status: processed.status,
                headers: processed.headers,
                cachedAt: Date.now()
              },
              config
            )
          }
          return {
            data: processed.data,
            status: processed.status,
            headers: processed.headers,
            fromCache: false,
            offline: false
          }
        }

        if (cacheEnabled) {
          const cached = readApiCache<T>(cacheKey)
          if (cached) {
            log.warn('Serving cached API response after network failure', {
              url: config.url,
              method: config.method
            })
            return this.toClientResponse(cached, true, false)
          }
        }

        // Only queue after transient transport failures — never on permanent 4xx.
        if (this.isTransientFailure(mapped) && queueService.shouldEnqueue(config, false)) {
          log.warn('Enqueueing mutation after transient online failure', {
            url: config.url,
            method: config.method,
            code: mapped.code,
            status: mapped.status
          })
          return this.enqueueOfflineMutation<T>(config)
        }

        throw mapped
      }
    }

    if (queueService.shouldEnqueue(config, false)) {
      return this.enqueueOfflineMutation<T>(config)
    }

    if (cacheEnabled) {
      const cached = readApiCache<T>(cacheKey)
      if (cached) {
        log.info('Serving cached API response while offline', {
          url: config.url,
          method: config.method
        })
        return this.toClientResponse(cached, true, true)
      }
    }

    throw ApiError.cacheMiss('No network connection and no cached response is available')
  }

  get<T = unknown>(
    url: string,
    config: Omit<ApiRequestConfig, 'method' | 'url'> = {}
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  post<T = unknown>(
    url: string,
    data?: unknown,
    config: Omit<ApiRequestConfig, 'method' | 'url' | 'data'> = {}
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  put<T = unknown>(
    url: string,
    data?: unknown,
    config: Omit<ApiRequestConfig, 'method' | 'url' | 'data'> = {}
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  patch<T = unknown>(
    url: string,
    data?: unknown,
    config: Omit<ApiRequestConfig, 'method' | 'url' | 'data'> = {}
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  delete<T = unknown>(
    url: string,
    config: Omit<ApiRequestConfig, 'method' | 'url'> = {}
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  private enqueueOfflineMutation<T>(config: ApiRequestConfig): ApiClientResponse<T> {
    const item = queueService.enqueueFromApiConfig(config)
    log.info('Mutating request queued offline', {
      id: item.id,
      method: item.method,
      url: item.url
    })

    return {
      data: {
        queued: true,
        requestId: item.id,
        status: item.status
      } as T,
      status: 202,
      headers: { 'x-offline-queued': 'true' },
      fromCache: false,
      offline: true,
      queued: true,
      queueRequestId: item.id
    }
  }

  /** True for transport/transient failures that may succeed when retried offline→online. */
  private isTransientFailure(error: ApiError): boolean {
    if (error.code === 'network' || error.code === 'timeout' || error.code === 'offline') {
      return true
    }
    if (error.status !== undefined && RETRYABLE_STATUS.has(error.status)) {
      return true
    }
    return Boolean(error.retryable && error.status !== undefined && error.status >= 500)
  }

  private async tryRefreshAndRetry<T>(
    error: ApiError,
    config: ApiRequestConfig,
    url: string
  ): Promise<{ data: T; status: number; headers: Record<string, string> } | null> {
    if (
      error.status !== 401 ||
      config.skipAuth ||
      config.skipAuthRefresh ||
      !this.authHandlers
    ) {
      return null
    }

    log.info('Access token rejected — attempting refresh', { url: config.url })
    const ok = await this.authHandlers.refreshAccessToken()
    if (!ok) return null

    const token = await this.authHandlers.getAccessToken()
    const retryConfig = await this.runRequestInterceptors({
      ...config,
      authToken: token ?? undefined,
      skipAuthRefresh: true,
      headers: {
        ...config.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })

    return this.executeWithRetry<T>(retryConfig, url)
  }

  private async ensureConnectivitySignal(): Promise<boolean> {
    if (connectivityService.isOnline()) return true
    const snapshot = await connectivityService.check()
    return snapshot.online
  }

  private async executeWithRetry<T>(
    config: ApiRequestConfig,
    url: string
  ): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    const retryConfig =
      config.retry === false
        ? { maxRetries: 0, delayMs: DEFAULT_RETRY_DELAY_MS }
        : {
            maxRetries:
              config.retry && typeof config.retry === 'object'
                ? (config.retry.maxRetries ?? DEFAULT_MAX_RETRIES)
                : DEFAULT_MAX_RETRIES,
            delayMs:
              config.retry && typeof config.retry === 'object'
                ? (config.retry.delayMs ?? DEFAULT_RETRY_DELAY_MS)
                : DEFAULT_RETRY_DELAY_MS
          }

    let attempt = 0
    let lastError: ApiError | null = null

    while (attempt <= retryConfig.maxRetries) {
      try {
        return await this.executeOnce<T>(config, url)
      } catch (error) {
        const mapped = mapFetchError(error)
        lastError = mapped
        const canRetry =
          mapped.retryable &&
          attempt < retryConfig.maxRetries &&
          (mapped.code === 'network' ||
            mapped.code === 'timeout' ||
            (mapped.status !== undefined && RETRYABLE_STATUS.has(mapped.status)))

        if (!canRetry) throw mapped

        const delay = retryConfig.delayMs * 2 ** attempt
        log.warn('Retrying API request', {
          url: config.url,
          method: config.method,
          attempt: attempt + 1,
          delayMs: delay,
          code: mapped.code
        })
        await sleep(delay)
        attempt += 1
      }
    }

    throw lastError ?? ApiError.network('Request failed after retries')
  }

  private async executeOnce<T>(
    config: ApiRequestConfig,
    url: string
  ): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    const timeoutMs = config.timeout ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const init: RequestInit = {
        method: config.method,
        headers: config.headers,
        signal: controller.signal
      }

      if (
        config.data !== undefined &&
        config.method !== 'GET' &&
        config.method !== 'HEAD'
      ) {
        init.body =
          typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
      }

      const response = await fetch(url, init)
      const rawText = await response.text()
      let parsed: unknown = null

      if (rawText) {
        try {
          parsed = JSON.parse(rawText)
        } catch {
          parsed = rawText
        }
      }

      if (!response.ok) {
        const message =
          parsed &&
          typeof parsed === 'object' &&
          'message' in parsed &&
          typeof (parsed as { message: unknown }).message === 'string'
            ? (parsed as { message: string }).message
            : `HTTP ${response.status}`

        throw ApiError.http(response.status, message, parsed)
      }

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      const data = config.unwrapEnvelope === false ? (parsed as T) : unwrapEnvelope<T>(parsed)

      return {
        data,
        status: response.status,
        headers
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw mapFetchError(error)
    } finally {
      clearTimeout(timer)
    }
  }

  private async runRequestInterceptors(
    config: ApiRequestConfig
  ): Promise<ApiRequestConfig> {
    let current = config
    for (const interceptor of this.requestInterceptors) {
      current = await interceptor(current)
    }
    return current
  }

  private async runResponseInterceptors<T>(
    response: { data: T; status: number; headers: Record<string, string> },
    config: ApiRequestConfig
  ): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    let current: { data: T; status: number; headers: Record<string, string> } = response
    for (const interceptor of this.responseInterceptors) {
      current = (await interceptor(current, config)) as typeof current
    }
    return current
  }

  private async runErrorInterceptors(
    error: ApiError,
    config: ApiRequestConfig
  ): Promise<ApiError> {
    let current = error
    for (const interceptor of this.errorInterceptors) {
      current = await interceptor(current, config)
    }
    return current
  }

  private toClientResponse<T>(
    cached: CachedApiPayload<T>,
    fromCache: boolean,
    offline: boolean
  ): ApiClientResponse<T> {
    return {
      data: cached.data,
      status: cached.status,
      headers: cached.headers,
      fromCache,
      offline
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const apiClient = new ApiClient()

export { toPublicApiError }
