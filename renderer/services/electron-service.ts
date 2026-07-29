function getElectron() {
  if (!window.electron) {
    throw new Error('Electron API is not available. Running outside Electron?')
  }
  return window.electron
}

export const electronService = {
  app: () => getElectron().app,
  window: () => getElectron().window,
  system: () => getElectron().system,
  file: () => getElectron().file,
  dialog: () => getElectron().dialog,
  settings: () => getElectron().settings,
  updater: () => getElectron().updater,
  storage: () => getElectron().storage,
  boost: () => getElectron().boost,
  startup: () => getElectron().startup,
  cleanup: () => getElectron().cleanup,
  smartScan: () => getElectron().smartScan
}
