const _inflight = new Map<string, Promise<unknown>>()

export async function runConcurrent<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  signal: AbortSignal,
  concurrency = 6,
): Promise<void> {
  let i = 0
  async function worker() {
    while (i < items.length) {
      if (signal.aborted) return
      const item = items[i++]
      await fn(item).catch(() => {})
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
}

export function dedupeRequest<T>(key: string, factory: () => Promise<T>): Promise<T>
export function dedupeRequest<T>(fn: (key: string) => Promise<T>): (key: string) => Promise<T>
export function dedupeRequest<T>(
  keyOrFn: string | ((key: string) => Promise<T>),
  factory?: () => Promise<T>,
): Promise<T> | ((key: string) => Promise<T>) {
  if (typeof keyOrFn === 'function') {
    const fn = keyOrFn
    return (key: string) => dedupeRequest(key, () => fn(key))
  }
  const key = keyOrFn
  if (_inflight.has(key)) return _inflight.get(key) as Promise<T>
  const p = factory!().finally(() => _inflight.delete(key))
  _inflight.set(key, p)
  return p
}