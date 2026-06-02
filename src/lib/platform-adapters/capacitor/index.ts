import type {
  PlatformAdapter,
  PlatformFeature,
  ServerLaunchConfig,
  DiscordPresence,
  AppUpdateInfo,
} from '$lib/platform-adapters/types'

export class CapacitorAdapter implements PlatformAdapter {
  async init() {}

  isSupported(feature: PlatformFeature): boolean {
    const supported: PlatformFeature[] = ['biometric-auth', 'filesystem']
    return supported.includes(feature)
  }

  async loadStore(key: string): Promise<unknown> {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      const { value } = await Preferences.get({ key: `moku:${key}` })
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  async saveStore(key: string, value: unknown): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.set({ key: `moku:${key}`, value: JSON.stringify(value) })
    } catch {}
  }

  async launchServer(_config: ServerLaunchConfig) {}
  async stopServer() {}
  async getServerStatus(): Promise<'running' | 'stopped' | 'error'> { return 'stopped' }

  async readFile(path: string): Promise<Uint8Array> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const result = await Filesystem.readFile({ path, directory: Directory.Data })
    const base64 = result.data as string
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const binary = String.fromCharCode(...data)
    const base64 = btoa(binary)
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Data })
  }

  async pickFolder(): Promise<string | null> { return null }

  async authenticateBiometric(): Promise<boolean> {
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric')
      await NativeBiometric.verifyIdentity({ reason: 'Authenticate to access Moku', title: 'Biometric Auth' })
      return true
    } catch {
      return false
    }
  }

  async storeCredential(key: string, value: string): Promise<void> {
    const { NativeBiometric } = await import('capacitor-native-biometric')
    await NativeBiometric.setCredentials({ username: key, password: value, server: 'moku' })
  }

  async getCredential(key: string): Promise<string | null> {
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric')
      const result = await NativeBiometric.getCredentials({ server: 'moku' })
      return result.username === key ? result.password : null
    } catch {
      return null
    }
  }

  async setTitle(_title: string) {}
  async minimize() {}
  async maximize() {}
  async close() {}
  async toggleFullscreen() {}

  async setDiscordPresence(_presence: DiscordPresence) {}
  async clearDiscordPresence() {}

  async getVersion(): Promise<string> {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return info.version
  }

  async openExternal(url: string): Promise<void> {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  }

  async checkForAppUpdate(): Promise<AppUpdateInfo | null> { return null }
  async installAppUpdate(): Promise<void> {}
  async restartApp(): Promise<void> {}

  async getDefaultDownloadsPath(): Promise<string> { return '' }
  async getStorageInfo(): Promise<{ manga_bytes: number; total_bytes: number; free_bytes: number; path: string }> {
    return { manga_bytes: 0, total_bytes: 0, free_bytes: 0, path: '' }
  }
  async checkPathExists(_path: string): Promise<boolean> { return false }
  async createDirectory(_path: string): Promise<void> {}
  async openPath(_path: string): Promise<void> {}
  async getAutoBackupDir(): Promise<string> { return '' }

  async clearMokuCache(): Promise<void> {}
  async clearSuwayomiCache(): Promise<void> {}
  async resetSuwayomiData(): Promise<void> {}
  async exitApp(): Promise<void> {}

  async listReleases() { return [] }
  async onUpdateProgress(_cb: (p: { downloaded: number; total: number | null }) => void): Promise<() => void> { return () => {} }
  async onUpdateLaunching(_cb: () => void): Promise<() => void> { return () => {} }
  async onMigrateProgress(_cb: (p: { done: number; total: number; current: string }) => void): Promise<() => void> { return () => {} }
  async migrateDownloads(_src: string, _dst: string): Promise<void> {}
}