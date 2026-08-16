import { useCallback, useEffect, useState } from 'react'
import { electronService } from '@/services/electron-service'

export function useWindowControls(): {
  maximized: boolean
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
} {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = (): void => {}

    void (async () => {
      try {
        const current = await electronService.app().isWindowMaximized()
        if (!cancelled) setMaximized(current)
        unsubscribe = electronService.app().onWindowMaximizedChange((next) => {
          setMaximized(next)
        })
      } catch {
        // Running outside Electron — controls remain no-ops.
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const minimize = useCallback(() => {
    void electronService.app().minimizeWindow()
  }, [])

  const toggleMaximize = useCallback(() => {
    void electronService.app().toggleMaximizeWindow()
  }, [])

  const close = useCallback(() => {
    void electronService.app().closeWindow()
  }, [])

  return { maximized, minimize, toggleMaximize, close }
}
