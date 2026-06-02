import { invoke }                                          from '@tauri-apps/api/core'
import { getCurrentWindow }                                from '@tauri-apps/api/window'
import { listen }                                          from '@tauri-apps/api/event'
import { open }                                            from '@tauri-apps/plugin-dialog'
import { readFile, writeFile }                             from '@tauri-apps/plugin-fs'
import { open as openUrl }                                 from '@tauri-apps/plugin-shell'
import { getVersion }                                      from '@tauri-apps/api/app'
import { LazyStore }                                       from '@tauri-apps/plugin-store'
import { connect, disconnect, setActivity, clearActivity } from 'tauri-plugin-discord-rpc-api'
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

const APP_ID = '1487894643613106298'

const storeCache = new Map<string, LazyStore>()

function getStore(key: string): LazyStore {
  if (!storeCache.has(key)) {
    storeCache.set(key, new LazyStore(`${key}.json`, { autoSave: false }))
  }
  return storeCache.get(key)!
}

export class TauriAdapter implements PlatformAdapter {
  async init() {
    await connect(APP_ID).catch(() => {})
  }

  async destroy() {
    await disconnect().catch(() => {})
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

  async loadStore(key: string): Promise<unknown> {
    return getStore(key).get<unknown>(key) ?? null
  }

  async saveStore(key: string, value: unknown): Promise<void> {
    const store = getStore(key)
    await store.set(key, value)
    await store.save()
  }

  async launchServer(config: ServerLaunchConfig) {
    await invoke('spawn_server', {
      binary:       config.binary      ?? '',
      binaryArgs:   config.binaryArgs  ?? null,
      webUiEnabled: config.webUiEnabled ?? false,
    })
  }

  async stopServer() {
    await invoke('kill_server')
  }

  async getServerStatus(): Promise<'running' | 'stopped' | 'error'> {
    return 'stopped'
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

  async checkPathExists(path: string): Promise<boolean> {
    return invoke('check_path_exists', { path })
  }

  async createDirectory(path: string) {
    await invoke('create_directory', { path })
  }

  async openPath(path: string) {
    await invoke('open_path', { path })
  }

  async getDefaultDownloadsPath(): Promise<string> {
    return invoke('get_default_downloads_path')
  }

  async getStorageInfo(downloadsPath: string): Promise<StorageInfo> {
    return invoke('get_storage_info', { downloadsPath })
  }

  async migrateDownloads(src: string, dst: string) {
    await invoke('migrate_downloads', { src, dst })
  }

  async authenticateBiometric(): Promise<boolean> {
    try {
      await invoke('windows_hello_authenticate', { reason: 'Authenticate to access Moku' })
      return true
    } catch {
      return false
    }
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
    await setActivity(presence).catch(() => {})
  }

  async clearDiscordPresence() {
    await clearActivity().catch(() => {})
  }

  async getVersion(): Promise<string> {
    return getVersion()
  }

  async openExternal(url: string) {
    await openUrl(url)
  }

  async restartApp() {
    await invoke('restart_app')
  }

  async exitApp() {
    await invoke('exit_app')
  }

  async checkForAppUpdate(): Promise<AppUpdateInfo | null> {
    const releases = await invoke<Array<{ tag_name: string; html_url: string; body: string }>>('list_releases')
    const current  = await getVersion()
    const valid    = releases.filter(r => r.tag_name?.trim())
    if (!valid.length) return null
    const parse  = (v: string) => v.replace(/^v/, '').split('.').map(Number)
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

  async listReleases(): Promise<ReleaseInfo[]> {
    const all = await invoke<ReleaseInfo[]>('list_releases')
    return all.filter(r => typeof r.tag_name === 'string' && r.tag_name.trim())
  }

  async installAppUpdate(tag: string) {
    await invoke('download_and_install_update', { tag })
  }

  async onUpdateProgress(cb: (p: UpdateProgress) => void): Promise<() => void> {
    return listen<UpdateProgress>('update-progress', e => cb(e.payload))
  }

  async onUpdateLaunching(cb: () => void): Promise<() => void> {
    return listen('update-launching', cb)
  }

  async getAutoBackupDir(): Promise<string> {
    return invoke('get_auto_backup_dir')
  }

  async clearMokuCache() {
    await invoke('clear_moku_cache')
  }

  async clearSuwayomiCache() {
    await invoke('clear_suwayomi_cache')
  }

  async resetSuwayomiData() {
    await invoke('reset_suwayomi_data')
  }

  async onMigrateProgress(cb: (p: MigrateProgress) => void): Promise<() => void> {
    return listen<MigrateProgress>('migrate_progress', e => cb(e.payload))
  }
}