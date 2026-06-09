import { platformService } from '$lib/platform-service'
import { settingsState }   from '$lib/state/settings.svelte'
import type { Manga }      from '$lib/types/manga'
import type { Chapter }    from '$lib/types/chapter'

const APP_BUTTONS = [
  { label: 'GitHub',  url: 'https://github.com/moku-project/Moku' },
  { label: 'Discord', url: 'https://discord.gg/Jq3pwuNqPp' },
]

const FALLBACK_IMAGE = 'moku_logo'

let sessionStart:  number | null = null
let activeMangaId: number | null = null

function trunc(s: string, max = 128): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function formatChapter(chapter: Chapter): string {
  const n = chapter.chapterNumber
  return `Chapter ${Number.isInteger(n) ? n : n.toFixed(1)}`
}

// Suwayomi always returns the proxy path (/api/v1/manga/{id}/thumbnail), never the raw CDN URL.
// The proxy URL is only useful to Discord when the server is publicly reachable over HTTPS.
// For localhost setups cover art falls back to the app logo until Suwayomi exposes rawThumbnailUrl.
function resolveCoverUrl(manga: Manga): string {
  const serverBase = (settingsState.settings.serverUrl ?? '').replace(/\/$/, '')
  if (!serverBase.startsWith('https://')) return FALLBACK_IMAGE
  const path = manga.thumbnailUrl?.startsWith('/') ? manga.thumbnailUrl : `/api/v1/manga/${manga.id}/thumbnail`
  return `${serverBase}${path}`
}

function buildPresence(manga: Manga, chapter: Chapter, coverUrl: string) {
  return {
    details:    trunc(manga.title),
    state:      `${formatChapter(chapter)}  ·  Reading`,
    timestamps: { start: sessionStart ?? Date.now() },
    assets: {
      largeImage: coverUrl,
      largeText:  trunc(manga.title),
      smallImage: FALLBACK_IMAGE,
      smallText:  'Moku',
    },
    buttons: APP_BUTTONS,
  }
}

export async function initRpc(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  sessionStart = Date.now()
}

export async function destroyRpc(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  sessionStart = null
}

export async function setReading(manga: Manga, chapter: Chapter): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return

  activeMangaId = manga.id
  await platformService.setDiscordPresence(buildPresence(manga, chapter, resolveCoverUrl(manga)))
}

export async function setIdle(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  await platformService.setDiscordPresence({
    details:    'Browsing',
    timestamps: { start: sessionStart ?? Date.now() },
    assets: { largeImage: FALLBACK_IMAGE, largeText: 'Moku' },
    buttons: APP_BUTTONS,
  })
}

export async function clearReading(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  await platformService.clearDiscordPresence()
}