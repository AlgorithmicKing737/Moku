import * as anilist from './anilist'
import * as jikan   from './jikan'

// Suwayomi tracker IDs
export const TRACKER = { MAL: 1, ANILIST: 2 } as const

export interface CoverClient {
  coverById(remoteId: string): Promise<string | null>
  coverByTitle(title: string): Promise<string | null>
}

// Only AniList + MAL have cover clients; other trackers (Kitsu, etc.) are unsupported → undefined.
const CLIENTS: Record<number, CoverClient> = {
  [TRACKER.ANILIST]: anilist,
  [TRACKER.MAL]:     jikan,
}

// Title-search fallback order when nothing more specific applies.
export const DEFAULT_ORDER: number[] = [TRACKER.ANILIST, TRACKER.MAL]

export function clientFor(trackerId: number): CoverClient | undefined {
  return CLIENTS[trackerId]
}
