import { net } from 'electron'

/**
 * HTTP via Chromium's network stack (Electron `net.fetch`).
 *
 * Prefer this over Node's global `fetch` / `dns` in the main process:
 * Node's undici + c-ares is known to SIGTRAP/FATAL on some macOS builds.
 *
 * AbortSignal is honored in JS but not forwarded into `net.fetch` — passing
 * Chromium an aborted signal has caused FATAL NOTREACHED crashes.
 */
export async function chromiumFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const { signal, ...rest } = init

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  const pending = net.fetch(input, rest)

  if (!signal) {
    return pending
  }

  return new Promise<Response>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    pending.then(
      (response) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) {
          onAbort()
          return
        }
        resolve(response)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}
