import { getAdapter } from '$lib/request-manager'
import type { Manga } from '$lib/types'
import type { ReadSession } from '$lib/types/history'

export interface RecommendedManga {
  manga:         Manga
  matchedGenres: string[]
}

const TOP_GENRES       = 6
const TARGET_PER_GENRE = 20
const FALLBACK_GENRES  = ['Action', 'Adventure', 'Fantasy', 'Romance', 'Comedy', 'Drama']

export function topGenres(history: ReadSession[], libraryManga: Manga[]): string[] {
  const byId  = new Map(libraryManga.map(m => [m.id, m]))
  const tally = new Map<string, { count: number; original: string }>()

  for (const session of history) {
    const manga = byId.get(session.mangaId)
    if (!manga?.tags?.length) continue
    for (const g of manga.tags) {
      const key      = g.toLowerCase()
      const existing = tally.get(key)
      if (existing) existing.count++
      else tally.set(key, { count: 1, original: g })
    }
  }

  const derived = [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_GENRES)
    .map(e => e.original)

  return derived.length > 0 ? derived : FALLBACK_GENRES
}

export async function fetchRecommendations(
  history:      ReadSession[],
  libraryManga: Manga[],
  signal?:      AbortSignal,
): Promise<RecommendedManga[]> {
  const genres = topGenres(history, libraryManga)

  const adapter    = getAdapter() as any
  const globalSeen = new Set<number>(libraryManga.map(m => m.id))

  const perGenre = await Promise.all(
    genres.map(async genre => {
      if (signal?.aborted) return []
      try {
        const { items } = await adapter.getMangasByGenre(
          { genre: { like: `%${genre}%` } },
          TARGET_PER_GENRE,
          0,
          signal,
        )
        return items as Manga[]
      } catch {
        return []
      }
    })
  )

  const merged: Manga[] = []
  outer: for (const items of perGenre) {
    for (const m of items) {
      if (signal?.aborted) break outer
      if (globalSeen.has(m.id)) continue
      globalSeen.add(m.id)
      merged.push(m)
    }
  }

  return merged.map(m => {
    const mTagsLower = (m.tags ?? []).map(g => g.toLowerCase())
    const matched    = genres.filter(g => mTagsLower.includes(g.toLowerCase()))
    return {
      manga:         m,
      matchedGenres: matched.length > 0 ? matched : [genres[0]],
    }
  })
}