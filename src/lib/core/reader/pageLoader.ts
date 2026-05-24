import type {Page} from '$lib/server-adapters/types';

/**
 * Build double-page spread groups for a given page count.
 * Groups are 1-based page numbers. Wide pages (aspect ratio > 1.2) get their own group.
 * `offsetSpreads` causes the first pairing to start at page 2 (common for manga with a cover).
 */
export function buildPageGroups(
    count: number,
    aspects: number[],
    offsetSpreads: boolean,
): number[][] {
    if (count === 0) return [];

    const groups: number[][] = [[1]];
    if (offsetSpreads && count > 1) groups.push([2]);

    let i = offsetSpreads ? 3 : 2;
    while (i <= count) {
        const aspect = aspects[i - 1] ?? 1;
        if (aspect > 1.2 || i === count) {
            groups.push([i++]);
        } else {
            groups.push([i, i + 1]);
            i += 2;
        }
    }
    return groups;
}

/**
 * Imperatively kick off browser image preloading for a URL.
 * Fire-and-forget; errors are silently swallowed.
 */
export function preloadImage(url: string): void {
    if (!url || typeof document === 'undefined') return;
    const img = new Image();
    img.src = url;
}

/**
 * Preload a window of pages ahead of the current position.
 */
export function preloadPages(pages: Page[], currentIndex: number, windowSize = 3): void {
    const end = Math.min(currentIndex + windowSize, pages.length);
    for (let i = currentIndex + 1; i < end; i++) {
        const p = pages[i];
        if (p) preloadImage(p.imageData ?? p.url);
    }
}
