import { platformService }  from '$lib/platform-service'
import { settingsState }    from '$lib/state/settings.svelte'
import { trackingState }    from '$lib/state/tracking.svelte'
import { fetchRemoteCover } from '$lib/core/cover/remoteCover'
import type { Manga }       from '$lib/types/manga'
import type { Chapter }     from '$lib/types/chapter'

const APP_BUTTONS = [
  { label: 'GitHub',  url: 'https://github.com/moku-project/Moku' },
  { label: 'Discord', url: 'https://discord.gg/Jq3pwuNqPp' },
]

const FALLBACK_IMAGE = 'moku_logo'

let sessionStart:  number | null = null
let activeMangaId: number | null = null
// bumped on every setReading; a late cover lookup only publishes if its epoch is still current
let presenceEpoch = 0

function trunc(s: string, max = 128): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function formatChapter(chapter: Chapter): string {
  const n = chapter.chapterNumber
  return `Chapter ${Number.isInteger(n) ? n : n.toFixed(1)}`
}

// Per-manga cover from MAL/Jikan (a short public URL Discord can proxy on any setup, incl. localhost).
// Falls back to the uploaded logo asset when there's no match.
async function resolveCover(manga: Manga): Promise<string> {
  try {
    const cover = await fetchRemoteCover(manga.id, manga.title, trackingState.recordsFor(manga.id))
    if (cover) return cover
  } catch { /* fall through to logo */ }
  return FALLBACK_IMAGE
}

// Reading presence.
//
// Discord validates an activity ATOMICALLY: when `largeImage` is an external (proxied) URL rather
// than an uploaded asset key, it silently drops the ENTIRE SET_ACTIVITY if the frame also carries
// certain fields — the presence just stays on whatever it showed before. We bisected every
// combination on this stack, and all of these were dropped:
//   • URL largeImage  +  buttons                       → dropped (stuck on previous state)
//   • URL largeImage  +  smallImage (asset-key logo)   → dropped
//   • URL largeImage  +  buttons  +  smallImage         → dropped
// Only an uploaded asset-KEY largeImage tolerates buttons/smallImage (see setIdle, which keeps
// both). So a live URL cover is mutually exclusive with the buttons AND the corner logo. The
// maximal payload that still renders is exactly:
//   details + state + timestamps + largeImage(URL) + largeText   — no buttons, no small image.
function buildReadingPresence(manga: Manga, chapter: Chapter, cover: string) {
  return {
    details:    trunc(manga.title),
    state:      `${formatChapter(chapter)}  ·  Reading`,
    timestamps: { start: sessionStart ?? Date.now() },
    assets: {
      largeImage: cover,
      largeText:  trunc(manga.title),
    },
  }
}

export async function initRpc(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  sessionStart = Date.now()
}

export async function destroyRpc(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  sessionStart  = null
  activeMangaId = null
  await platformService.clearDiscordPresence()
}

export async function setReading(manga: Manga, chapter: Chapter): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  activeMangaId = manga.id
  const epoch   = ++presenceEpoch

  const cover = await resolveCover(manga)
  if (epoch !== presenceEpoch) return // a newer setReading superseded us while resolving

  await platformService.setDiscordPresence(buildReadingPresence(manga, chapter, cover))
}

export async function setIdle(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  await platformService.setDiscordPresence({
    details:    'Browsing',
    timestamps: { start: sessionStart ?? Date.now() },
    assets: { largeImage: FALLBACK_IMAGE, largeText: 'Moku' },
    buttons: APP_BUTTONS,
  })
}

export async function clearReading(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  await platformService.clearDiscordPresence()
}
