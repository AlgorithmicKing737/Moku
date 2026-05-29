import type {
  PlatformAdapter,
  PlatformFeature,
  ServerLaunchConfig,
  DiscordPresence,
  AppUpdateInfo,
  StorageInfo,
  ReleaseInfo,
  UpdateProgress,
  MigrateProgress,
} from '$lib/platform-adapters/types'

let adapter: PlatformAdapter

export function initPlatformService(a: PlatformAdapter) {
  adapter = a
}

function get(): PlatformAdapter {
  if (!adapter) throw new Error('PlatformService not initialized')
  return adapter
}

export const platformService = {
  isSupported: (f: PlatformFeature)                          => get().isSupported(f),
  init:        ()                                            => get().init(),

  launchServer:    (c: ServerLaunchConfig)                   => get().launchServer(c),
  stopServer:      ()                                        => get().stopServer(),
  getServerStatus: ()                                        => get().getServerStatus(),

  readFile:    (path: string)                                => get().readFile(path),
  writeFile:   (path: string, data: Uint8Array)              => get().writeFile(path, data),
  pickFolder:  ()                                            => get().pickFolder(),

  authenticateBiometric: ()                                  => get().authenticateBiometric(),
  storeCredential: (k: string, v: string)                    => get().storeCredential(k, v),
  getCredential:   (k: string)                               => get().getCredential(k),

  setTitle:         (title: string)                          => get().setTitle(title),
  minimize:         ()                                       => get().minimize(),
  maximize:         ()                                       => get().maximize(),
  close:            ()                                       => get().close(),
  toggleFullscreen: ()                                       => get().toggleFullscreen(),

  setDiscordPresence:   (p: DiscordPresence)                 => get().setDiscordPresence(p),
  clearDiscordPresence: ()                                   => get().clearDiscordPresence(),

  getVersion:        ()                                      => get().getVersion(),
  openExternal:      (url: string)                           => get().openExternal(url),
  checkForAppUpdate: ()                                      => get().checkForAppUpdate(),
  installAppUpdate:  (tag: string)                           => get().installAppUpdate(tag),
  restartApp:        ()                                      => get().restartApp(),

  getDefaultDownloadsPath: ()                                => get().getDefaultDownloadsPath(),
  getStorageInfo:    (downloadsPath: string)                 => get().getStorageInfo(downloadsPath),
  checkPathExists:   (path: string)                          => get().checkPathExists(path),
  createDirectory:   (path: string)                          => get().createDirectory(path),
  openPath:          (path: string)                          => get().openPath(path),
  getAutoBackupDir:  ()                                      => get().getAutoBackupDir(),

  clearMokuCache:    ()                                      => get().clearMokuCache(),
  clearSuwayomiCache: ()                                     => get().clearSuwayomiCache(),
  resetSuwayomiData:  ()                                     => get().resetSuwayomiData(),
  exitApp:            ()                                     => get().exitApp(),

  listReleases:       ()                                      => get().listReleases(),

  onUpdateProgress:  (cb: (p: UpdateProgress) => void)       => get().onUpdateProgress(cb),
  onUpdateLaunching: (cb: () => void)                        => get().onUpdateLaunching(cb),
  onMigrateProgress: (cb: (p: MigrateProgress) => void)      => get().onMigrateProgress(cb),
  migrateDownloads:  (src: string, dst: string)              => get().migrateDownloads(src, dst),
}