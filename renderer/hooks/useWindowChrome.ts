import { useCallback, useEffect, useState } from 'react'
import { electronService } from '@/services/electron-service'

export type WindowPlatform = 'darwin' | 'win32' | 'linux' | 'unknown'

function normalizePlatform(value: string | undefined): WindowPlatform {
  if (value === 'darwin' || value === 'win32' || value === 'linux') return value
  return 'unknown'
}

export function useWindowChrome() {
  const [platform, setPlatform] = useState<WindowPlatform>('unknown')
  const [maximized, setMaximized] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | undefined

    async function bootstrap(): Promise<void> {
      try {
        const api = electronService.window()
        const appApi = electronService.app()
        const [platformValue, isMax] = await Promise.all([
          appApi.getPlatform(),
          api.isMaximized()
        ])
        if (disposed) return
        setPlatform(normalizePlatform(platformValue))
        setMaximized(isMax)
        unsubscribe = api.onMaximizedChange((next) => {
          if (!disposed) setMaximized(next)
        })
      } catch {
        if (!disposed) setPlatform('unknown')
      } finally {
        if (!disposed) setReady(true)
      }
    }

    void bootstrap()

    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [])

  const minimize = useCallback(async () => {
    await electronService.window().minimize()
  }, [])

  const toggleMaximize = useCallback(async () => {
    const next = await electronService.window().maximize()
    setMaximized(next)
  }, [])

  const close = useCallback(async () => {
    await electronService.window().close()
  }, [])

  return {
    platform,
    maximized,
    ready,
    isMac: platform === 'darwin',
    showCustomControls: platform === 'win32' || platform === 'linux',
    minimize,
    toggleMaximize,
    close
  }
}
