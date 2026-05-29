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

export class WebAdapter implements PlatformAdapter {
  async init() {}

  isSupported(_feature: PlatformFeature): boolean {
    return false
  }

  async launchServer(_config: ServerLaunchConfig) {}
  async stopServer() {}
  async getServerStatus(): Promise<'running' | 'stopped' | 'error'> { return 'stopped' }

  async readFile(_path: string): Promise<Uint8Array> { return new Uint8Array() }
  async writeFile(_path: string, _data: Uint8Array) {}
  async pickFolder(): Promise<string | null> { return null }

  async authenticateBiometric(): Promise<boolean> { return false }
  async storeCredential(_key: string, _value: string) {}
  async getCredential(_key: string): Promise<string | null> { return null }

  async setTitle(title: string) { document.title = title }
  async minimize() {}
  async maximize() {}
  async close() {}

  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {})
    } else {
      await document.exitFullscreen().catch(() => {})
    }
  }

  async setDiscordPresence(_presence: DiscordPresence) {}
  async clearDiscordPresence() {}

  async getVersion(): Promise<string> { return __APP_VERSION__ }

  async openExternal(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async checkForAppUpdate(): Promise<AppUpdateInfo | null> { return null }
  async installAppUpdate(_tag: string) {}
  async restartApp() {}

  async getDefaultDownloadsPath(): Promise<string> { return '' }
  async getStorageInfo(_downloadsPath: string): Promise<StorageInfo> {
    return { manga_bytes: 0, total_bytes: 0, free_bytes: 0, path: '' }
  }
  async checkPathExists(_path: string): Promise<boolean> { return false }
  async createDirectory(_path: string) {}
  async openPath(_path: string) {}
  async getAutoBackupDir(): Promise<string> { return '' }

  async clearMokuCache() {}
  async clearSuwayomiCache() {}
  async resetSuwayomiData() {}
  async exitApp() {}

  async listReleases(): Promise<ReleaseInfo[]> { return [] }

  async onUpdateProgress(_cb: (p: UpdateProgress) => void): Promise<() => void> { return () => {} }
  async onUpdateLaunching(_cb: () => void): Promise<() => void> { return () => {} }
  async onMigrateProgress(_cb: (p: MigrateProgress) => void): Promise<() => void> { return () => {} }
  async migrateDownloads(_src: string, _dst: string) {}
}