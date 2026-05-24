import type {Page} from '$lib/server-adapters/types';
import {getAdapter} from '$lib/request-manager';
import {resolveImageUrl} from '$lib/core/image';
import {getBlobUrl, preloadBlobUrls} from '$lib/core/cache/imageCache';

const pageCache = new Map<number, Page[]>();
const inflight = new Map<number, Promise<Page[]>>();
const resolvedUrlCache = new Map<string, Promise<string>>();
const aspectCache = new Map<string, number>();

export function resolveUrl(url: string, useBlob: boolean, priority = 0): Promise<string> {
    const absoluteUrl = resolveImageUrl(url) ?? url;
    if (!useBlob) return Promise.resolve(absoluteUrl);

    const cached = resolvedUrlCache.get(absoluteUrl);
    if (cached) return cached;

    const promise = getBlobUrl(absoluteUrl, priority).catch((error) => {
        resolvedUrlCache.delete(absoluteUrl);
        return Promise.reject(error);
    });

    resolvedUrlCache.set(absoluteUrl, promise);
    return promise;
}

export function fetchPages(
    chapterId: number,
    useBlob: boolean,
    signal?: AbortSignal,
    priorityPage = 0,
): Promise<Page[]> {
    const cached = pageCache.get(chapterId);
    if (cached) return Promise.resolve(cached);
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

    if (!inflight.has(chapterId)) {
        const request = getAdapter()
            .getChapterPages(String(chapterId))
            .then((pages) => {
                const normalized = pages.map((page) => ({
                    ...page,
                    url: resolveImageUrl(page.url) ?? page.url,
                }));

                if (useBlob && normalized[priorityPage]?.url) {
                    void getBlobUrl(normalized[priorityPage].url, 999);
                }

                pageCache.set(chapterId, normalized);
                return normalized;
            })
            .finally(() => inflight.delete(chapterId));

        inflight.set(chapterId, request);
    }

    const base = inflight.get(chapterId);
    if (!base) return Promise.resolve([]);
    if (!signal) return base;

    return new Promise<Page[]>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
        base.then(resolve, reject);
    });
}

export function measureAspect(url: string, useBlob: boolean): Promise<number> {
    const absoluteUrl = resolveImageUrl(url) ?? url;
    if (aspectCache.has(absoluteUrl)) return Promise.resolve(aspectCache.get(absoluteUrl) ?? 0.67);

    return resolveUrl(absoluteUrl, useBlob).then(
        (src) =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const ratio = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0.67;
                    aspectCache.set(absoluteUrl, ratio);
                    resolve(ratio);
                };
                img.onerror = () => resolve(0.67);
                img.src = src;
            }),
    );
}

export function preloadImage(url: string, useBlob: boolean): void {
    const absoluteUrl = resolveImageUrl(url) ?? url;

    if (useBlob) {
        preloadBlobUrls([absoluteUrl], 0);
        return;
    }

    void resolveUrl(absoluteUrl, false)
        .then((src) => {
            const img = new Image();
            img.src = src;
        })
        .catch(() => {});
}

export function clearResolvedUrlCache(): void {
    resolvedUrlCache.clear();
    aspectCache.clear();
}

export function clearPageCache(chapterId?: number): void {
    if (chapterId !== undefined) {
        pageCache.delete(chapterId);
        inflight.delete(chapterId);
        return;
    }

    pageCache.clear();
    inflight.clear();
    resolvedUrlCache.clear();
    aspectCache.clear();
}