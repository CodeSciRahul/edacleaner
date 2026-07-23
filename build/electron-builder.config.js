/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.edacleaner.app',
  productName: 'EDA Cleaner',
  directories: {
    output: 'release',
    buildResources: 'resources'
  },
  files: ['out/**/*', 'package.json'],
  asar: true,
  compression: 'maximum',

  // Runtime window / taskbar icons (resolved via process.resourcesPath)
  extraResources: [
    {
      from: 'resources/icons',
      to: 'icons',
      filter: ['icon.png', 'icon.ico', 'icon.icns', 'icon-256.png']
    }
  ],

  // Code signing placeholders — configure when certificates are available
  // win: { sign: './build/sign-win.js' },
  // mac: { identity: 'Developer ID Application: Your Name (TEAM_ID)' },
  // afterSign: 'build/notarize.js',

  win: {
    icon: 'resources/icons/icon.ico',
    // Avoid winCodeSign symlink extract (needs Windows Developer Mode / admin).
    // Re-enable for production signing + exe icon embedding.
    signAndEditExecutable: false,
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
    hardenedRuntime: true,
    gatekeeperAssess: false
  },

  dmg: {
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: 'link', path: '/Applications' }
    ]
  },

  linux: {
    icon: 'resources/icons/icon.png',
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      }
    ],
    category: 'Utility',
    artifactName: '${productName}-${version}-linux-${arch}.${ext}'
  }
}
