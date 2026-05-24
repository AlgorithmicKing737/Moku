export async function runConcurrent<T>(
    items: T[],
    fn: (item: T) => Promise<void>,
    signal: AbortSignal,
    concurrency = 6,
): Promise<void> {
    let index = 0;

    async function worker() {
        while (index < items.length) {
            if (signal.aborted) return;
            const item = items[index++];
            await fn(item).catch(() => {});
        }
    }

    await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, worker));
}

const inflight = new Map<string, Promise<unknown>>();

export function dedupeRequest<T>(key: string, factory: () => Promise<T>): Promise<T>;
export function dedupeRequest<T>(fn: (key: string) => Promise<T>): (key: string) => Promise<T>;
export function dedupeRequest<T>(
    keyOrFn: string | ((key: string) => Promise<T>),
    factory?: () => Promise<T>,
): Promise<T> | ((key: string) => Promise<T>) {
    if (typeof keyOrFn === 'function') {
        const fn = keyOrFn;
        return (key: string) => dedupeRequest(key, () => fn(key));
    }

    const key = keyOrFn;
    if (inflight.has(key)) return inflight.get(key) as Promise<T>;

    const request = factory!().finally(() => inflight.delete(key));
    inflight.set(key, request);
    return request;
}
