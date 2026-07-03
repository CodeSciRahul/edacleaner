import { create } from 'zustand'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'eda-cleaner-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(preference: ThemePreference): void {
  const resolved = preference === 'system' ? getSystemTheme() : preference
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'system'
}

interface ThemeState {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
  syncSystemTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const preference = readStoredTheme()
  const resolved = preference === 'system' ? getSystemTheme() : preference
  applyThemeClass(preference)

  return {
    preference,
    resolved,
    setPreference: (next) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore persistence failures
      }
      applyThemeClass(next)
      set({
        preference: next,
        resolved: next === 'system' ? getSystemTheme() : next
      })
    },
    syncSystemTheme: () => {
      const current = get().preference
      if (current !== 'system') return
      applyThemeClass('system')
      set({ resolved: getSystemTheme() })
    }
  }
})
