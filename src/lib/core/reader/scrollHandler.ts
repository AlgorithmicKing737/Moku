/** Fraction from the top of the viewport used as the "active page" read line. */
export const READ_LINE_PCT = 0.5;

export interface StripChapter {
    chapterId: string;
    chapterName: string;
    pageCount: number;
}

export interface ScrollHandlerCallbacks {
    /** Called when the visible page index changes (0-based). */
    onPageChange: (pageIndex: number) => void;
    /** Called when the visible chapter changes in multi-chapter strip mode. */
    onChapterChange: (chapterId: string) => void;
    /** Called when a chapter has been fully scrolled past (auto-mark-read). */
    onMarkRead: (chapterId: string) => void;
    /** Called when the reader is near the bottom and should load the next chapter. */
    onAppend: () => void;
    /** Return the current list of strip chapters for auto-mark calculations. */
    getStripChapters: () => StripChapter[];
    /** Whether to automatically mark chapters read on scroll. */
    shouldAutoMark: () => boolean;
}

/**
 * Attach scroll-position tracking to a longstrip container element.
 * Returns a cleanup function to remove all listeners.
 *
 * Images in the container must have `data-page-index` (0-based) and optionally
 * `data-chapter-id` attributes for multi-chapter strip tracking.
 */
export function setupScrollTracking(
    containerEl: HTMLElement,
    callbacks: ScrollHandlerCallbacks,
): () => void {
    const {
        onPageChange,
        onChapterChange,
        onMarkRead,
        onAppend,
        getStripChapters,
        shouldAutoMark,
    } = callbacks;

    let rafId: number | null = null;

    function tick() {
        rafId = null;

        const imgs = containerEl.querySelectorAll<HTMLElement>('img[data-page-index]');
        if (!imgs.length) return;

        const containerTop = containerEl.getBoundingClientRect().top;
        const readLineY = containerTop + containerEl.clientHeight * READ_LINE_PCT;

        // Binary search for the last image whose top edge is above the read line
        let lo = 0, hi = imgs.length - 1, best = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            if ((imgs[mid] as HTMLElement).getBoundingClientRect().top <= readLineY) {
                best = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        const active = imgs[best] as HTMLElement;
        const pageIndex = Number(active.dataset.pageIndex);
        const chapterId = active.dataset.chapterId ?? null;

        onPageChange(pageIndex);
        if (chapterId) onChapterChange(chapterId);

        if (shouldAutoMark() && chapterId) {
            const chunks = getStripChapters();
            const chunk = chunks.find((c) => c.chapterId === chapterId);
            if (chunk && pageIndex >= chunk.pageCount - 1) {
                onMarkRead(chapterId);
            }

            const atBottom =
                containerEl.scrollTop + containerEl.clientHeight >= containerEl.scrollHeight - 60;
            if (atBottom) {
                const last = chunks[chunks.length - 1];
                if (last) onMarkRead(last.chapterId);
            }
        }

        // Trigger appending next chapter when 80% scrolled
        const pct = (containerEl.scrollTop + containerEl.clientHeight) / containerEl.scrollHeight;
        if (pct >= 0.8) onAppend();
    }

    function onScroll() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(tick);
    }

    containerEl.addEventListener('scroll', onScroll, {passive: true});

    return () => {
        containerEl.removeEventListener('scroll', onScroll);
        if (rafId !== null) cancelAnimationFrame(rafId);
    };
}

/**
 * Append the next chapter's pages to a strip view.
 *
 * Finds the chapter after the last currently-loaded strip chapter, fetches its
 * pages, and calls `onAppended` with the new chunk. Calls `onDone` when finished
 * (success or no-op).
 */
export async function appendNextChapter(
    stripChapters: StripChapter[],
    chapterList: {id: string; name: string;}[],
    fetchPageCount: (chapterId: string) => Promise<number>,
    onAppended: (next: StripChapter) => void,
    onDone: () => void,
): Promise<void> {
    if (!stripChapters.length) {onDone(); return; }

    const lastChunk = stripChapters[stripChapters.length - 1];
    if (!lastChunk) {onDone(); return; }

    const lastIdx = chapterList.findIndex((c) => c.id === lastChunk.chapterId);
    if (lastIdx < 0 || lastIdx >= chapterList.length - 1) {onDone(); return; }

    const next = chapterList[lastIdx + 1];
    if (!next || stripChapters.some((c) => c.chapterId === next.id)) {onDone(); return; }

    try {
        const pageCount = await fetchPageCount(next.id);
        if (stripChapters.some((c) => c.chapterId === next.id)) {onDone(); return; }
        onAppended({chapterId: next.id, chapterName: next.name, pageCount});
    } catch {
        // swallow – caller retries on next scroll trigger
    } finally {
        onDone();
    }
}
