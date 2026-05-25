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
}