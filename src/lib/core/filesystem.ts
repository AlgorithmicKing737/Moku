import { platformService } from '$lib/platform-service'
import { settingsState }   from '$lib/state/settings.svelte'
import { addToast }        from '$lib/state/notifications.svelte'
import type { Manga }      from '$lib/types'

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()
}

function getDownloadsRoot(): string {
  return settingsState.settings?.serverDownloadsPath?.trim() ?? ''
}

function join(root: string, ...parts: string[]): string {
  const sep = root.includes('\\') ? '\\' : '/'
  return [root.replace(/[/\\]$/, ''), ...parts].join(sep)
}

function isLocalServer(): boolean {
  try {
    const host = new URL(settingsState.settings.serverUrl).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '::1'
  } catch {
    return false
  }
}

export function canOpenFolder(): boolean {
  return platformService.isSupported('filesystem') && isLocalServer()
}

function checkCanOpenFolder(): boolean {
  if (!platformService.isSupported('filesystem')) {
    addToast({ kind: 'info', title: 'Desktop only', body: 'Opening folders requires the desktop app.' })
    return false
  }
  if (!isLocalServer()) {
    addToast({ kind: 'info', title: 'Remote server', body: 'Folder access is unavailable when connected to a remote server.' })
    return false
  }
  return true
}

function checkRoot(root: string): boolean {
  if (!root) {
    addToast({ kind: 'error', title: 'No downloads path set', body: 'Configure it in Settings → Storage' })
    return false
  }
  return true
}

export async function openMangaFolder(manga: Manga): Promise<void> {
  if (!checkCanOpenFolder()) return
  const root   = getDownloadsRoot()
  if (!checkRoot(root)) return
  const source = (manga as any).source?.displayName ?? (manga as any).source?.name ?? ''
  const path   = source
    ? join(root, 'mangas', sanitize(source), sanitize(manga.title))
    : join(root, 'mangas', sanitize(manga.title))
  await platformService.openPath(path).catch(console.error)
}

export async function openDownloadsFolder(): Promise<void> {
  if (!checkCanOpenFolder()) return
  const root = getDownloadsRoot()
  if (!checkRoot(root)) return
  await platformService.openPath(root).catch(console.error)
}

export async function openCustomFolder(path: string): Promise<void> {
  if (!checkCanOpenFolder()) return
  if (!path?.trim()) return
  await platformService.openPath(path).catch(console.error)
}