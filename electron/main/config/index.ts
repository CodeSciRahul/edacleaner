import { app } from 'electron'
import { Environment, Platform } from '@shared/enums'
import type { AppConfig, FeatureFlags } from '@shared/types'
import { APP_NAME } from '@shared/constants'

function detectPlatform(): Platform {
  switch (process.platform) {
    case 'win32':
      return Platform.Windows
    case 'darwin':
      return Platform.macOS
    case 'linux':
      return Platform.Linux
    default:
      return Platform.Unknown
  }
}

function detectEnvironment(): Environment {
  if (process.env.NODE_ENV === 'test') return Environment.Test
  if (app.isPackaged) return Environment.Production
  return Environment.Development
}

function getFeatureFlags(environment: Environment): FeatureFlags {
  const isDev = environment === Environment.Development

  return {
    enableAutoUpdate: !isDev,
    enableAnalytics: !isDev,
    enableDevTools: isDev,
    enableExperimentalFeatures: isDev
  }
}

class ConfigManager {
  private static instance: ConfigManager
  private config: AppConfig

  private constructor() {
    const environment = detectEnvironment()

    this.config = {
      name: APP_NAME,
      version: app.getVersion(),
      environment,
      platform: detectPlatform(),
      isPackaged: app.isPackaged,
      featureFlags: getFeatureFlags(environment)
    }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  get(): AppConfig {
    return { ...this.config }
  }

  getFeatureFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.config.featureFlags[key]
  }

  isDevelopment(): boolean {
    return this.config.environment === Environment.Development
  }

  isProduction(): boolean {
    return this.config.environment === Environment.Production
  }
}

export const configManager = ConfigManager.getInstance()
