import type { PlatformAdapter } from '$lib/platform-adapters/types'
import type { ServerLaunchConfig, DiscordPresence, AppUpdateInfo, PlatformFeature } from '$lib/platform-adapters/types'

let adapter: PlatformAdapter

export function initPlatformService(a: PlatformAdapter) {
  adapter = a
}

function get(): PlatformAdapter {
  if (!adapter) throw new Error('PlatformService not initialized')
  return adapter
}

export const platformService = {
  isSupported: (f: PlatformFeature)              => get().isSupported(f),
  init:        ()                                => get().init(),

  launchServer:    (c: ServerLaunchConfig)       => get().launchServer(c),
  stopServer:      ()                            => get().stopServer(),
  getServerStatus: ()                            => get().getServerStatus(),

  readFile:    (path: string)                    => get().readFile(path),
  writeFile:   (path: string, data: Uint8Array)  => get().writeFile(path, data),
  pickFolder:  ()                                => get().pickFolder(),

  authenticateBiometric: ()                      => get().authenticateBiometric(),
  storeCredential: (k: string, v: string)        => get().storeCredential(k, v),
  getCredential:   (k: string)                   => get().getCredential(k),

  setTitle:         (title: string)              => get().setTitle(title),
  minimize:         ()                           => get().minimize(),
  maximize:         ()                           => get().maximize(),
  close:            ()                           => get().close(),
  toggleFullscreen: ()                           => get().toggleFullscreen(),

  setDiscordPresence:   (p: DiscordPresence)     => get().setDiscordPresence(p),
  clearDiscordPresence: ()                       => get().clearDiscordPresence(),

  getVersion:       ()                           => get().getVersion(),
  openExternal:     (url: string)                => get().openExternal(url),
  checkForAppUpdate: ()                          => get().checkForAppUpdate(),
  installAppUpdate:  ()                          => get().installAppUpdate(),
}