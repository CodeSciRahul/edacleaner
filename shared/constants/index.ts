export const APP_NAME = 'EDA Cleaner'
export const APP_ID = 'com.edacleaner.app'

export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'app:get-version',
    GET_PLATFORM: 'app:get-platform',
    QUIT: 'app:quit',
    RELAUNCH: 'app:relaunch',
    GET_PATH: 'app:get-path'
  },
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    IS_MAXIMIZED: 'window:is-maximized',
    MAXIMIZED_CHANGED: 'window:maximized-changed'
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
  }
} as const

export const WINDOW_DEFAULTS = {
  WIDTH: 1200,
  HEIGHT: 800,
  MIN_WIDTH: 900,
  MIN_HEIGHT: 600,
  TITLEBAR_HEIGHT: 40
} as const
