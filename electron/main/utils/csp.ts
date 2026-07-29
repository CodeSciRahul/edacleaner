import { configManager } from '@main/config'

export function getContentSecurityPolicy(): string {
  const isDev = configManager.isDevelopment()

  if (isDev) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data:",
      "connect-src 'self' ws://localhost:* http://localhost:*"
    ].join('; ')
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data:"
  ].join('; ')
}
