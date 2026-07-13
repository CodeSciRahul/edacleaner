import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '@/store/theme-store'
import { useSettingsStore } from '@/store/settings-store'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const syncSystemTheme = useThemeStore((state) => state.syncSystemTheme)
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => syncSystemTheme()

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [syncSystemTheme])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])

  return <>{children}</>
}
