import type {
  PlatformAdapter,
  PlatformFeature,
  ServerLaunchConfig,
  DiscordPresence,
  AppUpdateInfo,
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
  async installAppUpdate() {}
}