import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import { open as openUrl } from '@tauri-apps/plugin-shell'
import { getVersion } from '@tauri-apps/api/app'
import type {
  PlatformAdapter,
  PlatformFeature,
  ServerLaunchConfig,
  DiscordPresence,
  AppUpdateInfo,
} from '$lib/platform-adapters/types'

export class TauriAdapter implements PlatformAdapter {
  async init() {
    await invoke('init_app')
  }

  isSupported(feature: PlatformFeature): boolean {
    const supported: PlatformFeature[] = [
      'server-management',
      'biometric-auth',
      'native-window',
      'filesystem',
      'app-updates',
      'discord-rpc',
    ]
    return supported.includes(feature)
  }

  async launchServer(config: ServerLaunchConfig) {
    await invoke('launch_server', { config })
  }

  async stopServer() {
    await invoke('stop_server')
  }

  async getServerStatus(): Promise<'running' | 'stopped' | 'error'> {
    return invoke('get_server_status')
  }

  async readFile(path: string): Promise<Uint8Array> {
    return readFile(path)
  }

  async writeFile(path: string, data: Uint8Array) {
    await writeFile(path, data)
  }

  async pickFolder(): Promise<string | null> {
    const result = await open({ directory: true, multiple: false })
    return typeof result === 'string' ? result : null
  }

  async authenticateBiometric(): Promise<boolean> {
    return invoke('authenticate_biometric')
  }

  async storeCredential(key: string, value: string) {
    await invoke('store_credential', { key, value })
  }

  async getCredential(key: string): Promise<string | null> {
    return invoke('get_credential', { key })
  }

  async setTitle(title: string) {
    await getCurrentWindow().setTitle(title)
  }

  async minimize() {
    await getCurrentWindow().minimize()
  }

  async maximize() {
    const win = getCurrentWindow()
    await (await win.isMaximized() ? win.unmaximize() : win.maximize())
  }

  async close() {
    await getCurrentWindow().close()
  }

  async toggleFullscreen() {
    const win = getCurrentWindow()
    await win.setFullscreen(!await win.isFullscreen())
  }

  async setDiscordPresence(presence: DiscordPresence) {
    await invoke('set_discord_presence', { presence })
  }

  async clearDiscordPresence() {
    await invoke('clear_discord_presence')
  }

  async getVersion(): Promise<string> {
    return getVersion()
  }

  async openExternal(url: string) {
    await openUrl(url)
  }

  async checkForAppUpdate(): Promise<AppUpdateInfo | null> {
    const releases = await invoke<Array<{ tag_name: string; html_url: string; body: string }>>('list_releases')
    const current = await getVersion()
    const valid = releases.filter(r => r.tag_name?.trim())
    if (!valid.length) return null
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
    const latest = valid.map(r => r.tag_name).sort((a, b) => {
      const pa = parse(a), pb = parse(b)
      for (let i = 0; i < 3; i++) if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0)
      return 0
    })[0]
    const pa = parse(latest), pb = parse(current)
    if (!pa.some((n, i) => n > (pb[i] ?? 0))) return null
    const rel = valid.find(r => r.tag_name === latest)!
    return { version: latest.replace(/^v/, ''), url: rel.html_url, notes: rel.body }
  }

  async installAppUpdate(tag: string) {
    await invoke('download_and_install_update', { tag })
  }
}