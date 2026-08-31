import { BrowserWindow } from 'electron'
import { createLogger } from '@main/utils/logger'
import { IPC_CHANNELS } from '@shared/constants'
import { apiClient, ApiError } from '@main/services/api'
import { connectivityService } from '@main/services/offline/connectivity-service'
import { localStorageService } from '@main/services/offline/local-storage-service'
import { secureStorageService } from '@main/services/offline/secure-storage-service'
import { subscriptionSessionService } from './subscription-session.service'
import type {
  AuthCredentials,
  AuthSessionChangedEvent,
  AuthSessionSnapshot,
  AuthUserProfile,
  CachedSubscription
} from '@shared/interfaces'
import { normalizeEmailInput } from '@shared/utils'

const log = createLogger('AuthSession')

const SECURE_ACCESS = 'auth.accessToken'
const SECURE_REFRESH = 'auth.refreshToken'
const NS = 'auth'
const KEY_PROFILE = 'profile'
const KEY_PERMISSIONS = 'permissions'
const KEY_ACCESS_EXPIRES = 'accessExpiresAt'
const KEY_REFRESH_EXPIRES = 'refreshExpiresAt'
const KEY_LAST_SYNCED = 'lastSyncedAt'
const KEY_HAS_SESSION = 'hasSession'

const ACCESS_REFRESH_SKEW_MS = 60_000

interface ServerAuthPayload {
  token?: string
  accessToken?: string
  refreshToken?: string
  accessExpiresAt?: string
  refreshExpiresAt?: string
  user?: {
    id?: string
    email?: string
    name?: string
    trialUsed?: boolean
    mustSetPassword?: boolean
  }
  subscription?: Partial<CachedSubscription> & {
    currentPlan?: string
    status?: string
  }
  permissions?: string[]
}

interface ServerMePayload {
  id?: string
  email?: string
  name?: string
  trialUsed?: boolean
  mustSetPassword?: boolean
  subscription?: Partial<CachedSubscription> & {
    currentPlan?: string
    status?: string
  }
  permissions?: string[]
}

/**
 * Offline-capable authentication session.
 *
 * Persists JWT + refresh token (secure), profile / permissions / subscription (local).
 * Offline: keeps the user authenticated until refresh expiry.
 * Online: auto-refreshes access tokens and syncs subscription status.
 */
export class AuthSessionService {
  private refreshInFlight: Promise<boolean> | null = null
  private unsubscribeConnectivity: (() => void) | null = null
  private onlineDebounce: NodeJS.Timeout | null = null
  private wired = false

  /** Wire ApiClient auth handlers + online sync. Call once after offline foundation. */
  initialize(): void {
    if (this.wired) return
    this.wired = true

    apiClient.setAuthHandlers({
      getAccessToken: () => this.getAccessToken(),
      refreshAccessToken: () => this.refreshTokens()
    })

    this.unsubscribeConnectivity = connectivityService.onChange((snapshot) => {
      if (!snapshot.online) return
      if (this.onlineDebounce) clearTimeout(this.onlineDebounce)
      this.onlineDebounce = setTimeout(() => {
        void this.onConnectivityRestored()
      }, 1_200)
      this.onlineDebounce.unref?.()
    })

    if (connectivityService.isOnline() && this.isAuthenticated()) {
      void this.onConnectivityRestored()
    }

    log.info('Auth session service initialized', {
      authenticated: this.isAuthenticated()
    })
  }

  dispose(): void {
    this.unsubscribeConnectivity?.()
    this.unsubscribeConnectivity = null
    if (this.onlineDebounce) clearTimeout(this.onlineDebounce)
    this.onlineDebounce = null
    this.refreshInFlight = null
    this.wired = false
    try {
      // Lazy to avoid circular import at module load.
      void import('@main/services/api').then(({ apiClient }) => {
        apiClient.setAuthHandlers(null)
      })
    } catch {
      // ignore
    }
    log.info('Auth session service disposed')
  }

  isAuthenticated(): boolean {
    const hasSession = localStorageService.get<boolean>(KEY_HAS_SESSION, false, NS)
    if (!hasSession) return false

    const profile = this.getProfile()
    if (!profile) return false

    const refreshExpires = this.getRefreshExpiresAt()
    if (refreshExpires && refreshExpires.getTime() <= Date.now()) {
      return false
    }

    // Offline / temporary outage: profile + non-expired refresh is enough.
    return true
  }

