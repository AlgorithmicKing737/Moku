export const READ_LINE_PCT = 0.50;

export interface StripChapter {
  chapterId:   number;
  chapterName: string;
  urls:        string[];
}

export interface ScrollHandlerCallbacks {
  onPageChange:        (page: number) => void;
  onChapterChange:     (chapterId: number) => void;
  onCenterIdxChange:   (flatIdx: number) => void;
  onMarkRead:          (chapterId: number) => void;
  onAppend:            () => void;
  getStripChapters:    () => StripChapter[];
  getPageUrls:         () => string[];
  shouldAutoMark:      () => boolean;
}

/**
 * Returns true if the element is considered "at" the read-line.
 *
 * Ported from Suwayomi's ReaderPager.utils `isPageInViewport`:
 *   - If the element's top is above the line AND its bottom is below it → fully covers the line
 *     (handles a single page that is taller than the viewport).
 *   - If the element's top is at or below the line AND its bottom is also below it → leading edge
 *     has crossed the line (normal scroll-past case).
 *
 * Using Math.trunc to avoid floating-point jitter from getBoundingClientRect.
 */
function isPageAtReadLine(el: HTMLElement, readLineY: number): boolean {
  const rect   = el.getBoundingClientRect();
  const top    = Math.trunc(rect.top);
  const bottom = Math.trunc(rect.bottom);
  const line   = Math.trunc(readLineY);
  // Element completely spans the read line (taller than viewport or very tall image)
  if (top <= line && bottom >= line) return true;
  // Element's top edge is at or above the line
  if (top <= line) return true;
  return false;
}

export function setupScrollTracking(
  containerEl: HTMLElement,
  callbacks: ScrollHandlerCallbacks,
): () => void {
  const {
    onPageChange, onChapterChange, onCenterIdxChange,
    onMarkRead, onAppend, getStripChapters, getPageUrls, shouldAutoMark,
  } = callbacks;

  let rafId: number | null = null;

  function tick() {
    rafId = null;
    const imgs = containerEl.querySelectorAll<HTMLElement>("img[data-local-page]");

    if (!imgs.length) return;

    const containerRect = containerEl.getBoundingClientRect();
    const readLineY     = containerRect.top + containerEl.clientHeight * READ_LINE_PCT;

    // Find the last image whose top is at or above the read line.
    // Binary search is still valid here since images are ordered top-to-bottom.
    let lo = 0, hi = imgs.length - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (isPageAtReadLine(imgs[mid], readLineY)) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }

    const active     = imgs[best];
    const activePage = Number(active.dataset.localPage);
    const activeChId = Number(active.dataset.chapter);

    onPageChange(activePage);
    if (activeChId) onChapterChange(activeChId);

    const chunks   = getStripChapters();
    let flatOffset = 0;
    for (const chunk of chunks) {
      if (chunk.chapterId === activeChId) {
        onCenterIdxChange(flatOffset + activePage - 1);
        break;
      }
      flatOffset += chunk.urls.length;
    }

    if (shouldAutoMark() && activeChId) {
      const chunk = chunks.find(c => c.chapterId === activeChId);
      const total = chunk ? chunk.urls.length : getPageUrls().length;
      if (total > 0 && activePage >= total) onMarkRead(activeChId);

      const atBottom = containerEl.scrollTop + containerEl.clientHeight >= containerEl.scrollHeight - 40;
      if (atBottom) {
        const last = chunks[chunks.length - 1];
        if (last) onMarkRead(last.chapterId);
      }
    }

    if ((containerEl.scrollTop + containerEl.clientHeight) / containerEl.scrollHeight >= 0.80) {
      onAppend();
    }
  }

  function onScroll() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  containerEl.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    containerEl.removeEventListener("scroll", onScroll);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

export function appendNextChapter(
  stripChapters: StripChapter[],
  chapterList: { id: number; name: string }[],
  fetchPages: (chapterId: number) => Promise<string[]>,
  preloadImage: (url: string) => void,
  onAppended: (next: StripChapter) => void,
  onDone: () => void,
): void {
  if (!stripChapters.length) return;
  const lastChunk = stripChapters[stripChapters.length - 1];
  const lastIdx   = chapterList.findIndex(c => c.id === lastChunk.chapterId);
  if (lastIdx < 0 || lastIdx >= chapterList.length - 1) return;
  const next = chapterList[lastIdx + 1];
  if (!next || stripChapters.some(c => c.chapterId === next.id)) return;

  fetchPages(next.id)
    .then(urls => { urls.slice(0, 6).forEach(preloadImage); return urls; })
    .then(urls => {
      if (stripChapters.some(c => c.chapterId === next.id)) { onDone(); return; }
      onAppended({ chapterId: next.id, chapterName: next.name, urls });
      onDone();
    })
    .catch(() => onDone());
}