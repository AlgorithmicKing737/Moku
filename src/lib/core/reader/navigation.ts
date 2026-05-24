import {getAdapter} from '$lib/request-manager';
import {loadChapterPages, updateProgress} from '$lib/request-manager/chapters';
import {readerState} from '$lib/state/reader.svelte';
import type {Chapter} from '$lib/types/index';

export function sortChapters(chapters: Chapter[]): Chapter[] {
    return [...chapters].sort((a, b) => a.sourceOrder - b.sourceOrder);
}

function currentChapterIndex(): number {
    if (!readerState.chapter) return -1;
    return sortChapters(readerState.chapters).findIndex(
        (ch) => String(ch.id) === String(readerState.chapter?.id),
    );
}

function clampPageIndex(index: number): number {
    if (readerState.pages.length === 0) return 0;
    return Math.min(Math.max(index, 0), readerState.pages.length - 1);
}

export function getAdjacentChapters(): {
    previous: Chapter | null;
    next: Chapter | null;
} {
    const chapters = sortChapters(readerState.chapters);
    const index = currentChapterIndex();
    return {
        previous: index > 0 ? (chapters[index - 1] ?? null) : null,
        next: index >= 0 && index < chapters.length - 1 ? (chapters[index + 1] ?? null) : null,
    };
}

export async function setCurrentReaderPage(index: number): Promise<void> {
    const nextIndex = clampPageIndex(index);
    readerState.currentPage = nextIndex;

    if (!readerState.chapter || readerState.pages.length === 0) return;

    const lastPageRead = nextIndex + 1;
    const completed = lastPageRead >= readerState.pages.length;

    if (
        readerState.chapter.lastPageRead === lastPageRead &&
        readerState.chapter.read === completed
    ) {
        return;
    }

    try {
        await updateProgress(String(readerState.chapter.id), lastPageRead, completed);
    } catch (error) {
        readerState.pagesError = error instanceof Error ? error.message : String(error);
    }
}

export async function goToNextReaderPage(): Promise<boolean> {
    if (readerState.currentPage >= readerState.pages.length - 1) return false;
    await setCurrentReaderPage(readerState.currentPage + 1);
    return true;
}

export async function goToPreviousReaderPage(): Promise<boolean> {
    if (readerState.currentPage <= 0) return false;
    await setCurrentReaderPage(readerState.currentPage - 1);
    return true;
}

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
        readerState.currentPage = clampPageIndex((chapter.lastPageRead ?? 1) - 1);
    }
}
