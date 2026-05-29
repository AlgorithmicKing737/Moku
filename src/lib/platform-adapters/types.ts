export type PlatformFeature =
  | 'server-management'
  | 'biometric-auth'
  | 'native-window'
  | 'filesystem'
  | 'app-updates'
  | 'discord-rpc'

export interface ServerLaunchConfig {
  port?: number
  [key: string]: unknown
}

export interface DiscordPresence {
  state?: string
  details?: string
  [key: string]: unknown
}

export interface AppUpdateInfo {
  version: string
  url: string
  notes: string
}

export interface StorageInfo {
  manga_bytes: number
  total_bytes: number
  free_bytes:  number
  path:        string
}

export interface MigrateProgress {
  done:    number
  total:   number
  current: string
}

export interface UpdateProgress {
  downloaded: number
  total:      number | null
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
  installAppUpdate(tag: string): Promise<void>
  restartApp(): Promise<void>

  getDefaultDownloadsPath(): Promise<string>
  getStorageInfo(downloadsPath: string): Promise<StorageInfo>
  checkPathExists(path: string): Promise<boolean>
  createDirectory(path: string): Promise<void>
  openPath(path: string): Promise<void>
  getAutoBackupDir(): Promise<string>

  clearMokuCache(): Promise<void>
  clearSuwayomiCache(): Promise<void>
  resetSuwayomiData(): Promise<void>
  exitApp(): Promise<void>

  onUpdateProgress(cb: (p: UpdateProgress) => void): Promise<() => void>
  onUpdateLaunching(cb: () => void): Promise<() => void>
  listReleases(): Promise<ReleaseInfo[]>
  onMigrateProgress(cb: (p: MigrateProgress) => void): Promise<() => void>
  migrateDownloads(src: string, dst: string): Promise<void>
}

export interface ReleaseInfo {
  tag_name:     string
  name:         string
  body:         string
  published_at: string
  html_url:     string
}