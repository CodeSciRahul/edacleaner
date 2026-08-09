import { app } from 'electron'
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const SENSITIVE_KEY =
  /^(authorization|cookie|password|passwd|secret|token|refreshToken|accessToken|api[_-]?key|private[_-]?key)$/i

function minLevel(): LogLevel {
  const raw = (process.env.EDA_LOG_LEVEL ?? '').toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw
  }
  return app.isPackaged ? 'info' : 'debug'
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel()]
}

/** Deep-redact secrets from objects before logging. */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[Truncated]'
  if (value == null) return value
  if (typeof value === 'string') {
    if (value.length > 500) return `${value.slice(0, 120)}…[len=${value.length}]`
    if (/^Bearer\s+/i.test(value)) return 'Bearer [REDACTED]'
    return value
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactForLog(item, depth + 1))
  }

  const out: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactForLog(nested, depth + 1)
  }
  return out
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: app.isPackaged ? undefined : arg.stack
      }
    }
    if (arg && typeof arg === 'object') return redactForLog(arg)
    return arg
  })
}

let fileSinkReady: Promise<string | null> | null = null

async function resolveLogFile(): Promise<string | null> {
  try {
    if (!app.isReady()) return null
    const dir = join(app.getPath('userData'), 'logs')
    await mkdir(dir, { recursive: true })
    return join(dir, 'main.log')
  } catch {
    return null
  }
}

function writeFileLine(level: LogLevel, scope: string, args: unknown[]): void {
  const enableFile = app.isPackaged || process.env.EDA_LOG_FILE === '1'
  if (!enableFile) return

  fileSinkReady ??= resolveLogFile()
  void fileSinkReady.then(async (path) => {
    if (!path) return
    const line =
      JSON.stringify({
        t: new Date().toISOString(),
        level,
        scope,
        args: formatArgs(args)
      }) + '\n'
    try {
      await appendFile(path, line, 'utf8')
    } catch {
      // Never throw from logging.
    }
  })
}

export function createLogger(scope: string) {
  const prefix = `[${scope}]`

  const emit = (level: LogLevel, args: unknown[]): void => {
    if (!shouldLog(level)) return
    const formatted = formatArgs(args)
    const consoleFn =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log
    consoleFn(prefix, ...formatted)
    writeFileLine(level, scope, args)
  }

  return {
    info: (...args: unknown[]) => emit('info', args),
    warn: (...args: unknown[]) => emit('warn', args),
    error: (...args: unknown[]) => emit('error', args),
    debug: (...args: unknown[]) => emit('debug', args)
  }
}
