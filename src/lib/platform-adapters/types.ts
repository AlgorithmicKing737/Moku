export type PlatformFeature =
  | 'server-management'
  | 'biometric-auth'
  | 'native-window'
  | 'filesystem'
  | 'app-updates'
  | 'discord-rpc'

export interface ServerLaunchConfig {
  jarPath:  string
  port:     number
  dataPath: string
}

export interface DiscordPresence {
  title:           string
  chapter:         string
  startTimestamp?: number
}

export interface AppUpdateInfo {
  version: string
  url:     string
  notes?:  string
}

export interface PlatformAdapter {
  init(): Promise<void>
  isSupported(feature: PlatformFeature): boolean

  launchServer(config: ServerLaunchConfig): Promise<void>
  stopServer(): Promise<void>
  getServerStatus(): Promise<'running' | 'stopped' | 'error'>

  readFile(path: string): Promise<Uint8Array>
  writeFile(path: string, data: Uint8Array): Promise<void>
  pickFolder(): Promise<string | null>

  authenticateBiometric(): Promise<boolean>
  storeCredential(key: string, value: string): Promise<void>
  getCredential(key: string): Promise<string | null>

  setTitle(title: string): Promise<void>
  minimize(): Promise<void>
  maximize(): Promise<void>
  close(): Promise<void>
  toggleFullscreen(): Promise<void>

  setDiscordPresence(presence: DiscordPresence): Promise<void>
  clearDiscordPresence(): Promise<void>

  getVersion(): Promise<string>
  openExternal(url: string): Promise<void>
  checkForAppUpdate(): Promise<AppUpdateInfo | null>
  installAppUpdate(): Promise<void>
}