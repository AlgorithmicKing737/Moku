import {getAdapter} from '$lib/request-manager';
import {loadChapterPages} from '$lib/request-manager/chapters';
import {readerState} from '$lib/state/reader.svelte';
import {sortChapters} from './navigation';

/**
 * Load (or resume) a reader session for the given manga and chapter.
 * Caches manga/chapter list when the manga ID hasn't changed to avoid redundant fetches.
 * Resumes at the reader's last saved page position.
 */
export async function ensureReaderSession(
    mangaId: string,
    chapterId: string,
): Promise<void> {
    const adapter = getAdapter();

    const mangaPromise =
        readerState.manga && String(readerState.manga.id) === mangaId
            ? Promise.resolve(readerState.manga)
            : adapter.getManga(mangaId);

    const chaptersPromise =
        readerState.chapters.length > 0 &&
            String(readerState.chapters[0]?.mangaId) === mangaId
            ? Promise.resolve(readerState.chapters)
            : adapter.getChapters(mangaId);

    const [manga, chapters] = await Promise.all([mangaPromise, chaptersPromise]);

    const chapter =
        chapters.find((ch) => String(ch.id) === chapterId) ??
        (String(readerState.chapter?.id) === chapterId ? readerState.chapter : null) ??
        (await adapter.getChapter(chapterId));

    readerState.manga = manga;
    readerState.chapters = chapters;
    readerState.chapter = chapter;
    readerState.pages = [];
    readerState.currentPage = 0;
    readerState.pagesError = null;

    await loadChapterPages(chapterId);

    if (readerState.pages.length > 0) {
        const resumeIndex = Math.max(0, (chapter.lastPageRead ?? 1) - 1);
        readerState.currentPage = Math.min(resumeIndex, readerState.pages.length - 1);
    }
}

/**
 * Return the sorted chapter list for the current manga ordered by source order.
 * Convenience re-export for callers that only need adjacent chapter lookups.
 */
export {sortChapters};
