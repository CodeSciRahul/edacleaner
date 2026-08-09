import { kvRepository } from './repositories/kv-repository'
import { createLogger } from '@main/utils/logger'

const log = createLogger('LocalStorage')

const DEFAULT_NAMESPACE = 'app'

/**
 * Generic durable key-value storage (JSON values) backed by the local DB.
 * Safe for preferences and non-secret app state.
 */
export class LocalStorageService {
  get<T>(key: string, defaultValue?: T, namespace = DEFAULT_NAMESPACE): T | undefined {
    this.assertKey(key)
    const raw = kvRepository.get(namespace, key)
    if (raw === null) return defaultValue

    try {
      return JSON.parse(raw) as T
    } catch {
      log.warn('Corrupt KV value — returning default', { namespace, key })
      return defaultValue
    }
  }

  set(key: string, value: unknown, namespace = DEFAULT_NAMESPACE): void {
    this.assertKey(key)
    kvRepository.set(namespace, key, JSON.stringify(value))
  }

  delete(key: string, namespace = DEFAULT_NAMESPACE): boolean {
    this.assertKey(key)
    return kvRepository.delete(namespace, key)
  }

  keys(namespace = DEFAULT_NAMESPACE): string[] {
    return kvRepository.keys(namespace)
  }

  getAll<T = unknown>(namespace = DEFAULT_NAMESPACE): Record<string, T> {
    const raw = kvRepository.getAll(namespace)
    const out: Record<string, T> = {}
    for (const [key, value] of Object.entries(raw)) {
      try {
        out[key] = JSON.parse(value) as T
      } catch {
        // skip corrupt entries
      }
    }
    return out
  }

  clear(namespace = DEFAULT_NAMESPACE): number {
    return kvRepository.clear(namespace)
  }

  private assertKey(key: string): void {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('Storage key must be a non-empty string')
    }
    if (key.length > 256) {
      throw new Error('Storage key is too long')
    }
  }
}

export const localStorageService = new LocalStorageService()
