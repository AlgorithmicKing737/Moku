import { platformService } from '$lib/platform-service'
import type { Manga }      from '$lib/types/manga'
import type { Chapter }    from '$lib/types/chapter'

const APP_BUTTONS = [
  { label: 'GitHub',  url: 'https://github.com/moku-project/Moku' },
  { label: 'Discord', url: 'https://discord.gg/Jq3pwuNqPp' },
]

const FALLBACK_IMAGE = 'moku_logo'

let sessionStart: number | null = null

function isPublicUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('https://')
}

function trunc(s: string, max = 128): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function formatChapter(chapter: Chapter): string {
  const n = chapter.chapterNumber
  return `Chapter ${Number.isInteger(n) ? n : n.toFixed(1)}`
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
  await platformService.setDiscordPresence({
    details:    trunc(manga.title),
    state:      `${formatChapter(chapter)}  ·  Reading`,
    timestamps: { start: sessionStart ?? Date.now() },
    assets: {
      largeImage: isPublicUrl(manga.thumbnailUrl) ? manga.thumbnailUrl : FALLBACK_IMAGE,
      largeText:  trunc(manga.title),
      smallImage: FALLBACK_IMAGE,
      smallText:  'Moku',
    },
    buttons: APP_BUTTONS,
  })
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