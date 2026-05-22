import { getAdapter } from '$lib/request-manager'
import { seriesState } from '$lib/state/series.svelte'
import { readerState } from '$lib/state/reader.svelte'

export async function loadChapters(mangaId: string) {
  seriesState.chaptersLoading = true
  seriesState.chaptersError = null
  try {
    seriesState.chapters = await getAdapter().getChapters(mangaId)
  } catch (e) {
    seriesState.chaptersError = String(e)
  } finally {
    seriesState.chaptersLoading = false
  }
}

export async function loadChapterPages(chapterId: string) {
  readerState.pagesLoading = true
  readerState.pagesError = null
  try {
    readerState.pages = await getAdapter().getChapterPages(chapterId)
  } catch (e) {
    readerState.pagesError = String(e)
  } finally {
    readerState.pagesLoading = false
  }
}

export async function markRead(id: string, read: boolean) {
  await getAdapter().markChapterRead(id, read)
  const chapter = seriesState.chapters.find(c => c.id === id)
  if (chapter) chapter.read = read
}

export async function markManyRead(ids: string[], read: boolean) {
  await getAdapter().markChaptersRead(ids, read)
  for (const c of seriesState.chapters) {
    if (ids.includes(c.id)) c.read = read
  }
}
