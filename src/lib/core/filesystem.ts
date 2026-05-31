import { platformService } from '$lib/platform-service'
import { seriesState }     from '$lib/state/series.svelte'
import { addToast }        from '$lib/state/notifications.svelte'
import type { Manga }      from '$lib/types'

function sanitizeTitle(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()
}

async function getDownloadsRoot(): Promise<string> {
  let root = (seriesState.settings as any).downloadsPath?.trim() ?? ''
  if (!root) root = await platformService.getDefaultDownloadsPath().catch(() => '')
  return root
}

function join(root: string, ...parts: string[]): string {
  const sep = root.includes('\\') ? '\\' : '/'
  return [root.replace(/[/\\]$/, ''), ...parts].join(sep)
}

export async function openMangaFolder(manga: Manga): Promise<void> {
  if (!platformService.isSupported('filesystem')) {
    addToast({ kind: 'info', title: 'Desktop only', body: 'Opening folders requires the desktop app.' })
    return
  }
  const root = await getDownloadsRoot()
  if (!root) return
  await platformService.openPath(join(root, 'mangas', sanitizeTitle(manga.title))).catch(console.error)
}

export async function openCustomFolder(path: string): Promise<void> {
  if (!platformService.isSupported('filesystem')) {
    addToast({ kind: 'info', title: 'Desktop only', body: 'Opening folders requires the desktop app.' })
    return
  }
  if (!path?.trim()) return
  await platformService.openPath(path).catch(console.error)
}

export async function openDownloadsFolder(): Promise<void> {
  if (!platformService.isSupported('filesystem')) {
    addToast({ kind: 'info', title: 'Desktop only', body: 'Opening folders requires the desktop app.' })
    return
  }
  const root = await getDownloadsRoot()
  if (!root) return
  await platformService.openPath(join(root, 'mangas')).catch(console.error)
}