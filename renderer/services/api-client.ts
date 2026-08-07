import type {
  ApiClientResponse,
  ApiPublicError,
  ApiRequestConfig
} from '@shared/interfaces'

export class RendererApiError extends Error {
  readonly code: string
  readonly status?: number
  readonly retryable: boolean
  readonly fromCache: boolean
  readonly offline: boolean

  constructor(
    publicError: ApiPublicError,
    options: { fromCache?: boolean; offline?: boolean } = {}
  ) {
    super(publicError.message)
    this.name = 'RendererApiError'
    this.code = publicError.code
    this.status = publicError.status
    this.retryable = publicError.retryable
    this.fromCache = options.fromCache ?? false
    this.offline = options.offline ?? false
  }
}

export interface ApiClientRequestConfig extends Omit<ApiRequestConfig, 'method' | 'url'> {
  params?: ApiRequestConfig['params']
  headers?: Record<string, string>
  timeout?: number
  authToken?: string
  cache?: ApiRequestConfig['cache']
  retry?: ApiRequestConfig['retry']
  skipOfflineCache?: boolean
  skipOfflineQueue?: boolean
  unwrapEnvelope?: boolean
}

/** Axios-like response for drop-in compatibility. */
export interface ApiAxiosLikeResponse<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
  fromCache: boolean
  offline: boolean
  queued?: boolean
  queueRequestId?: string
}

type RequestInterceptor = (
  config: ApiRequestConfig
) => ApiRequestConfig | Promise<ApiRequestConfig>

type ResponseInterceptor = <T>(
  response: ApiAxiosLikeResponse<T>
) => ApiAxiosLikeResponse<T> | Promise<ApiAxiosLikeResponse<T>>

type ErrorInterceptor = (error: RendererApiError) => RendererApiError | Promise<RendererApiError>

class InterceptorManager<T> {
  private handlers: T[] = []

  use(handler: T): void {
    this.handlers.push(handler)
  }

  getHandlers(): T[] {
    return [...this.handlers]
  }
}

function getApiBridge() {
  if (!window.electron?.api) {
    throw new Error('Electron API bridge is not available')
  }
  return window.electron.api
}

function parsePublicError(message: string): ApiPublicError | null {
  try {
    const parsed = JSON.parse(message) as ApiPublicError
    if (parsed && typeof parsed.code === 'string' && typeof parsed.message === 'string') {
      return parsed
    }
  } catch {
    // plain text error from IPC
  }
  return null
}

async function runRequestInterceptors(config: ApiRequestConfig): Promise<ApiRequestConfig> {
  let current = config
  for (const handler of requestInterceptors.getHandlers()) {
    current = await handler(current)
  }
  return current
}

async function runResponseInterceptors<T>(
  response: ApiAxiosLikeResponse<T>
): Promise<ApiAxiosLikeResponse<T>> {
  let current = response
  for (const handler of responseInterceptors.getHandlers()) {
    current = await handler(current)
  }
  return current
}

async function runErrorInterceptors(error: RendererApiError): Promise<RendererApiError> {
  let current = error
  for (const handler of errorInterceptors.getHandlers()) {
    current = await handler(current)
  }
  return current
}

async function dispatchRequest<T>(
  config: ApiRequestConfig
): Promise<ApiAxiosLikeResponse<T>> {
  const finalConfig = await runRequestInterceptors(config)

  try {
    const result: ApiClientResponse<T> = await getApiBridge().request<T>(finalConfig)
    const response: ApiAxiosLikeResponse<T> = {
      data: result.data,
      status: result.status,
      headers: result.headers,
      fromCache: result.fromCache,
      offline: result.offline,
      ...(result.queued !== undefined ? { queued: result.queued } : {}),
      ...(result.queueRequestId !== undefined
        ? { queueRequestId: result.queueRequestId }
        : {})
    }
    return runResponseInterceptors(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'API request failed'
    const parsed = parsePublicError(message)
    const apiError = new RendererApiError(
      parsed ?? { code: 'unknown', message, retryable: false }
    )
    throw await runErrorInterceptors(apiError)
  }
}

const requestInterceptors = new InterceptorManager<RequestInterceptor>()
const responseInterceptors = new InterceptorManager<ResponseInterceptor>()
const errorInterceptors = new InterceptorManager<ErrorInterceptor>()

/**
 * Offline-first API client for the renderer.
 * All HTTP traffic is routed through the Electron main process which decides
 * between network + cache write, or local cache read when offline.
 */
export const apiClient = {
  interceptors: {
    request: requestInterceptors,
    response: responseInterceptors,
    error: errorInterceptors
  },

  request<T = unknown>(config: ApiRequestConfig): Promise<ApiAxiosLikeResponse<T>> {
    return dispatchRequest<T>(config)
  },

  get<T = unknown>(
    url: string,
    config: ApiClientRequestConfig = {}
  ): Promise<ApiAxiosLikeResponse<T>> {
    return dispatchRequest<T>({ ...config, method: 'GET', url })
  },

  post<T = unknown>(
    url: string,
    data?: unknown,
    config: ApiClientRequestConfig = {}
  ): Promise<ApiAxiosLikeResponse<T>> {
    return dispatchRequest<T>({ ...config, method: 'POST', url, data })
  },

  put<T = unknown>(
    url: string,
    data?: unknown,
    config: ApiClientRequestConfig = {}
  ): Promise<ApiAxiosLikeResponse<T>> {
    return dispatchRequest<T>({ ...config, method: 'PUT', url, data })
  },

  patch<T = unknown>(
    url: string,
    data?: unknown,
    config: ApiClientRequestConfig = {}
  ): Promise<ApiAxiosLikeResponse<T>> {
    return dispatchRequest<T>({ ...config, method: 'PATCH', url, data })
  },

  delete<T = unknown>(
    url: string,
    config: ApiClientRequestConfig = {}
  ): Promise<ApiAxiosLikeResponse<T>> {
    return dispatchRequest<T>({ ...config, method: 'DELETE', url })
  }
}

/** @deprecated Use `apiClient` — kept for backward compatibility. */
export { apiClient as default }
