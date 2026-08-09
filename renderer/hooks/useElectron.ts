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
  const boost = useCallback(() => electronService.boost(), [])
  const startup = useCallback(() => electronService.startup(), [])
  const offline = useCallback(() => electronService.offline(), [])
  const sync = useCallback(() => electronService.sync(), [])
  const auth = useCallback(() => electronService.auth(), [])
  const api = useCallback(() => electronService.api(), [])

  return {
    app,
    system,
    file,
    dialog,
    settings,
    updater,
    storage,
    boost,
    startup,
    offline,
    sync,
    auth,
    api
  }
}
