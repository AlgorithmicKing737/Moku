import { getAdapter } from '$lib/request-manager'
import { seriesState } from '$lib/state/series.svelte'
import { readerState } from '$lib/state/reader.svelte'

export async function loadChapters(mangaId: string) {
  seriesState.chaptersLoading = true
  seriesState.chaptersError   = null
  try {
    seriesState.chapters = await getAdapter().getChapters(mangaId)
  } catch (e) {
    seriesState.chaptersError = String(e)
  } finally {
    seriesState.chaptersLoading = false
  }
}

export async function fetchChapters(mangaId: string) {
  seriesState.chaptersLoading = true
  seriesState.chaptersError   = null
  try {
    seriesState.chapters = await getAdapter().fetchChapters(mangaId)
  } catch (e) {
    seriesState.chaptersError = String(e)
  } finally {
    seriesState.chaptersLoading = false
  }
}

export async function loadChapterPages(chapterId: string, signal?: AbortSignal) {
  readerState.pagesLoading = true
  readerState.pagesError   = null
  try {
    readerState.pages = await getAdapter().getChapterPages(chapterId, signal)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    readerState.pagesError = String(e)
  } finally {
    readerState.pagesLoading = false
  }
}

export async function markRead(id: string, read: boolean) {
  await getAdapter().markChapterRead(id, read)
  // chapter.id is a number; route params arrive as strings — compare via Number()
  const numId = Number(id)
  const chapter = seriesState.chapters.find(c => c.id === numId)
  if (chapter) chapter.read = read
}

export async function markManyRead(ids: string[], read: boolean) {
  await getAdapter().markChaptersRead(ids, read)
  const numIds = new Set(ids.map(Number))
  for (const c of seriesState.chapters) {
    if (numIds.has(c.id)) c.read = read
  }
}

export async function updateChaptersProgress(
  ids: string[],
  patch: { isRead?: boolean; isBookmarked?: boolean; lastPageRead?: number },
) {
  await getAdapter().updateChaptersProgress(ids, patch)
  const numIds = new Set(ids.map(Number))
  for (const c of seriesState.chapters) {
    if (!numIds.has(c.id)) continue
    if (patch.isRead !== undefined)      c.read         = patch.isRead
    if (patch.isBookmarked !== undefined) c.bookmarked   = patch.isBookmarked
    if (patch.lastPageRead !== undefined) c.lastPageRead = patch.lastPageRead
  }
}

export async function deleteDownloadedChapters(ids: string[]) {
  await getAdapter().deleteDownloadedChapters(ids)
  const numIds = new Set(ids.map(Number))
  for (const c of seriesState.chapters) {
    if (numIds.has(c.id)) c.downloaded = false
  }
}