import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '@/store/theme-store'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const syncSystemTheme = useThemeStore((state) => state.syncSystemTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => syncSystemTheme()

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [syncSystemTheme])

  return <>{children}</>
}