  getSession(): AuthSessionSnapshot {
    const authenticated = this.isAuthenticated()
    return {
      authenticated,
      offline: !connectivityService.isOnline(),
      user: authenticated ? this.getProfile() : null,
      subscription: authenticated ? subscriptionSessionService.getCached() : null,
      permissions: authenticated ? this.getPermissions() : [],
      accessExpiresAt: localStorageService.get<string>(KEY_ACCESS_EXPIRES, undefined, NS) ?? null,
      refreshExpiresAt:
        localStorageService.get<string>(KEY_REFRESH_EXPIRES, undefined, NS) ?? null,
      lastSyncedAt: localStorageService.get<number>(KEY_LAST_SYNCED, undefined, NS) ?? null
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.isAuthenticated()) return null
    return secureStorageService.get(SECURE_ACCESS)
  }

  async login(credentials: AuthCredentials): Promise<AuthSessionSnapshot> {
    if (!credentials.email?.trim()) {
      throw new Error('Email is required')
    }
    try {
      const response = await apiClient.post<
        ServerAuthPayload & { requiresOtp?: boolean; requiresPassword?: boolean }
      >(
        '/auth/login',
        {
          email: normalizeEmailInput(credentials.email),
          ...(credentials.password ? { password: credentials.password } : {})
        },
        {
          skipAuth: true,
          skipAuthRefresh: true,
          skipOfflineQueue: true,
          skipOfflineCache: true
        }
      )
      if (this.isOtpChallenge(response.data)) {
        throw new Error('OTP_REQUIRED')
      }
      if (this.isPasswordChallenge(response.data)) {
        throw new Error('PASSWORD_REQUIRED')
      }
      await this.persistAuthPayload(response.data)
    } catch (err) {
      if (err instanceof Error && err.message === 'OTP_REQUIRED') throw err
      if (err instanceof Error && err.message === 'PASSWORD_REQUIRED') throw err
      if (err instanceof ApiError && /password is required/i.test(err.message)) {
        throw new Error('PASSWORD_REQUIRED')
      }
      throw err
    }
    await this.syncSubscriptionStatus().catch((err) => {
      log.warn('Post-login subscription sync failed — using login payload cache', {
        error: err instanceof Error ? err.message : String(err)
      })
    })
    this.emitChanged('login')
    return this.getSession()
  }

  async requestLoginOtp(email: string): Promise<{ requiresOtp: true }> {
    const trimmed = normalizeEmailInput(email)
    if (!trimmed) throw new Error('Email is required')
    await apiClient.post(
      '/auth/otp/request',
      { email: trimmed },
      {
        skipAuth: true,
        skipAuthRefresh: true,
        skipOfflineQueue: true,
        skipOfflineCache: true
      }
    )
    return { requiresOtp: true }
  }

  async verifyLoginOtp(email: string, code: string): Promise<AuthSessionSnapshot> {
    const response = await apiClient.post<ServerAuthPayload>(
      '/auth/otp/verify',
      {
        email: normalizeEmailInput(email),
        code: code.trim()
      },
      {
        skipAuth: true,
        skipAuthRefresh: true,
        skipOfflineQueue: true,
        skipOfflineCache: true
      }
    )
    await this.persistAuthPayload(response.data)
    await this.syncSubscriptionStatus().catch((err) => {
      log.warn('Post-OTP subscription sync failed — using login payload cache', {
        error: err instanceof Error ? err.message : String(err)
      })
    })
    this.emitChanged('login')
    return this.getSession()
  }

