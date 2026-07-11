import { app, nativeImage } from 'electron'

/**
 * Resolve a filesystem path suitable for Electron's getFileIcon.
 */
export function extractIconPath(location: string): string | null {
  const quoted = location.match(/^"([^"]+\.(exe|app|lnk|dll))"/i)
  if (quoted) return quoted[1]

  const unquoted = location.match(/^([^\s"]+\.(exe|app|lnk|dll))/i)
  if (unquoted) return unquoted[1]

  if (/^\/.+\.app(\/|$)/i.test(location)) {
    const appMatch = location.match(/^(\/.+?\.app)/i)
    return appMatch ? appMatch[1] : location
  }

  if (location.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(location)) {
    return location.split(/\s+/)[0] ?? null
  }

  return null
}

export async function tryGetIconDataUrl(location: string): Promise<string | undefined> {
  const iconPath = extractIconPath(location)
  if (!iconPath) return undefined

  try {
    const image = await app.getFileIcon(iconPath, { size: 'normal' })
    if (image.isEmpty()) return undefined
    return image.toDataURL()
  } catch {
    try {
      const image = nativeImage.createFromPath(iconPath)
      if (image.isEmpty()) return undefined
      return image.toDataURL()
    } catch {
      return undefined
    }
  }
}
