/**
 * Developer ID + notarytool credentials. When these are missing, do not
 * ad-hoc / hardened-runtime sign — Gatekeeper then reports the downloaded
 * app as "damaged" instead of merely unsigned.
 */
const hasMacSigningCredentials = Boolean(process.env.CSC_LINK)
const appleTeamId = process.env.APPLE_TEAM_ID || ''
const canNotarize = Boolean(
  hasMacSigningCredentials &&
    process.env.APPLE_ID &&
    (process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_PASSWORD) &&
    appleTeamId
)

/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.edacleaner.app',
  productName: 'EDA Cleaner',
  copyright: 'Copyright © EDA Cleaner',
  // Installers are uploaded via scripts/publish-release.mjs (API + S3), not GitHub Releases.
  // Without this, CI sets CI=true and electron-builder fails looking for GH_TOKEN.
  publish: null,
  directories: {
    output: 'release',
    buildResources: 'resources'
  },
  files: ['out/**/*', 'package.json'],
  // Runtime window/taskbar icon (Windows/Linux). Packaged outside asar.
  extraResources: [
    {
      from: 'resources/icons',
      to: 'icons',
      filter: ['icon.ico', 'icon.png', '512.png']
    }
  ],
  asar: true,
  // sql.js WASM must be unpackable for require.resolve at runtime.
  asarUnpack: ['**/node_modules/sql.js/**'],
  compression: 'maximum',

  // Windows signing stays disabled until a Windows cert is configured.
  // macOS signing/notarization is enabled only when CSC_LINK + Apple notary env are set.

  win: {
    icon: 'resources/icons/icon.ico',
    // Required for embedding the app icon + version metadata into the .exe via rcedit.
    // Signing still no-ops when CSC_IDENTITY_AUTO_DISCOVERY=false / no cert is present.
    // Setting this to false leaves the default Electron icon on the packaged binary.
    signAndEditExecutable: true,
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    artifactName: '${productName}-${version}-win-${arch}.${ext}'
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'EDA Cleaner',
    installerIcon: 'resources/icons/icon.ico',
    uninstallerIcon: 'resources/icons/icon.ico',
    installerHeaderIcon: 'resources/icons/icon.ico'
  },

  mac: {
    icon: 'resources/icons/icon.icns',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    category: 'public.app-category.utilities',
    artifactName: '${productName}-${version}-mac-${arch}.${ext}',
    type: 'distribution',
    gatekeeperAssess: false,
    ...(hasMacSigningCredentials
      ? {
          hardenedRuntime: true,
          entitlements: 'build/entitlements.mac.plist',
          entitlementsInherit: 'build/entitlements.mac.inherit.plist',
          notarize: canNotarize ? { teamId: appleTeamId } : false
        }
      : {
          identity: null,
          hardenedRuntime: false,
          notarize: false
        })
  },

  dmg: {
    format: 'UDZO',
    sign: hasMacSigningCredentials,
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: 'link', path: '/Applications' }
    ]
  },

  linux: {
    icon: 'resources/icons/icon.png',
    // Native packages first (Windows-like install), AppImage as portable fallback.
    target: [
      { target: 'deb', arch: ['x64'] },
      { target: 'rpm', arch: ['x64'] },
      { target: 'AppImage', arch: ['x64'] }
    ],
    // Binary / .desktop Exec= name (no spaces)
    executableName: 'eda-cleaner',
    category: 'Utility',
    maintainer: 'EDA Cleaner <support@edacleaner.com>',
    vendor: 'EDA Cleaner',
    synopsis: 'PC cleanup and performance optimization tool',
    description:
      'EdaCleaner is a desktop utility that helps free disk space, clean junk files, and improve system performance — similar to Microsoft PC Manager.',
    desktop: {
      Name: 'EDA Cleaner',
      Comment: 'Clean junk files and boost PC performance',
      Categories: 'Utility;System;',
      StartupWMClass: 'eda-cleaner',
      Terminal: false,
      MimeType: 'x-scheme-handler/edacleaner;'
    },
    artifactName: '${productName}-${version}-linux-${arch}.${ext}'
  },

  protocols: [
    {
      name: 'EDA Cleaner',
      schemes: ['edacleaner']
    }
  ],

  deb: {
    priority: 'optional'
  }
}
