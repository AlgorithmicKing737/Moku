import { getAdapter } from '$lib/request-manager'
import { libraryState } from '$lib/state/library.svelte'
import { toast } from '$lib/state/notifications.svelte'
import { seriesState } from '$lib/state/series.svelte'
import type { MangaFilters, MangaMeta } from '$lib/server-adapters/types'

export async function loadLibrary(filters: MangaFilters = { inLibrary: true }) {
  libraryState.loading = true
  libraryState.error   = null
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
  seriesState.error   = null
  try {
    seriesState.current = await getAdapter().getManga(id)
  } catch (e) {
    seriesState.error = String(e)
  } finally {
    seriesState.loading = false
  }
}

export async function fetchManga(id: string) {
  seriesState.loading = true
  seriesState.error   = null
  try {
    seriesState.current = await getAdapter().fetchManga(id)
  } catch (e) {
    seriesState.error = String(e)
  } finally {
    seriesState.loading = false
  }
}

export async function searchManga(query: string, sourceId?: string) {
  libraryState.loading = true
  libraryState.error   = null
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
  if (String(seriesState.current?.id) === id) await loadManga(id)
}

export async function deleteMangaMeta(id: string, key: string) {
  await getAdapter().deleteMangaMeta(id, key)
  if (String(seriesState.current?.id) === id) await loadManga(id)
}

export async function refreshLibrary() {
  libraryState.refreshing = true
  try {
    await getAdapter().checkForUpdates()
    await loadLibrary()
    toast('success', 'Library updated')
  } catch (e) {
    toast('error', 'Update failed', String(e))
  } finally {
    libraryState.refreshing = false
  }
}

export async function stopLibraryUpdate() {
  await getAdapter().stopLibraryUpdate()
}

export async function pollLibraryUpdateStatus() {
  return getAdapter().getLibraryUpdateStatus()
}

export async function bulkRemoveFromLibrary(ids: Set<number>) {
  await Promise.allSettled([...ids].map(id => getAdapter().removeFromLibrary(String(id))))
  libraryState.items = libraryState.items.filter(m => !ids.has(m.id))
  libraryState.exitSelect()
}

export async function loadCategories() {
  try {
    libraryState.categories = await getAdapter().getCategories()
  } catch (e) {
    libraryState.error = String(e)
  }
}

export async function createCategory(name: string) {
  const category = await getAdapter().createCategory(name)
  libraryState.categories = [...libraryState.categories, category]
}

export async function deleteCategory(id: number) {
  await getAdapter().deleteCategory(id)
  libraryState.categories = libraryState.categories.filter(c => c.id !== id)
}

export async function updateCategoryOrder(id: number, position: number) {
  libraryState.categories = await getAdapter().updateCategoryOrder(id, position)
}

export async function updateMangaCategories(mangaId: string, addTo: number[], removeFrom: number[]) {
  await getAdapter().updateMangaCategories(mangaId, addTo, removeFrom)
}

export async function updateMangasCategories(mangaIds: string[], addTo: number[], removeFrom: number[]) {
  await getAdapter().updateMangasCategories(mangaIds, addTo, removeFrom)
}