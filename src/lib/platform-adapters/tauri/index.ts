import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import { open as openUrl } from '@tauri-apps/plugin-shell'
import { getVersion } from '@tauri-apps/api/app'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
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
    await invoke('set_window_title', { title })
  }

  async minimize() {
    await invoke('minimize_window')
  }

  async maximize() {
    await invoke('maximize_window')
  }

  async close() {
    await invoke('close_window')
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
    const update = await check()
    if (!update?.available) return null
    return {
      version: update.version,
      url: update.body ?? '',
      notes: update.body,
    }
  }

  async installAppUpdate() {
    const update = await check()
    if (update?.available) {
      await update.downloadAndInstall()
      await relaunch()
    }
  }
}