import type { ApiRequestConfig } from '@shared/interfaces'

export type ApiErrorCode =
  | 'offline'
  | 'timeout'
  | 'network'
  | 'http'
  | 'cache_miss'
  | 'validation'
  | 'unknown'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status?: number
  readonly details?: unknown
  readonly retryable: boolean

  constructor(
    code: ApiErrorCode,
    message: string,
    options: {
      status?: number
      details?: unknown
      retryable?: boolean
      cause?: unknown
    } = {}
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = code
    this.status = options.status
    this.details = options.details
    this.retryable = options.retryable ?? false
  }

  static offline(message = 'No network connection'): ApiError {
    return new ApiError('offline', message, { retryable: false })
  }

  static timeout(message = 'Request timed out'): ApiError {
    return new ApiError('timeout', message, { retryable: true })
  }

  static network(message: string, cause?: unknown): ApiError {
    return new ApiError('network', message, { retryable: true, cause })
  }

  static http(status: number, message: string, details?: unknown): ApiError {
    return new ApiError('http', message, {
      status,
      details,
      retryable: status === 408 || status === 429 || status >= 500
    })
  }

  static cacheMiss(message = 'No cached response available'): ApiError {
    return new ApiError('cache_miss', message, { retryable: false })
  }
}

export function mapFetchError(error: unknown, status?: number): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof DOMException && error.name === 'AbortError') {
    return ApiError.timeout()
  }

  if (typeof status === 'number' && status > 0) {
    const message =
      error instanceof Error ? error.message : `HTTP ${status}`
    return ApiError.http(status, message, error)
  }

  const message = error instanceof Error ? error.message : 'Network request failed'
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return ApiError.network(message, error)
  }

  return new ApiError('unknown', message, { cause: error })
}

export function toPublicApiError(error: unknown): {
  code: ApiErrorCode
  message: string
  status?: number
  retryable: boolean
} {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.status !== undefined ? { status: error.status } : {}),
      retryable: error.retryable
    }
  }

  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Request failed',
    retryable: false
  }
}

export type ApiRequestInterceptor = (
  config: ApiRequestConfig
) => ApiRequestConfig | Promise<ApiRequestConfig>

export type ApiResponseInterceptor<T = unknown> = (
  response: { data: T; status: number; headers: Record<string, string> },
  config: ApiRequestConfig
) =>
  | { data: T; status: number; headers: Record<string, string> }
  | Promise<{ data: T; status: number; headers: Record<string, string> }>

export type ApiErrorInterceptor = (
  error: ApiError,
  config: ApiRequestConfig
) => ApiError | Promise<ApiError>
