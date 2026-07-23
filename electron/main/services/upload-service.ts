import axios from 'axios'
import { createReadStream } from 'fs'
import { access, stat } from 'fs/promises'
import { basename, extname } from 'path'
import { constants } from 'fs'
import { createLogger } from '@main/utils/logger'
import type { UploadFileOptions, UploadFileResult } from '@shared/interfaces'

const log = createLogger('UploadService')

const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1'

const EXT_CONTENT_TYPES: Record<string, string> = {
  '.apk': 'application/vnd.android.package-archive',
  '.bin': 'application/octet-stream',
  '.dmg': 'application/x-apple-diskimage',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.gz': 'application/gzip',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
  '.log': 'text/plain',
  '.msi': 'application/x-msi',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.zip': 'application/zip'
}

interface PresignResponseBody {
  success: boolean
  message?: string
  data?: {
    uploadUrl: string
    key: string
    bucket: string
    contentType: string
    expiresIn: number
  }
}

function resolveApiBaseUrl(): string {
  const fromEnv =
    typeof import.meta.env.MAIN_VITE_API_BASE_URL === 'string'
      ? import.meta.env.MAIN_VITE_API_BASE_URL
      : undefined
  return (fromEnv?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

function guessContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return EXT_CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

export function validateUploadOptions(input: unknown): UploadFileOptions {
  if (input == null || typeof input !== 'object') {
    throw new Error('Invalid upload options')
  }

  const raw = input as Record<string, unknown>

  if (typeof raw.filePath !== 'string' || !raw.filePath.trim()) {
    throw new Error('filePath is required')
  }

  const options: UploadFileOptions = {
    filePath: raw.filePath.trim()
  }

  if (typeof raw.contentType === 'string' && raw.contentType.trim()) {
    options.contentType = raw.contentType.trim()
  }

  if (typeof raw.prefix === 'string' && raw.prefix.trim()) {
    options.prefix = raw.prefix.trim()
  }

  if (typeof raw.authToken === 'string' && raw.authToken.trim()) {
    options.authToken = raw.authToken.trim()
  }

  return options
}

export class UploadService {
  async uploadFile(rawOptions: unknown): Promise<UploadFileResult> {
    const options = validateUploadOptions(rawOptions)
    const filePath = options.filePath

    try {
      await access(filePath, constants.R_OK)
    } catch {
      throw new Error(`File not found or not readable: ${filePath}`)
    }

    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`)
    }

    const fileName = basename(filePath)
    const contentType = options.contentType ?? guessContentType(filePath)
    const apiBase = resolveApiBaseUrl()

    log.info('Requesting presigned upload URL', {
      fileName,
      contentType,
      size: fileStat.size
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
    if (options.authToken) {
      headers.Authorization = `Bearer ${options.authToken}`
    }

    const body: Record<string, string> = {
      fileName,
      contentType
    }
    if (options.prefix) {
      body.prefix = options.prefix
    }

    let presignJson: PresignResponseBody
    try {
      const presignRes = await axios.post<PresignResponseBody>(
        `${apiBase}/uploads/presign`,
        body,
        { headers, timeout: 30_000 }
      )
      presignJson = presignRes.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const apiMessage =
          (err.response?.data as PresignResponseBody | undefined)?.message ??
          err.message
        throw new Error(`Failed to get upload URL: ${apiMessage}`)
      }
      throw err
    }

    if (!presignJson.success || !presignJson.data) {
      throw new Error(presignJson.message ?? 'Failed to get upload URL')
    }

    const { uploadUrl, key, bucket, contentType: signedContentType } = presignJson.data

    log.info('Uploading file to S3', { key, bucket, bytes: fileStat.size })

    try {
      const putRes = await axios.put(uploadUrl, createReadStream(filePath), {
        headers: {
          'Content-Type': signedContentType,
          'Content-Length': fileStat.size
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0
      })

      const etagHeader = putRes.headers.etag
      const etag =
        typeof etagHeader === 'string' ? etagHeader.replaceAll('"', '') : undefined

      log.info('Upload complete', { key, etag })

      return {
        key,
        bucket,
        contentType: signedContentType,
        bytesUploaded: fileStat.size,
        ...(etag ? { etag } : {})
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail =
          typeof err.response?.data === 'string'
            ? err.response.data.slice(0, 200)
            : err.message
        throw new Error(`S3 upload failed: ${detail}`)
      }
      throw err
    }
  }
}

export const uploadService = new UploadService()
