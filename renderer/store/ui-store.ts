import { create } from 'zustand'

const STORAGE_KEY = 'eda-cleaner-sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === null) return false
    return value === 'true'
  } catch {
    return false
  }
}

interface UiState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: readCollapsed(),
  setSidebarCollapsed: (collapsed) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
    set({ sidebarCollapsed: collapsed })
  },
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
    set({ sidebarCollapsed: next })
  }
}))
