import { getAdapter }   from "$lib/request-manager";
import { libraryState } from "$lib/state/library.svelte";
import { addToast }     from "$lib/state/notifications.svelte";
import { seriesState }  from "$lib/state/series.svelte";
import type { MangaFilters, MangaMeta } from "$lib/server-adapters/types";
import type { Manga, Category } from "$lib/types";

export async function loadLibrary(filters: MangaFilters = { inLibrary: true }) {
  libraryState.loading = true;
  libraryState.error   = null;
  try {
    const result       = await getAdapter().getMangaList(filters);
    libraryState.items = result.items;
  } catch (e) {
    libraryState.error = String(e);
  } finally {
    libraryState.loading = false;
  }
}

export async function getManga(id: number, signal?: AbortSignal): Promise<Manga> {
  return getAdapter().getManga(String(id), signal);
}

export async function getMangaList(): Promise<Manga[]> {
  const result = await getAdapter().getMangaList({});
  return result.items;
}

export async function getCategories(): Promise<Category[]> {
  return getAdapter().getCategories();
}

export async function updateManga(id: number, patch: { inLibrary?: boolean }): Promise<void> {
  if (patch.inLibrary === true)  await getAdapter().addToLibrary(String(id));
  if (patch.inLibrary === false) await getAdapter().removeFromLibrary(String(id));
}

export async function loadManga(id: string): Promise<Manga> {
  return getAdapter().getManga(id);
}

export async function fetchManga(id: string): Promise<Manga> {
  return getAdapter().fetchManga(id);
}

export async function searchManga(query: string, sourceId?: string) {
  libraryState.loading = true;
  libraryState.error   = null;
  try {
    (libraryState as any).searchResults = await getAdapter().searchManga(query, sourceId);
  } catch (e) {
    libraryState.error = String(e);
  } finally {
    libraryState.loading = false;
  }
}

export async function addToLibrary(mangaId: string) {
  await getAdapter().addToLibrary(mangaId);
  await loadLibrary();
}

export async function removeFromLibrary(mangaId: string) {
  await getAdapter().removeFromLibrary(mangaId);
  libraryState.items = libraryState.items.filter(m => String(m.id) !== mangaId);
}

export async function updateMangaMeta(id: string, meta: Partial<MangaMeta>) {
  await getAdapter().updateMangaMeta(id, meta);
  if (String(seriesState.activeManga?.id) === id) seriesState.setActiveManga(await getAdapter().getManga(id));
}

export async function deleteMangaMeta(id: string, key: string) {
  await getAdapter().deleteMangaMeta(id, key);
  if (String(seriesState.activeManga?.id) === id) seriesState.setActiveManga(await getAdapter().getManga(id));
}

export async function refreshLibrary() {
  libraryState.refreshing = true;
  try {
    await getAdapter().checkForUpdates();
    await loadLibrary();
    addToast({ kind: "success", title: "Library updated" });
  } catch (e) {
    addToast({ kind: "error", title: "Update failed", body: String(e) });
  } finally {
    libraryState.refreshing = false;
  }
}

export async function stopLibraryUpdate() {
  await getAdapter().stopLibraryUpdate();
}

export async function pollLibraryUpdateStatus() {
  return getAdapter().getLibraryUpdateStatus();
}

export async function bulkRemoveFromLibrary(ids: Set<number>) {
  await Promise.allSettled([...ids].map(id => getAdapter().removeFromLibrary(String(id))));
  libraryState.items = libraryState.items.filter(m => !ids.has(m.id));
  libraryState.exitSelect();
}

export async function loadCategories() {
  try {
    const cats = await getAdapter().getCategories();
    libraryState.setCategories(cats);
  } catch (e) {
    libraryState.error = String(e);
  }
}

export async function createCategory(name: string): Promise<Category> {
  const category = await getAdapter().createCategory(name);
  libraryState.setCategories([...libraryState.categories, category]);
  return category;
}

export async function deleteCategory(id: number) {
  await getAdapter().deleteCategory(id);
  libraryState.setCategories(libraryState.categories.filter(c => c.id !== id));
}

export async function updateCategoryOrder(id: number, position: number) {
  const cats = await getAdapter().updateCategoryOrder(id, position);
  libraryState.setCategories(cats);
}

export async function updateMangaCategories(mangaId: string, addTo: number[], removeFrom: number[]) {
  await getAdapter().updateMangaCategories(mangaId, addTo, removeFrom);
}

export async function updateMangasCategories(mangaIds: string[], addTo: number[], removeFrom: number[]) {
  await getAdapter().updateMangasCategories(mangaIds, addTo, removeFrom);
}