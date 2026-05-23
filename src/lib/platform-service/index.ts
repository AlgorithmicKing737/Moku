import type {
  PlatformAdapter,
  PlatformFeature,
  ServerLaunchConfig,
  DiscordPresence,
  AppUpdateInfo,
} from '$lib/platform-adapters/types'

let adapter: PlatformAdapter

export function initPlatformService(a: PlatformAdapter) {
  adapter = a
}

function getAdapter(): PlatformAdapter {
  if (!adapter) throw new Error('PlatformService not initialized')
  return adapter
}

export function isSupported(feature: PlatformFeature): boolean {
  return getAdapter().isSupported(feature)
}

export function launchServer(config: ServerLaunchConfig) {
  return getAdapter().launchServer(config)
}

export function stopServer() {
  return getAdapter().stopServer()
}

export function getServerStatus() {
  return getAdapter().getServerStatus()
}

export function readFile(path: string) {
  return getAdapter().readFile(path)
}

export function writeFile(path: string, data: Uint8Array) {
  return getAdapter().writeFile(path, data)
}

export function pickFolder() {
  return getAdapter().pickFolder()
}

export function authenticateBiometric() {
  return getAdapter().authenticateBiometric()
}

export function storeCredential(key: string, value: string) {
  return getAdapter().storeCredential(key, value)
}

export function getCredential(key: string) {
  return getAdapter().getCredential(key)
}

export function setTitle(title: string) {
  return getAdapter().setTitle(title)
}

export function minimize() {
  return getAdapter().minimize()
}

export function maximize() {
  return getAdapter().maximize()
}

export function close() {
  return getAdapter().close()
}

export function setDiscordPresence(presence: DiscordPresence) {
  return getAdapter().setDiscordPresence(presence)
}

export function clearDiscordPresence() {
  return getAdapter().clearDiscordPresence()
}

export function getVersion() {
  return getAdapter().getVersion()
}

export function openExternal(url: string) {
  return getAdapter().openExternal(url)
}

export function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  return getAdapter().checkForAppUpdate()
}

export function installAppUpdate() {
  return getAdapter().installAppUpdate()
}