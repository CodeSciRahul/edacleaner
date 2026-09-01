export const APP_NAME = 'EDA Cleaner'
export const APP_ID = 'com.edacleaner.app'
/** Custom URL scheme used for Stripe return → desktop handoff. */
export const DEEP_LINK_PROTOCOL = 'edacleaner'

export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'app:get-version',
    GET_PLATFORM: 'app:get-platform',
    QUIT: 'app:quit',
    RELAUNCH: 'app:relaunch',
    GET_PATH: 'app:get-path',
    OPEN_EXTERNAL: 'app:open-external',
    DEEP_LINK: 'app:deep-link',
    WINDOW_MINIMIZE: 'app:window-minimize',
    WINDOW_TOGGLE_MAXIMIZE: 'app:window-toggle-maximize',
    WINDOW_CLOSE: 'app:window-close',
    WINDOW_IS_MAXIMIZED: 'app:window-is-maximized',
    WINDOW_MAXIMIZED_CHANGED: 'app:window-maximized-changed',
    WINDOW_SET_LAYOUT: 'app:window-set-layout'
  },
  SYSTEM: {
    GET_INFO: 'system:get-info',
    GET_MEMORY: 'system:get-memory',
    GET_METRICS_SAMPLE: 'system:get-metrics-sample',
    START_METRICS_WATCH: 'system:start-metrics-watch',
    STOP_METRICS_WATCH: 'system:stop-metrics-watch',
    METRICS_UPDATE: 'system:metrics-update'
  },
  FILE: {
    OPEN: 'file:open',
    SAVE: 'file:save',
    READ: 'file:read',
    WRITE: 'file:write',
    EXISTS: 'file:exists'
  },
  DIALOG: {
    OPEN: 'dialog:open',
    SAVE: 'dialog:save',
    MESSAGE: 'dialog:message',
    ERROR: 'dialog:error'
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    GET_ALL: 'settings:get-all',
    RESET: 'settings:reset'
  },
  UPDATER: {
    CHECK: 'updater:check',
    DOWNLOAD: 'updater:download',
    INSTALL: 'updater:install',
    GET_STATUS: 'updater:get-status'
  },
  STORAGE: {
    GET_DRIVES: 'storage:get-drives',
    ANALYZE_USAGE: 'storage:analyze-usage',
    FIND_LARGE_FILES: 'storage:find-large-files',
    FIND_DUPLICATES: 'storage:find-duplicates',
    REVEAL_IN_FOLDER: 'storage:reveal-in-folder',
    DELETE_FILES: 'storage:delete-files'
  },
  BOOST: {
    ANALYZE: 'boost:analyze',
    EXECUTE: 'boost:execute',
    CANCEL: 'boost:cancel',
    GET_SNAPSHOT: 'boost:get-snapshot',
    PROGRESS: 'boost:progress',
    TERMINATE_PROCESSES: 'boost:terminate-processes',
    LIST_PROCESSES: 'boost:list-processes',
    START_PROCESS_WATCH: 'boost:start-process-watch',
    STOP_PROCESS_WATCH: 'boost:stop-process-watch',
    PROCESSES_UPDATE: 'boost:processes-update'
  },
  STARTUP: {
    LIST: 'startup:list',
    SET_ENABLED: 'startup:set-enabled',
    GET_DETAILS: 'startup:get-details'
  },
  CLEANUP: {
    SCAN: 'cleanup:scan',
    EXECUTE: 'cleanup:execute',
    CANCEL: 'cleanup:cancel',
    PROGRESS: 'cleanup:progress'
  },
  SMART_SCAN: {
    RUN: 'smart-scan:run',
    CANCEL: 'smart-scan:cancel',
    PROGRESS: 'smart-scan:progress'
  },
  UPLOAD: {
    FILE: 'upload:file'
  },
  OFFLINE: {
    DB_HEALTH: 'offline:db-health',
    GET_NETWORK_STATUS: 'offline:get-network-status',
    CHECK_NETWORK: 'offline:check-network',
    WATCH_NETWORK: 'offline:watch-network',
    UNWATCH_NETWORK: 'offline:unwatch-network',
    NETWORK_STATUS_CHANGED: 'offline:network-status-changed',
    STORAGE_GET: 'offline:storage-get',
    STORAGE_SET: 'offline:storage-set',
    STORAGE_DELETE: 'offline:storage-delete',
    STORAGE_KEYS: 'offline:storage-keys',
    STORAGE_CLEAR: 'offline:storage-clear',
    SECURE_GET: 'offline:secure-get',
    SECURE_SET: 'offline:secure-set',
    SECURE_DELETE: 'offline:secure-delete',
    SECURE_HAS: 'offline:secure-has',
    SECURE_INFO: 'offline:secure-info',
    CACHE_GET: 'offline:cache-get',
    CACHE_SET: 'offline:cache-set',
    CACHE_DELETE: 'offline:cache-delete',
    CACHE_HAS: 'offline:cache-has',
    CACHE_CLEAR: 'offline:cache-clear'
  },
  API: {
    REQUEST: 'api:request'
  },
  SYNC: {
    START: 'sync:start',
    CANCEL: 'sync:cancel',
    STATUS: 'sync:status',
    PROGRESS: 'sync:progress',
    QUEUE_STATS: 'sync:queue-stats',
    QUEUE_LIST: 'sync:queue-list'
  },
  AUTH: {
    LOGIN: 'auth:login',
    REGISTER: 'auth:register',
    REQUEST_OTP: 'auth:request-otp',
    VERIFY_OTP: 'auth:verify-otp',
    SET_PASSWORD: 'auth:set-password',
    LOGOUT: 'auth:logout',
    GET_SESSION: 'auth:get-session',
    SYNC: 'auth:sync',
    REFRESH: 'auth:refresh',
    HAS_PERMISSION: 'auth:has-permission',
    GET_SUBSCRIPTION: 'auth:get-subscription',
    SESSION_CHANGED: 'auth:session-changed',
    OPEN_WINDOW: 'auth:open-window'
  }
} as const

export const WINDOW_DEFAULTS = {
  WIDTH: 1200,
  HEIGHT: 800,
  MIN_WIDTH: 900,
  MIN_HEIGHT: 600,
  /**
   * Welcome / license window — 16:10, the usual production desktop splash ratio
   * (more vertical room than locking to the illustration’s native pixels).
   */
  ONBOARDING_WIDTH: 1280,
  ONBOARDING_HEIGHT: 800,
  ONBOARDING_MIN_WIDTH: 1024,
  ONBOARDING_MIN_HEIGHT: 640,
  ONBOARDING_ASPECT_RATIO: 16 / 10,
  AUTH_WIDTH: 1280,
  AUTH_HEIGHT: 800,
  AUTH_MIN_WIDTH: 1024,
  AUTH_MIN_HEIGHT: 640,
  AUTH_ASPECT_RATIO: 16 / 10,
  /** Offset login/register from the onboarding window so both feel open. */
  AUTH_OFFSET_X: 48,
  AUTH_OFFSET_Y: 40
} as const

export type WindowLayout = 'onboarding' | 'app'
export type AuthWindowMode = 'login' | 'register'
