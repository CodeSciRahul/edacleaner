import { create } from 'zustand'
import { isAppLanguage, type AppLanguage } from '@/i18n/types'
import { translate, type TranslationVars } from '@/i18n'
import type { TranslationKey } from '@/i18n/locales/en'

const STORAGE_KEY = 'eda-cleaner-language'

function readLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isAppLanguage(stored)) return stored
  } catch {
    // ignore
  }
  return 'en'
}

interface LanguageState {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  t: (key: TranslationKey, vars?: TranslationVars) => string
}

export const useLanguageStore = create<LanguageState>((set, get) => {
  const language = readLanguage()

  return {
    language,
    setLanguage: (next) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      document.documentElement.lang = next
      set({ language: next })
    },
    t: (key, vars) => translate(get().language, key, vars)
  }
})

// Sync <html lang> on boot
if (typeof document !== 'undefined') {
  document.documentElement.lang = readLanguage()
}
