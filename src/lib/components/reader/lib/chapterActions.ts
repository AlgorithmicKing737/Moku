import { readerState, DEFAULT_MANGA_PREFS } from "$lib/state/reader.svelte";
import { settingsState }                    from "$lib/state/settings.svelte";
import { getAdapter }                       from "$lib/request-manager";
import type { MangaPrefs }                  from "$lib/types/settings";
import type { MarkerColor }                 from "$lib/types/history";

export function getMangaPrefs(mangaId?: number): MangaPrefs {
  const id = mangaId ?? readerState.activeManga?.id;
  if (!id) return { ...DEFAULT_MANGA_PREFS };
  return { ...DEFAULT_MANGA_PREFS, ...(settingsState.settings.mangaPrefs?.[id] ?? {}) };
}

export function markChapterRead(id: number, markedRead: Set<number>) {
  if (markedRead.has(id)) return;
  markedRead.add(id);

  const chapter = readerState.activeChapterList.find(c => c.id === id) ?? readerState.activeChapter;
  const manga   = readerState.activeManga;

  if (manga && chapter) {
    readerState.addBookmark({
      mangaId:      manga.id,
      mangaTitle:   manga.title,
      thumbnailUrl: manga.thumbnailUrl,
      chapterId:    id,
      chapterName:  chapter.name,
      pageNumber:   readerState.pageUrls.length,
    });
  }

  const adapter = getAdapter();

  adapter.markChapterRead(String(id), true)
    .then(() => {
      const mangaId = readerState.activeManga?.id;
      if (!mangaId) return;

      readerState.activeChapterList = readerState.activeChapterList.map(c =>
        c.id === id ? { ...c, read: true } : c
      );

      const prefs = getMangaPrefs(mangaId);

      if (prefs.deleteOnRead) {
        const ch = readerState.activeChapterList.find(c => c.id === id);
        if (ch?.downloaded) {
          const delayMs = (prefs.deleteDelayHours ?? 0) * 3_600_000;
          const doDelete = () => adapter.deleteDownloadedChapters([String(id)]).catch(console.error);
          if (delayMs === 0) doDelete(); else setTimeout(doDelete, delayMs);
        }
      }

      if (prefs.downloadAhead > 0) {
        const list = readerState.activeChapterList;
        const idx  = list.findIndex(c => c.id === id);
        if (idx >= 0) {
          const toQueue = list
            .slice(idx + 1, idx + 1 + prefs.downloadAhead)
            .filter(c => !c.downloaded && !c.read)
            .map(c => String(c.id));
          if (toQueue.length) adapter.enqueueDownloads(toQueue).catch(console.error);
        }
      }

      if (prefs.maxKeepChapters > 0) {
        const downloaded = readerState.activeChapterList
          .filter(c => c.downloaded)
          .sort((a, b) => a.sourceOrder - b.sourceOrder);
        const excess = downloaded.slice(0, Math.max(0, downloaded.length - prefs.maxKeepChapters));
        if (excess.length) {
          adapter.deleteDownloadedChapters(excess.map(c => String(c.id))).catch(console.error);
        }
      }
    })
    .catch(e => { markedRead.delete(id); console.error(e); });
}

export function toggleBookmark(chapter: typeof readerState.activeChapter, pageNumber: number) {
  const manga = readerState.activeManga;
  if (!chapter || !manga) return;

  const existing = readerState.bookmarks.find(
    b => b.mangaId === manga.id && b.chapterId === chapter.id && b.pageNumber === pageNumber,
  );
  if (existing) {
    readerState.removeBookmark(chapter.id);
  } else {
    const other = readerState.bookmarks.find(b => b.mangaId === manga.id && b.chapterId !== chapter.id);
    if (other) readerState.removeBookmark(other.chapterId);
    readerState.addBookmark({
      mangaId:      manga.id,
      mangaTitle:   manga.title,
      thumbnailUrl: manga.thumbnailUrl,
      chapterId:    chapter.id,
      chapterName:  chapter.name,
      pageNumber,
    });
  }
}

export function commitMarker(color: MarkerColor, note: string, editId: string) {
  const chapter = readerState.activeChapter;
  const manga   = readerState.activeManga;
  if (!chapter || !manga) return;
  if (editId) {
    readerState.updateMarker(editId, { note: note.trim(), color });
  } else {
    readerState.addMarker({
      mangaId:      manga.id,
      mangaTitle:   manga.title,
      thumbnailUrl: manga.thumbnailUrl,
      chapterId:    chapter.id,
      chapterName:  chapter.name,
      pageNumber:   readerState.pageNumber,
      note:         note.trim(),
      color,
    });
  }
}