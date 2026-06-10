import { readerState }                          from "$lib/state/reader.svelte";
import { fetchPages }                           from "./pageLoader";
import { cancelQueuedFetches, revokeBlobUrl }   from "$lib/core/cache/imageCache";
import { clearResolvedUrlCache, clearPageCache } from "$lib/core/cache/pageCache";

export function scheduleResumeDismiss() {
  setTimeout(() => { readerState.resumeFading = true; }, 1500);
  setTimeout(() => { readerState.resumeVisible = false; readerState.resumeFading = false; }, 2500);
}

let prefetchedChapterId: number | null = null;

export async function loadChapter(
  id: number,
  useBlob: boolean,
  abortCtrl: { current: AbortController | null },
  startAtLastPage: { current: boolean },
  markedRead: Set<number>,
  adjacent: { next: { id: number } | null },
) {
  abortCtrl.current?.abort();
  const ctrl = new AbortController();
  abortCtrl.current = ctrl;

  cancelQueuedFetches();
  if (useBlob) {
    clearResolvedUrlCache();
    for (const url of readerState.pageUrls) revokeBlobUrl(url);
    for (const strip of readerState.stripChapters) {
      for (const url of strip.urls) revokeBlobUrl(url);
    }
    if (prefetchedChapterId !== null && prefetchedChapterId !== id) {
      const prefetchedUrls = await fetchPages(prefetchedChapterId, false).catch(() => [] as string[]);
      for (const url of prefetchedUrls) revokeBlobUrl(url);
      clearPageCache(prefetchedChapterId);
    }
    prefetchedChapterId = null;
  }

  startAtLastPage.current = false;
  markedRead.clear();
  readerState.resetForChapter();
  readerState.pageUrls = [];

  const bookmark = readerState.bookmarks.find(b => b.chapterId === id);
  const resumeTo = bookmark ? bookmark.pageNumber : 0;
  readerState.resumePage      = resumeTo > 1 ? resumeTo : 0;
  readerState.resumeDismissed = false;
  readerState.resumeVisible   = resumeTo > 1;
  if (resumeTo > 1) scheduleResumeDismiss();

  readerState.pageNumber = 1;
  try {
    const urls = await fetchPages(id, useBlob, ctrl.signal, resumeTo > 1 ? resumeTo - 1 : 0);
    if (ctrl.signal.aborted) return;
    readerState.pageUrls = urls;
    if (startAtLastPage.current)  readerState.pageNumber = urls.length;
    else if (resumeTo > 1)        readerState.pageNumber = Math.min(resumeTo, urls.length || resumeTo);
    readerState.pageReady = true;
    readerState.loading   = false;
    if (adjacent.next) {
      prefetchedChapterId = adjacent.next.id;
      fetchPages(adjacent.next.id, useBlob, ctrl.signal).catch(() => {});
    }
  } catch (e: unknown) {
    if (ctrl.signal.aborted) return;
    readerState.error   = e instanceof Error ? e.message : String(e);
    readerState.loading = false;
  }
}