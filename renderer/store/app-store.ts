import { create } from 'zustand'
import { APP_NAME } from '@shared/constants'

interface AppState {
  appName: string
  isReady: boolean
  setReady: (ready: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  appName: APP_NAME,
  isReady: false,
  setReady: (ready) => set({ isReady: ready })
}))
