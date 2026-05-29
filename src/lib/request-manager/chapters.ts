import { getAdapter }  from "$lib/request-manager";
import { seriesState } from "$lib/state/series.svelte";
import { readerState } from "$lib/state/reader.svelte";
import type { Chapter } from "$lib/types";

export async function getChapters(mangaId: number, signal?: AbortSignal): Promise<Chapter[]> {
  return getAdapter().getChapters(String(mangaId), signal);
}

export async function fetchChapters(mangaId: number, signal?: AbortSignal): Promise<Chapter[]> {
  return getAdapter().fetchChapters(String(mangaId), signal);
}

export async function loadChapters(mangaId: string) {
  seriesState.chaptersLoading = true;
  seriesState.chaptersError   = null;
  try {
    seriesState.chapters = await getAdapter().getChapters(mangaId);
  } catch (e) {
    seriesState.chaptersError = String(e);
  } finally {
    seriesState.chaptersLoading = false;
  }
}

export async function loadChapterPages(chapterId: string, signal?: AbortSignal) {
  readerState.pagesLoading = true;
  readerState.pagesError   = null;
  try {
    readerState.pages = await getAdapter().getChapterPages(chapterId, signal);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    readerState.pagesError = String(e);
  } finally {
    readerState.pagesLoading = false;
  }
}

export async function markChapterRead(id: number, read: boolean) {
  await getAdapter().markChapterRead(String(id), read);
  const chapter = seriesState.chapters.find(c => c.id === id);
  if (chapter) chapter.read = read;
}

export async function markChaptersRead(ids: number[], read: boolean) {
  await getAdapter().markChaptersRead(ids.map(String), read);
  const idSet = new Set(ids);
  for (const c of seriesState.chapters) {
    if (idSet.has(c.id)) c.read = read;
  }
}

export async function markRead(id: string, read: boolean) {
  await getAdapter().markChapterRead(id, read);
  const numId   = Number(id);
  const chapter = seriesState.chapters.find(c => c.id === numId);
  if (chapter) chapter.read = read;
}

export async function markManyRead(ids: string[], read: boolean) {
  await getAdapter().markChaptersRead(ids, read);
  const numIds = new Set(ids.map(Number));
  for (const c of seriesState.chapters) {
    if (numIds.has(c.id)) c.read = read;
  }
}

export async function updateChaptersProgress(
  ids: string[],
  patch: { isRead?: boolean; isBookmarked?: boolean; lastPageRead?: number },
) {
  await getAdapter().updateChaptersProgress(ids, patch);
  const numIds = new Set(ids.map(Number));
  for (const c of seriesState.chapters) {
    if (!numIds.has(c.id)) continue;
    if (patch.isRead       !== undefined) c.read         = patch.isRead;
    if (patch.isBookmarked !== undefined) c.bookmarked   = patch.isBookmarked;
    if (patch.lastPageRead !== undefined) c.lastPageRead = patch.lastPageRead;
  }
}

export async function deleteDownloadedChapters(ids: number[]) {
  await getAdapter().deleteDownloadedChapters(ids.map(String));
  const idSet = new Set(ids);
  for (const c of seriesState.chapters) {
    if (idSet.has(c.id)) c.downloaded = false;
  }
}