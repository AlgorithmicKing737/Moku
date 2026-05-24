import {fetchAuthenticated, getAuthMode} from '$lib/core/auth';
import {resolveImageUrl} from '$lib/core/image';

interface CacheEntry {
    value: string;
    revokable: boolean;
}

interface QueueEntry {
    url: string;
    priority: number;
    resolve: (value: string) => void;
    reject: (error: unknown) => void;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
const queue: QueueEntry[] = [];

const MAX_CONCURRENT = 6;
let active = 0;
let drainScheduled = false;
let clearing = false;

async function doFetch(url: string): Promise<string> {
    const resolved = resolveImageUrl(url) ?? url;

    if (getAuthMode() === 'NONE') {
        cache.set(url, {value: resolved, revokable: false});
        return resolved;
    }

    const response = await fetchAuthenticated(resolved);
    if (!response.ok) throw new Error(String(response.status));

    const blob = await response.blob();
    if (clearing) throw new DOMException('Cancelled', 'AbortError');

    const objectUrl = URL.createObjectURL(blob);
    cache.set(url, {value: objectUrl, revokable: true});
    return objectUrl;
}

function insertSorted(entry: QueueEntry) {
    let lo = 0;
    let hi = queue.length;

    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (queue[mid].priority > entry.priority) lo = mid + 1;
        else hi = mid;
    }

    queue.splice(lo, 0, entry);
}

function drain() {
    drainScheduled = false;

    while (active < MAX_CONCURRENT && queue.length > 0) {
        const entry = queue.shift();
        if (!entry) break;

        active += 1;
        void doFetch(entry.url)
            .then(entry.resolve, entry.reject)
            .finally(() => {
                active -= 1;
                drain();
            });
    }
}

function scheduleDrain() {
    if (drainScheduled) return;
    drainScheduled = true;
    requestAnimationFrame(drain);
}

function enqueue(url: string, priority: number): Promise<string> {
    const promise = new Promise<string>((resolve, reject) => {
        insertSorted({url, priority, resolve, reject});
    }).catch((error) => {
        inflight.delete(url);
        return Promise.reject(error);
    });

    inflight.set(url, promise);
    scheduleDrain();
    return promise;
}

export function getBlobUrl(url: string, priority = 0): Promise<string> {
    if (!url) return Promise.resolve('');

    const cached = cache.get(url);
    if (cached) return Promise.resolve(cached.value);

    const existing = inflight.get(url);
    if (existing) {
        const queueIndex = queue.findIndex((entry) => entry.url === url);
        if (queueIndex !== -1 && priority > queue[queueIndex].priority) {
            const [entry] = queue.splice(queueIndex, 1);
            if (entry) {
                entry.priority = priority;
                insertSorted(entry);
            }
        }
        return existing;
    }

    return enqueue(url, priority);
}

export function preloadBlobUrls(urls: string[], basePriority = 0): void {
    urls.forEach((url, index) => {
        if (!url || cache.has(url) || inflight.has(url)) return;
        void enqueue(url, basePriority - index);
    });
}

export function revokeBlobUrl(url: string): void {
    const entry = cache.get(url);
    if (!entry) return;
    if (entry.revokable) URL.revokeObjectURL(entry.value);
    cache.delete(url);
}

export function deprioritizeQueue(): void {
    for (const entry of queue) entry.priority = 0;
    queue.sort((a, b) => b.priority - a.priority);
}

export function cancelQueuedFetches(): void {
    const dropped = queue.splice(0);
    for (const entry of dropped) {
        inflight.delete(entry.url);
        entry.reject(new DOMException('Cancelled', 'AbortError'));
    }
}

export function clearBlobCache(): void {
    clearing = true;
    cancelQueuedFetches();

    for (const [url, entry] of cache.entries()) {
        if (entry.revokable) URL.revokeObjectURL(entry.value);
        cache.delete(url);
    }

    inflight.clear();
    clearing = false;
}