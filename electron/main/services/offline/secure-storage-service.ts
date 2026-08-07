import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { app, safeStorage } from 'electron'
import { readFile, writeFile, chmod } from 'fs/promises'
import { join } from 'path'
import { createLogger } from '@main/utils/logger'
import { ensureDir } from './database/database'
import { secureRepository } from './repositories/secure-repository'

const log = createLogger('SecureStorage')

export type SecureEncodingMode = 'safeStorage' | 'aes-gcm'

const FALLBACK_KEY_FILE = 'secure-fallback.key'
const AES_ALGO = 'aes-256-gcm'

/**
 * Encrypted secure storage for secrets (tokens, credentials).
 * Prefers Electron safeStorage (OS keychain / DPAPI / libsecret).
 * Falls back to AES-256-GCM with a local key file when OS encryption is unavailable
 * (common on some Linux setups).
 */
export class SecureStorageService {
  private fallbackKey: Buffer | null = null

  isEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  async set(key: string, plaintext: string): Promise<void> {
    this.assertKey(key)
    if (typeof plaintext !== 'string') {
      throw new Error('Secure value must be a string')
    }

    if (this.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plaintext)
      secureRepository.set(key, encrypted.toString('base64'), 'safeStorage')
      return
    }

    const keyBuf = await this.getFallbackKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv(AES_ALGO, keyBuf, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    const payload = Buffer.concat([iv, tag, encrypted]).toString('base64')
    secureRepository.set(key, payload, 'aes-gcm')
    log.warn('Stored secure value with AES fallback (OS encryption unavailable)', {
      key
    })
  }

  async get(key: string): Promise<string | null> {
    this.assertKey(key)
    const row = secureRepository.get(key)
    if (!row) return null

    try {
      if (row.encoding === 'safeStorage') {
        if (!this.isEncryptionAvailable()) {
          log.error('safeStorage ciphertext present but OS encryption unavailable', {
            key
          })
          return null
        }
        return safeStorage.decryptString(Buffer.from(row.ciphertext, 'base64'))
      }

      if (row.encoding === 'aes-gcm') {
        const keyBuf = await this.getFallbackKey()
        const raw = Buffer.from(row.ciphertext, 'base64')
        const iv = raw.subarray(0, 12)
        const tag = raw.subarray(12, 28)
        const data = raw.subarray(28)
        const decipher = createDecipheriv(AES_ALGO, keyBuf, iv)
        decipher.setAuthTag(tag)
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
        return decrypted.toString('utf8')
      }

      log.warn('Unknown secure encoding', { key, encoding: row.encoding })
      return null
    } catch (error) {
      log.error('Failed to decrypt secure value', {
        key,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  delete(key: string): boolean {
    this.assertKey(key)
    return secureRepository.delete(key)
  }

  has(key: string): boolean {
    this.assertKey(key)
    return secureRepository.has(key)
  }

  keys(): string[] {
    return secureRepository.keys()
  }

  getMode(): SecureEncodingMode {
    return this.isEncryptionAvailable() ? 'safeStorage' : 'aes-gcm'
  }

  private async getFallbackKey(): Promise<Buffer> {
    if (this.fallbackKey) return this.fallbackKey

    const keyPath = join(app.getPath('userData'), 'data', FALLBACK_KEY_FILE)
    await ensureDir(keyPath)

    let seed: Buffer
    try {
      seed = await readFile(keyPath)
      if (seed.length !== 32) {
        throw new Error('Invalid fallback key length')
      }
    } catch {
      seed = randomBytes(32)
      await writeFile(keyPath, seed, { mode: 0o600 })
      try {
        await chmod(keyPath, 0o600)
      } catch {
        // Windows may ignore chmod
      }
    }

    this.fallbackKey = createHash('sha256')
      .update(seed)
      .update(app.getPath('userData'))
      .update(process.platform)
      .digest()

    return this.fallbackKey
  }

  private assertKey(key: string): void {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('Secure key must be a non-empty string')
    }
    if (key.length > 256) {
      throw new Error('Secure key is too long')
    }
  }
}

export const secureStorageService = new SecureStorageService()
