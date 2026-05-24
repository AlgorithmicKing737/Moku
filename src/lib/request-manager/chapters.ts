import {getAdapter} from '$lib/request-manager';
import {seriesState} from '$lib/state/series.svelte';
import {readerState} from '$lib/state/reader.svelte';

export async function loadChapters(mangaId: string) {
  seriesState.chaptersLoading = true;
  seriesState.chaptersError = null;
  try {
    seriesState.chapters = await getAdapter().getChapters(mangaId);
  } catch (e) {
    seriesState.chaptersError = String(e);
  } finally {
    seriesState.chaptersLoading = false;
  }
}

export async function loadChapterPages(chapterId: string) {
  readerState.pagesLoading = true;
  readerState.pagesError = null;
  try {
    readerState.pages = await getAdapter().getChapterPages(chapterId);
  } catch (e) {
    readerState.pagesError = String(e);
  } finally {
    readerState.pagesLoading = false;
  }
}

export async function updateProgress(chapterId: string, lastPageRead: number, read = false) {
  await getAdapter().updateChapterProgress(chapterId, lastPageRead, read);

  const chapterIds = new Set<string>([chapterId]);
  const nextRead = read || false;

  for (const chapter of seriesState.chapters) {
    if (chapterIds.has(String(chapter.id))) {
      chapter.lastPageRead = lastPageRead;
      chapter.read = nextRead;
    }
  }

  for (const chapter of readerState.chapters) {
    if (chapterIds.has(String(chapter.id))) {
      chapter.lastPageRead = lastPageRead;
      chapter.read = nextRead;
    }
  }

  if (readerState.chapter && String(readerState.chapter.id) === chapterId) {
    readerState.chapter.lastPageRead = lastPageRead;
    readerState.chapter.read = nextRead;
  }
}

export async function markRead(id: string, read: boolean) {
  await getAdapter().markChapterRead(id, read);
  const chapter = seriesState.chapters.find(c => String(c.id) === id);
  if (chapter) chapter.read = read;
}

export async function markManyRead(ids: string[], read: boolean) {
  await getAdapter().markChaptersRead(ids, read);
  for (const c of seriesState.chapters) {
    if (ids.includes(String(c.id))) c.read = read;
  }
}
