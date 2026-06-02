import { getAdapter } from '$lib/request-manager'
import type { Manga } from '$lib/types'
import type { ReadSession } from '$lib/types/history'

export interface RecommendedManga {
  manga:         Manga
  matchedGenres: string[]
}

const TOP_GENRES       = 6
const TARGET_PER_GENRE = 20

export function topGenres(history: ReadSession[], libraryManga: Manga[]): string[] {
  const byId  = new Map(libraryManga.map(m => [m.id, m]))
  const tally = new Map<string, { count: number; original: string }>()
  for (const session of history) {
    const manga = byId.get(session.mangaId)
    if (!manga?.genre?.length) continue
    for (const g of manga.genre) {
      const key      = g.toLowerCase()
      const existing = tally.get(key)
      if (existing) existing.count++
      else tally.set(key, { count: 1, original: g })
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_GENRES)
    .map(e => e.original)
}

export async function fetchRecommendations(
  history:      ReadSession[],
  libraryManga: Manga[],
  signal?:      AbortSignal,
): Promise<RecommendedManga[]> {
  if (!history.length || !libraryManga.length) return []
  const genres = topGenres(history, libraryManga)
  if (!genres.length) return []

  const adapter    = getAdapter()
  const globalSeen = new Set<number>(libraryManga.map(m => m.id))
  const merged: Manga[] = []

  for (const genre of genres) {
    if (signal?.aborted) break
    try {
      const results = await adapter.getMangaByGenre(genre, { excludeInLibrary: true }, signal)
      for (const m of results) {
        if (globalSeen.has(m.id)) continue
        globalSeen.add(m.id)
        merged.push(m)
        if (merged.length >= genres.length * TARGET_PER_GENRE) break
      }
    } catch {
      continue
    }
  }

  return merged.map(m => ({
    manga: m,
    matchedGenres: (m.genre ?? []).filter(g =>
      genres.some(tg => tg.toLowerCase() === g.toLowerCase())
    ),
  }))
}