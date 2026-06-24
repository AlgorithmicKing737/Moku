import { platformService }  from '$lib/platform-service'
import { settingsState }    from '$lib/state/settings.svelte'
import { trackingState }    from '$lib/state/tracking.svelte'
import { resolvePublicCover } from '$lib/core/cover/remoteCover'
import type { Manga }       from '$lib/types/manga'
import type { Chapter }     from '$lib/types/chapter'
import type { DiscordPresence } from '$lib/platform-adapters/types'

const REPO_URL = 'https://github.com/moku-project/Moku'

const APP_BUTTONS = [
  { label: 'GitHub',  url: REPO_URL },
  { label: 'Discord', url: 'https://discord.gg/Jq3pwuNqPp' },
]

const FALLBACK_IMAGE = 'moku_logo'

// TEMP, set true only if your Suwayomi server is publicly reachable by Discord,
// so its own thumbnail URL can be used directly.
const SUWAYOMI_COVERS_PUBLIC = false

const ACTIVITY_TYPE          = 3

const STATUS_DISPLAY_DETAILS = 2

let sessionStart: number | null = null

let presenceEpoch = 0
const supersede = () => ++presenceEpoch

let lastAmbient: DiscordPresence | null = null
let away = false

async function applyAmbient(payload: DiscordPresence): Promise<void> {
  lastAmbient = payload
  if (away) return
  await platformService.setDiscordPresence(payload)
}

function trunc(s: string, max = 128): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}

function formatChapter(chapter: Chapter): string {
  const n = chapter.chapterNumber
  return `Chapter ${Number.isInteger(n) ? n : n.toFixed(1)}`
}

async function resolveCover(manga: Manga): Promise<string> {
  try {
    await trackingState.loadForManga(manga.id)
    const cover = await resolvePublicCover({
      manga,
      linkedRecords:        trackingState.recordsFor(manga.id),
      configuredTrackerIds: trackingState.allTrackers.filter(t => t.isLoggedIn).map(t => t.id),
      serverBaseUrl:        settingsState.settings.serverUrl ?? '',
      coversArePublic:      SUWAYOMI_COVERS_PUBLIC,
    })
    if (cover) return cover
  } catch { /* fall through to logo */ }
  return FALLBACK_IMAGE
}

function buildReadingPresence(manga: Manga, chapter: Chapter, cover: string) {
  return {
    details:    trunc(manga.title),
    state:      `${formatChapter(chapter)}  ·  Reading`,
    timestamps: { start: sessionStart ?? Date.now() },
    assets: {
      largeImage: cover,
      largeText:  trunc(manga.title),
      smallImage: 'https://raw.githubusercontent.com/frozenkelp/Moku/sidestep-DRPC-cover-img/static/moku_logo.png', // NOTe: switch to moku-project/Moku/main in the PR
      smallText:  'Moku',
      smallUrl:   REPO_URL,
    },
    buttons: APP_BUTTONS,
    activityType:      ACTIVITY_TYPE,
    statusDisplayType: STATUS_DISPLAY_DETAILS,
  }
}

export async function initRpc(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  sessionStart = Date.now()
}

export async function destroyRpc(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  sessionStart = null
  away = false
  supersede()
  await platformService.clearDiscordPresence()
}

export async function setReading(manga: Manga, chapter: Chapter): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  const epoch = supersede()

  const cover = await resolveCover(manga)
  if (epoch !== presenceEpoch) return // a newer setReading superseded while resolving

  await applyAmbient(buildReadingPresence(manga, chapter, cover))
}

export async function setIdle(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  supersede()
  await applyAmbient({
    details:    'Browsing',
    timestamps: { start: sessionStart ?? Date.now() },
    assets: { largeImage: FALLBACK_IMAGE, largeText: 'Moku' },
    buttons: APP_BUTTONS,
    activityType: ACTIVITY_TYPE,
  })
}

// Idle presence
export async function setAway(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  supersede()
  away = true
  await platformService.setDiscordPresence({
    details: 'Away',
    assets: { largeImage: FALLBACK_IMAGE, largeText: 'Moku' },
    buttons: APP_BUTTONS,
    activityType: ACTIVITY_TYPE,
  })
}

// Returning from the idle splash: restore the pre-idle card Reading/Browsing
export async function clearAway(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  if (!away) return
  away = false
  supersede()
  if (lastAmbient) await platformService.setDiscordPresence(lastAmbient)
  else await setIdle()
}

export async function clearReading(): Promise<void> {
  if (!platformService.isSupported('discord-rpc')) return
  if (!settingsState.settings.discordRpc) return
  supersede()
  await platformService.clearDiscordPresence()
}
