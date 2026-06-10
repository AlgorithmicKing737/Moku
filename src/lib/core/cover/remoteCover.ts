import { MemoryCache }     from '$lib/core/cache/memoryCache'
import { externalFetch }   from '$lib/core/net/externalFetch'
import type { TrackRecord } from '$lib/types'

// Jikan (the unofficial MyAnimeList API) serves short, public HTTPS cover URLs with no auth — well
// under Discord's 256-char large_image limit. Cached per-manga so each is looked up once.
const JIKAN = 'https://api.jikan.moe/v4/manga'
const coverCache = new MemoryCache<string>(200, 24 * 60 * 60 * 1000)
const MAL_ID = /myanimelist\.net\/manga\/(\d+)/i

interface JikanImages { jpg?: { large_image_url?: string; image_url?: string } }
interface JikanManga  { images?: JikanImages }

// Browser fetch first (real UA), Tauri HTTP plugin as a CORS-bypass fallback.
async function jikanFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    return externalFetch(url, init)
  }
}

async function jikanGet(url: string): Promise<unknown> {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await jikanFetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`Jikan ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function coverOf(m: JikanManga | undefined): string {
  return m?.images?.jpg?.large_image_url ?? m?.images?.jpg?.image_url ?? ''
}

export async function fetchRemoteCover(mangaId: number, title: string, records: TrackRecord[]): Promise<string | null> {
  const key    = String(mangaId)
  const cached = coverCache.get(key)
  if (cached !== undefined) return cached || null

  try {
    // Exact lookup when the manga is linked to MAL; otherwise a title search (top hit).
    const malId = records.map(r => r.remoteUrl?.match(MAL_ID)?.[1]).find(Boolean)
    let url: string
    if (malId) {
      const data = (await jikanGet(`${JIKAN}/${malId}`)) as { data?: JikanManga }
      url = coverOf(data?.data)
    } else {
      const data = (await jikanGet(`${JIKAN}?q=${encodeURIComponent(title)}&limit=1`)) as { data?: JikanManga[] }
      url = coverOf(data?.data?.[0])
    }
    coverCache.set(key, url) // caches '' for a genuine no-match
    return url || null
  } catch {
    return null
  }
}
