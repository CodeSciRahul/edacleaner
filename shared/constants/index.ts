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
  SYSTEM: {
    GET_INFO: 'system:get-info',
    GET_MEMORY: 'system:get-memory'
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
  }
} as const

export const WINDOW_DEFAULTS = {
  WIDTH: 1200,
  HEIGHT: 800,
  MIN_WIDTH: 900,
  MIN_HEIGHT: 600
} as const