  async setPassword(password: string): Promise<AuthSessionSnapshot> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
    await apiClient.post(
      '/auth/set-password',
      { password },
      {
        skipOfflineQueue: true,
        skipOfflineCache: true
      }
    )
    const profile = this.getProfile()
    if (profile) {
      localStorageService.set(
        KEY_PROFILE,
        { ...profile, mustSetPassword: false },
        NS
      )
    }
    this.emitChanged('set-password')
    return this.getSession()
  }

  async register(credentials: AuthCredentials): Promise<AuthSessionSnapshot> {
    this.assertCredentials(credentials)
    const body: Record<string, string> = {
      email: normalizeEmailInput(credentials.email),
      password: credentials.password ?? ''
    }
    if (credentials.name?.trim()) body.name = credentials.name.trim()

    const response = await apiClient.post<ServerAuthPayload>(
      '/auth/register',
      body,
      {
        skipAuth: true,
        skipAuthRefresh: true,
        skipOfflineQueue: true,
        skipOfflineCache: true
      }
    )
    await this.persistAuthPayload(response.data)
    await this.syncSubscriptionStatus().catch((err) => {
      log.warn('Post-register subscription sync failed — using register payload cache', {
        error: err instanceof Error ? err.message : String(err)
      })
    })
    this.emitChanged('register')
    return this.getSession()
  }

  async logout(): Promise<AuthSessionSnapshot> {
    const refreshToken = await secureStorageService.get(SECURE_REFRESH)
    if (refreshToken && connectivityService.isOnline()) {
      try {
        await apiClient.post(
          '/auth/logout',
          { refreshToken },
          {
            skipAuth: true,
            skipAuthRefresh: true,
            skipOfflineQueue: true,
            skipOfflineCache: true
          }
        )
      } catch (err) {
        log.warn('Server logout failed — clearing local session anyway', {
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    await this.clearLocalSession()
    this.emitChanged('logout')
    return this.getSession()
  }

  /**
   * Refresh access (+ rotated refresh) when online.
   * Returns false offline or when refresh fails (session may still be valid locally until refresh expiry).
   */
  async refreshTokens(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight

    this.refreshInFlight = this.doRefreshTokens().finally(() => {
      this.refreshInFlight = null
    })
    return this.refreshInFlight
  }

  /** Ensure access token is usable before authenticated API calls. */
  async ensureFreshAccessToken(): Promise<string | null> {
    if (!this.isAuthenticated()) return null

    if (!connectivityService.isOnline()) {
      return this.getAccessToken()
    }

    const accessExpires = this.getAccessExpiresAt()
    const needsRefresh =
      !accessExpires ||
      accessExpires.getTime() - Date.now() <= ACCESS_REFRESH_SKEW_MS

    if (needsRefresh) {
      const ok = await this.refreshTokens()
      if (!ok) {
        // Soft-fail: still return existing access token for grace / offline-ish failures
        return this.getAccessToken()
      }
    }

    return this.getAccessToken()
  }

  /** Pull /auth/me + /subscription/status when online; no-op offline. */
  async synchronizeSession(reason = 'manual'): Promise<AuthSessionSnapshot> {
    if (!this.isAuthenticated()) return this.getSession()

    if (!connectivityService.isOnline()) {
      log.info('Skipping session sync while offline', { reason })
      return this.getSession()
    }

    await this.ensureFreshAccessToken()

    try {
      const me = await apiClient.get<ServerMePayload>('/auth/me', {
        skipOfflineQueue: true,
        cache: { ttlMs: 60_000, key: 'auth:me' }
      })
      this.applyMePayload(me.data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        log.warn('Session rejected by server — clearing local auth')
        await this.clearLocalSession()
        this.emitChanged('session-invalid')
        return this.getSession()
      }
      log.warn('Failed to sync /auth/me — keeping local cache', {
        error: err instanceof Error ? err.message : String(err)
      })
    }

    await this.syncSubscriptionStatus().catch((err) => {
      log.warn('Subscription sync failed — keeping local cache', {
        error: err instanceof Error ? err.message : String(err)
      })
    })

    localStorageService.set(KEY_LAST_SYNCED, Date.now(), NS)
    this.emitChanged(reason)
    return this.getSession()
  }

  async syncSubscriptionStatus(): Promise<CachedSubscription | null> {
    if (!this.isAuthenticated()) return null
    if (!connectivityService.isOnline()) {
      return subscriptionSessionService.getCached()
    }

    const response = await apiClient.get<
      Partial<CachedSubscription> & { currentPlan?: string; status?: string }
    >('/subscription/status', {
      skipOfflineQueue: true,
      cache: { ttlMs: 60_000, key: 'subscription:status' }
    })

    const data = response.data
    if (!data?.currentPlan || !data.status) {
      return subscriptionSessionService.getCached()
    }

    const cached = subscriptionSessionService.save({
      currentPlan: data.currentPlan,
      status: data.status,
      cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      pendingPlan: data.pendingPlan ?? null,
      trialStart: data.trialStart ?? null,
      trialEnd: data.trialEnd ?? null,
      currentPeriodStart: data.currentPeriodStart ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      features: Array.isArray(data.features) ? data.features : [],
      isPaid: Boolean(data.isPaid),
      hasActiveAccess: Boolean(data.hasActiveAccess),
      billingInterval:
        typeof (data as { billingInterval?: unknown }).billingInterval === 'string'
          ? String((data as { billingInterval: string }).billingInterval)
          : null
    })

    if (Array.isArray(data.features)) {
      localStorageService.set(
        KEY_PERMISSIONS,
        this.permissionsFromFeatures(data.features),
        NS
      )
    }

    return cached
  }

  hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission)
  }

  private async onConnectivityRestored(): Promise<void> {
    if (!this.isAuthenticated()) return
    log.info('Connectivity restored — refreshing tokens and subscription')
    await this.refreshTokens()
    await this.synchronizeSession('connectivity-restored')
  }

  private async doRefreshTokens(): Promise<boolean> {
    if (!connectivityService.isOnline()) {
      log.info('Token refresh skipped — offline')
      return false
    }

    const refreshToken = await secureStorageService.get(SECURE_REFRESH)
    if (!refreshToken) {
      log.warn('No refresh token stored')
      return false
    }

    const refreshExpires = this.getRefreshExpiresAt()
    if (refreshExpires && refreshExpires.getTime() <= Date.now()) {
      log.warn('Refresh token expired — session requires login')
      await this.clearLocalSession()
      this.emitChanged('refresh-expired')
      return false
    }

    try {
      const response = await apiClient.post<ServerAuthPayload>(
        '/auth/refresh',
        { refreshToken },
        {
          skipAuth: true,
          skipAuthRefresh: true,
          skipOfflineQueue: true,
          skipOfflineCache: true
        }
      )
      await this.persistAuthPayload(response.data, { mergeProfile: true })
      this.emitChanged('token-refreshed')
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        log.warn('Refresh rejected — clearing session')
        await this.clearLocalSession()
        this.emitChanged('refresh-rejected')
        return false
      }
      log.warn('Token refresh failed — keeping local session', {
        error: err instanceof Error ? err.message : String(err)
      })
      return false
    }
  }

  private async persistAuthPayload(
    payload: ServerAuthPayload,
    options: { mergeProfile?: boolean } = {}
  ): Promise<void> {
    const access =
      (typeof payload.accessToken === 'string' && payload.accessToken) ||
      (typeof payload.token === 'string' && payload.token) ||
      ''
    const refresh =
      typeof payload.refreshToken === 'string' ? payload.refreshToken : ''

    if (!access || !refresh) {
      throw new Error('Auth response missing access or refresh token')
    }

    await secureStorageService.set(SECURE_ACCESS, access)
    await secureStorageService.set(SECURE_REFRESH, refresh)
    localStorageService.set(KEY_HAS_SESSION, true, NS)

    if (payload.accessExpiresAt) {
      localStorageService.set(KEY_ACCESS_EXPIRES, payload.accessExpiresAt, NS)
    }
    if (payload.refreshExpiresAt) {
      localStorageService.set(KEY_REFRESH_EXPIRES, payload.refreshExpiresAt, NS)
    }

    if (payload.user?.id && payload.user.email) {
      const profile: AuthUserProfile = {
        id: payload.user.id,
        email: payload.user.email,
        name: typeof payload.user.name === 'string' ? payload.user.name : '',
        trialUsed: Boolean(payload.user.trialUsed),
        mustSetPassword: Boolean(payload.user.mustSetPassword)
      }
      localStorageService.set(KEY_PROFILE, profile, NS)
    } else if (!options.mergeProfile && !this.getProfile()) {
      throw new Error('Auth response missing user profile')
    }

    if (Array.isArray(payload.permissions)) {
      localStorageService.set(KEY_PERMISSIONS, payload.permissions, NS)
    }

    if (payload.subscription?.currentPlan && payload.subscription.status) {
      subscriptionSessionService.save({
        currentPlan: payload.subscription.currentPlan,
        status: payload.subscription.status,
        cancelAtPeriodEnd: Boolean(payload.subscription.cancelAtPeriodEnd),
        pendingPlan: payload.subscription.pendingPlan ?? null,
        trialStart: payload.subscription.trialStart ?? null,
        trialEnd: payload.subscription.trialEnd ?? null,
        currentPeriodStart: payload.subscription.currentPeriodStart ?? null,
        currentPeriodEnd: payload.subscription.currentPeriodEnd ?? null,
        features: Array.isArray(payload.subscription.features)
          ? payload.subscription.features
          : [],
        isPaid: Boolean(payload.subscription.isPaid),
        hasActiveAccess: Boolean(payload.subscription.hasActiveAccess),
        billingInterval:
          typeof payload.subscription.billingInterval === 'string'
            ? payload.subscription.billingInterval
            : null
      })

      if (
        !payload.permissions &&
        Array.isArray(payload.subscription.features)
      ) {
        localStorageService.set(
          KEY_PERMISSIONS,
          this.permissionsFromFeatures(payload.subscription.features),
          NS
        )
      }
    } else if (!subscriptionSessionService.getCached()) {
      // Safety net: new accounts are Free by default even if status sync is delayed.
      subscriptionSessionService.save({
        currentPlan: 'free',
        status: 'active',
        cancelAtPeriodEnd: false,
        pendingPlan: null,
        trialStart: null,
        trialEnd: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        features: [],
        isPaid: false,
        hasActiveAccess: true,
        billingInterval: 'month'
      })
    }

    localStorageService.set(KEY_LAST_SYNCED, Date.now(), NS)
  }

  private applyMePayload(data: ServerMePayload): void {
    if (data.id && data.email) {
      const profile: AuthUserProfile = {
        id: data.id,
        email: data.email,
        name: typeof data.name === 'string' ? data.name : '',
        trialUsed: Boolean(data.trialUsed),
        mustSetPassword: Boolean(data.mustSetPassword)
      }
      localStorageService.set(KEY_PROFILE, profile, NS)
    }

    if (Array.isArray(data.permissions)) {
      localStorageService.set(KEY_PERMISSIONS, data.permissions, NS)
    }

    if (data.subscription?.currentPlan && data.subscription.status) {
      subscriptionSessionService.save({
        currentPlan: data.subscription.currentPlan,
        status: data.subscription.status,
        cancelAtPeriodEnd: Boolean(data.subscription.cancelAtPeriodEnd),
        pendingPlan: data.subscription.pendingPlan ?? null,
        trialStart: data.subscription.trialStart ?? null,
        trialEnd: data.subscription.trialEnd ?? null,
        currentPeriodStart: data.subscription.currentPeriodStart ?? null,
        currentPeriodEnd: data.subscription.currentPeriodEnd ?? null,
        features: Array.isArray(data.subscription.features)
          ? data.subscription.features
          : [],
        isPaid: Boolean(data.subscription.isPaid),
        hasActiveAccess: Boolean(data.subscription.hasActiveAccess),
        billingInterval:
          typeof data.subscription.billingInterval === 'string'
            ? data.subscription.billingInterval
            : null
      })
    }
  }

  private async clearLocalSession(): Promise<void> {
    await secureStorageService.delete(SECURE_ACCESS)
    await secureStorageService.delete(SECURE_REFRESH)
    localStorageService.delete(KEY_HAS_SESSION, NS)
    localStorageService.delete(KEY_PROFILE, NS)
    localStorageService.delete(KEY_PERMISSIONS, NS)
    localStorageService.delete(KEY_ACCESS_EXPIRES, NS)
    localStorageService.delete(KEY_REFRESH_EXPIRES, NS)
    localStorageService.delete(KEY_LAST_SYNCED, NS)
    subscriptionSessionService.clear()
  }

  private getProfile(): AuthUserProfile | null {
    return localStorageService.get<AuthUserProfile>(KEY_PROFILE, undefined, NS) ?? null
  }

  private getPermissions(): string[] {
    const perms = localStorageService.get<string[]>(KEY_PERMISSIONS, undefined, NS)
    return Array.isArray(perms) ? perms : []
  }

  private getAccessExpiresAt(): Date | null {
    const raw = localStorageService.get<string>(KEY_ACCESS_EXPIRES, undefined, NS)
    if (!raw) return null
    const t = Date.parse(raw)
    return Number.isFinite(t) ? new Date(t) : null
  }

  private getRefreshExpiresAt(): Date | null {
    const raw = localStorageService.get<string>(KEY_REFRESH_EXPIRES, undefined, NS)
    if (!raw) return null
    const t = Date.parse(raw)
    return Number.isFinite(t) ? new Date(t) : null
  }

  private permissionsFromFeatures(features: string[]): string[] {
    const permissions = new Set<string>(['app:use', 'scan:smart', 'cleanup:basic'])
    for (const feature of features) {
      const key = feature
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
      if (key) permissions.add(`feature:${key}`)
    }
    return [...permissions]
  }

  private isOtpChallenge(
    data: ServerAuthPayload & { requiresOtp?: boolean; requiresPassword?: boolean }
  ): boolean {
    return (
      data.requiresOtp === true &&
      !data.accessToken &&
      !data.token &&
      !data.refreshToken
    )
  }

  private isPasswordChallenge(
    data: ServerAuthPayload & { requiresOtp?: boolean; requiresPassword?: boolean }
  ): boolean {
    return (
      data.requiresPassword === true &&
      !data.accessToken &&
      !data.token &&
      !data.refreshToken
    )
  }

  private assertCredentials(credentials: AuthCredentials): void {
    if (!credentials.email?.trim() || !credentials.password) {
      throw new Error('Email and password are required')
    }
  }

  private emitChanged(reason: string): void {
    const event: AuthSessionChangedEvent = {
      session: this.getSession(),
      reason
    }
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents.isDestroyed()) continue
      win.webContents.send(IPC_CHANNELS.AUTH.SESSION_CHANGED, event)
    }
  }
}

export const authSessionService = new AuthSessionService()
