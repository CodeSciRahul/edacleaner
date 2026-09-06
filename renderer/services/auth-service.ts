import type {
  AuthCredentials,
  AuthSessionChangedEvent,
  AuthSessionSnapshot,
  CachedSubscription
} from '@shared/interfaces'
import { electronService } from './electron-service'

/**
 * Renderer facade for offline-capable auth + subscription session.
 * All persistence and token refresh happen in the main process.
 */
export const authService = {
  login: (credentials: AuthCredentials) => electronService.auth().login(credentials),
  register: (credentials: AuthCredentials) =>
    electronService.auth().register(credentials),
  requestLoginOtp: (email: string) => electronService.auth().requestLoginOtp(email),
  verifyLoginOtp: (email: string, code: string) =>
    electronService.auth().verifyLoginOtp(email, code),
  forgotPassword: (email: string) => electronService.auth().forgotPassword(email),
  resetPassword: (input: { email: string; code: string; password: string }) =>
    electronService.auth().resetPassword(input),
  setPassword: (password: string) => electronService.auth().setPassword(password),
  logout: () => electronService.auth().logout(),
  getSession: () => electronService.auth().getSession(),
  sync: (reason?: string) => electronService.auth().sync(reason),
  refresh: () => electronService.auth().refresh(),
  hasPermission: (permission: string) =>
    electronService.auth().hasPermission(permission),
  getSubscription: () => electronService.auth().getSubscription(),
  openWindow: (mode?: 'login' | 'register') => electronService.auth().openWindow(mode),
  onSessionChanged: (callback: (event: AuthSessionChangedEvent) => void) =>
    electronService.auth().onSessionChanged(callback)
}

export type {
  AuthCredentials,
  AuthSessionSnapshot,
  AuthSessionChangedEvent,
  CachedSubscription
}
