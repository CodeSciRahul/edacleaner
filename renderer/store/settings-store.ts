import { create } from 'zustand'

const STORAGE_KEY = 'eda-cleaner-settings'
const STORAGE_VERSION = 1 as const

export interface AppSettings {
  /** Confirm before running Cleanup optimize */
  confirmBeforeClean: boolean
  /** Pre-select Safe cleanup categories after scan */
  autoSelectSafeCategories: boolean
  /** Restore last Smart Scan results when opening the page */
  restoreLastSmartScan: boolean
  /** Prefer quieter UI animations */
  reduceMotion: boolean
  /** Show success feedback after scans / cleanup */
  showCompletionFeedback: boolean
}

const defaults: AppSettings = {
  confirmBeforeClean: true,
  autoSelectSafeCategories: true,
  restoreLastSmartScan: true,
  reduceMotion: false,
  showCompletionFeedback: true
}

function isBool(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }

    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== 'object') return { ...defaults }

    const data = parsed as Record<string, unknown>
    if (data.version !== STORAGE_VERSION) return { ...defaults }

    return {
      confirmBeforeClean: isBool(data.confirmBeforeClean)
        ? data.confirmBeforeClean
        : defaults.confirmBeforeClean,
      autoSelectSafeCategories: isBool(data.autoSelectSafeCategories)
        ? data.autoSelectSafeCategories
        : defaults.autoSelectSafeCategories,
      restoreLastSmartScan: isBool(data.restoreLastSmartScan)
        ? data.restoreLastSmartScan
        : defaults.restoreLastSmartScan,
      reduceMotion: isBool(data.reduceMotion) ? data.reduceMotion : defaults.reduceMotion,
      showCompletionFeedback: isBool(data.showCompletionFeedback)
        ? data.showCompletionFeedback
        : defaults.showCompletionFeedback
    }
  } catch {
    return { ...defaults }
  }
}

function persist(settings: AppSettings): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, ...settings })
    )
  } catch {
    // private mode / quota
  }
}

interface SettingsState extends AppSettings {
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = readSettings()

  return {
    ...initial,
    setSetting: (key, value) => {
      set({ [key]: value } as Partial<AppSettings>)
      const { setSetting: _s, resetSettings: _r, ...rest } = get()
      persist(rest as AppSettings)
    },
    resetSettings: () => {
      persist(defaults)
      set({ ...defaults })
    }
  }
})
