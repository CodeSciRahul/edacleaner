import { useCallback } from 'react'
import { electronService } from '@/services/electron-service'

export function useElectron() {
  const app = useCallback(() => electronService.app(), [])
  const system = useCallback(() => electronService.system(), [])
  const file = useCallback(() => electronService.file(), [])
  const dialog = useCallback(() => electronService.dialog(), [])
  const settings = useCallback(() => electronService.settings(), [])
  const updater = useCallback(() => electronService.updater(), [])
  const customApi = useCallback(() => electronService?.customApi(), [])

  return { app, system, file, dialog, settings, updater, customApi }
}
