import { getAdapter } from '$lib/request-manager'
import { libraryState } from '$lib/state/library.svelte'
import { seriesState } from '$lib/state/series.svelte'
import type { MangaFilters, MangaMeta } from '$lib/server-adapters/types'

export async function loadLibrary(filters: MangaFilters = { inLibrary: true }) {
  libraryState.loading = true
  libraryState.error = null
  try {
    const result = await getAdapter().getMangaList(filters)
    libraryState.items = result.items
  } catch (e) {
    libraryState.error = String(e)
  } finally {
    libraryState.loading = false
  }
}

export async function loadManga(id: string) {
  seriesState.loading = true
  seriesState.error = null
  try {
    seriesState.current = await getAdapter().getManga(id)
  } catch (e) {
    seriesState.error = String(e)
  } finally {
    seriesState.loading = false
  }
}

export async function searchManga(query: string, sourceId?: string) {
  libraryState.loading = true
  libraryState.error = null
  try {
    libraryState.searchResults = await getAdapter().searchManga(query, sourceId)
  } catch (e) {
    libraryState.error = String(e)
  } finally {
    libraryState.loading = false
  }
}

export async function addToLibrary(mangaId: string) {
  await getAdapter().addToLibrary(mangaId)
  await loadLibrary()
}

export async function removeFromLibrary(mangaId: string) {
  await getAdapter().removeFromLibrary(mangaId)
  libraryState.items = libraryState.items.filter(m => String(m.id) !== mangaId)
}

export async function updateMangaMeta(id: string, meta: Partial<MangaMeta>) {
  await getAdapter().updateMangaMeta(id, meta)
  if (String(seriesState.current?.id) === id) {
    await loadManga(id)
  }
}