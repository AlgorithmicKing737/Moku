import { MemoryCache }              from '$lib/core/cache/memoryCache'
import { clientFor, DEFAULT_ORDER } from './trackers'
import type { TrackRecord }         from '$lib/types'
import type { Manga }               from '$lib/types/manga'

const coverCache = new MemoryCache<string>(200, 24 * 60 * 60 * 1000)

export interface CoverInput {
  manga:                Pick<Manga, 'id' | 'title' | 'thumbnailUrl'>
  linkedRecords:        TrackRecord[]
  configuredTrackerIds: number[]
  serverBaseUrl:        string
  coversArePublic:      boolean
}

function suwayomiCover(thumbnailUrl: string, base: string): string | null {
  if (!thumbnailUrl) return null
  if (thumbnailUrl.startsWith('http')) return thumbnailUrl
  return `${base.replace(/\/$/, '')}${thumbnailUrl}`
}

async function resolve(input: CoverInput): Promise<string | null> {
  const { manga, linkedRecords, configuredTrackerIds, serverBaseUrl, coversArePublic } = input

  if (coversArePublic) {
    const url = suwayomiCover(manga.thumbnailUrl, serverBaseUrl)
    if (url) return url
  }

  let errored = false
  const attempt = async (fn: () => Promise<string | null>): Promise<string | null> => {
    try { return await fn() } catch { errored = true; return null }
  }

  const linkedOrder = [...linkedRecords]
    .filter(r => clientFor(r.trackerId) && r.remoteId)
    .sort((a, b) => DEFAULT_ORDER.indexOf(a.trackerId) - DEFAULT_ORDER.indexOf(b.trackerId))
  for (const rec of linkedOrder) {
    const url = await attempt(() => clientFor(rec.trackerId)!.coverById(rec.remoteId))
    if (url) return url
  }

  const linkedIds  = new Set(linkedRecords.map(r => r.trackerId))
  const titleOrder = [...new Set([...configuredTrackerIds.filter(id => !linkedIds.has(id)), ...DEFAULT_ORDER])]
    .filter(id => clientFor(id))
  for (const id of titleOrder) {
    const url = await attempt(() => clientFor(id)!.coverByTitle(manga.title))
    if (url) return url
  }

  if (errored) throw new Error('cover lookup inconclusive')
  return null
}

export async function resolvePublicCover(input: CoverInput): Promise<string | null> {
  const key    = String(input.manga.id)
  const cached = coverCache.get(key)
  if (cached !== undefined) return cached || null

  try {
    const url = await resolve(input)
    coverCache.set(key, url ?? '')
    return url
  } catch {
    return null               
  }
}
