import { useCallback } from 'react'
import { electronService } from '@/services/electron-service'

export function useElectron() {
  const app = useCallback(() => electronService.app(), [])
  const system = useCallback(() => electronService.system(), [])
  const file = useCallback(() => electronService.file(), [])
  const dialog = useCallback(() => electronService.dialog(), [])
  const settings = useCallback(() => electronService.settings(), [])
  const updater = useCallback(() => electronService.updater(), [])
  const storage = useCallback(() => electronService.storage(), [])

  return { app, system, file, dialog, settings, updater, storage }
}
