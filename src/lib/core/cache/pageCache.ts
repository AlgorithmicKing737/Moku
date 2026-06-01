import { getBlobUrl, preloadBlobUrls } from "$lib/core/cache/imageCache";
import { settingsState }               from "$lib/state/settings.svelte";

const pageCache        = new Map<number, string[]>();
const inflight         = new Map<number, Promise<string[]>>();
const resolvedUrlCache = new Map<string, Promise<string>>();
const aspectCache      = new Map<string, number>();

function getServerUrl(): string {
  return settingsState.settings.serverUrl ?? "http://localhost:4567";
}

async function fetchChapterPagesFromServer(chapterId: number): Promise<string[]> {
  const base    = getServerUrl();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const mode    = settingsState.settings.serverAuthMode ?? "NONE";
  if (mode === "BASIC_AUTH") {
    const u = settingsState.settings.serverAuthUser?.trim() ?? "";
    const p = settingsState.settings.serverAuthPass?.trim() ?? "";
    if (u && p) headers["Authorization"] = `Basic ${btoa(`${u}:${p}`)}`;
  }
  const query = `mutation FetchChapterPages($chapterId: Int!) { fetchChapterPages(input: { chapterId: $chapterId }) { pages } }`;
  const res   = await fetch(`${base}/api/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables: { chapterId } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return (json.data.fetchChapterPages.pages as string[]).map(p =>
    p.startsWith("http") ? p : `${base}${p}`
  );
}

export function resolveUrl(url: string, useBlob: boolean, priority = 0): Promise<string> {
  if (!useBlob) return Promise.resolve(url);
  const cached = resolvedUrlCache.get(url);
  if (cached) return cached;
  const p = getBlobUrl(url, priority).catch(err => {
    resolvedUrlCache.delete(url);
    return Promise.reject(err);
  });
  resolvedUrlCache.set(url, p);
  return p;
}

export function fetchPages(
  chapterId: number,
  useBlob: boolean,
  signal?: AbortSignal,
  priorityPage = 0,
): Promise<string[]> {
  const cached = pageCache.get(chapterId);
  if (cached) return Promise.resolve(cached);
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));

  if (!inflight.has(chapterId)) {
    const p = fetchChapterPagesFromServer(chapterId)
      .then(urls => {
        if (useBlob && urls[priorityPage]) getBlobUrl(urls[priorityPage], 999);
        pageCache.set(chapterId, urls);
        return urls;
      })
      .finally(() => inflight.delete(chapterId));
    inflight.set(chapterId, p);
  }

  const base = inflight.get(chapterId)!;
  if (!signal) return base;
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    base.then(resolve, reject);
  });
}

export function measureAspect(url: string, useBlob: boolean): Promise<number> {
  if (aspectCache.has(url)) return Promise.resolve(aspectCache.get(url)!);
  return resolveUrl(url, useBlob).then(src => new Promise(res => {
    const img   = new Image();
    img.onload  = () => { const r = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0.67; aspectCache.set(url, r); res(r); };
    img.onerror = () => res(0.67);
    img.src     = src;
  }));
}

export function preloadImage(url: string, useBlob: boolean): void {
  if (useBlob) { preloadBlobUrls([url], 0); return; }
  resolveUrl(url, useBlob).then(src => { new Image().src = src; }).catch(() => {});
}

export function clearResolvedUrlCache(): void {
  resolvedUrlCache.clear();
  aspectCache.clear();
}

export function clearPageCache(chapterId?: number): void {
  if (chapterId !== undefined) {
    pageCache.delete(chapterId);
    inflight.delete(chapterId);
  } else {
    pageCache.clear();
    inflight.clear();
    resolvedUrlCache.clear();
    aspectCache.clear();
  }
}