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
  asar: true,
  compression: 'maximum',

  // Code signing placeholders — configure when certificates are available
  // win: { sign: './build/sign-win.js' },
  // mac: { identity: 'Developer ID Application: Your Name (TEAM_ID)' },
  // afterSign: 'build/notarize.js',

  win: {
    icon: 'resources/icons/icon.png',
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
    shortcutName: 'EDA Cleaner'
  },

  mac: {
    icon: 'resources/icons/icon.png',
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
      Terminal: false
    },
    artifactName: '${productName}-${version}-linux-${arch}.${ext}'
  },

  deb: {
    priority: 'optional'
  }
}