import { fetchPages }       from "$lib/core/cache/pageCache";
import { platformService }  from "$lib/platform-service";
import { authHeaders }      from "$lib/core/auth";
import { settingsState }    from "$lib/state/settings.svelte";
import type { DownloadQueueItem } from "$lib/types/api";

// CONCURRENCY:  max simultaneous page-image fetches.
// CHAPTERS_MAX: max chapters in the warming pipeline at once.
// COLD_BUFFER:  same-source chapters ahead of the warm frontier stay cold to avoid racing the downloader's cache writes.
// Values come from Settings (Storage tab); these are the fallbacks before settings load.
const CONCURRENCY  = 8;
const CHAPTERS_MAX = 5;
const COLD_BUFFER  = 2;
const MAX_ATTEMPTS = 3;

function warmingEnabled(): boolean { return settingsState.settings.warmingEnabled ?? true; }
function chapterMax(): number      { return Math.max(1, settingsState.settings.warmingChaptersMax ?? CHAPTERS_MAX); }
function coldBuffer(): number      { return Math.max(0, settingsState.settings.warmingColdBuffer ?? COLD_BUFFER); }
function concurrency(): number     { return Math.max(1, settingsState.settings.warmingConcurrency ?? CONCURRENCY); }

// Persist warmed-chapter tracking across reloads/pause; pages themselves live in the Suwayomi cache.
const WARMED_KEY = "moku:warmed-chapters";
function loadWarmed(): Set<number> {
  try { const raw = localStorage.getItem(WARMED_KEY); if (raw) return new Set(JSON.parse(raw)); } catch {}
  return new Set<number>();
}
function saveWarmed(): void {
  try { localStorage.setItem(WARMED_KEY, JSON.stringify([...warmed])); } catch {}
}
const warmed = loadWarmed();
const failed   = new Set<number>();
const inflight = new Map<number, AbortController>(); // page-list fetches in flight
const pending  = new Map<number, number>();           // chapterId → pages left to complete
const totals   = new Map<number, number>();           // chapterId → total pages
const attempts = new Map<number, number>();

// Per-chapter remaining image URLs plus warm order; the worker round-robins across warmOrder so chapters warm in parallel.
const chapterUrls: Map<number, string[]> = new Map();
const warmOrder: number[] = [];
let running = 0;

let paused = false;

// Page-list fetches are sequential to limit WebView pool pressure.
const pageListQueue: number[] = [];
let pageListFetching = false;

// Last polled state/queue; lets the worker refill immediately on chapter finish.
let lastState = "";
let lastQueue: DownloadQueueItem[] = [];

let conversionsChecked = false;
let conversionsOn      = false;
let conversionsPending = false;

async function ensureConversionsChecked(): Promise<boolean> {
  if (conversionsChecked) return conversionsOn;
  if (conversionsPending) return false;
  conversionsPending = true;
  try {
    const base = (settingsState.settings.serverUrl ?? "http://localhost:4567").replace(/\/$/, "");
    const res = await fetch(`${base}/api/graphql`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body:    JSON.stringify({ query: "{ settings { downloadConversions { target } } }" }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json?.errors?.length) { conversionsChecked = true; conversionsOn = true; return true; }
    conversionsOn      = ((json?.data?.settings?.downloadConversions?.length ?? 0) > 0);
    conversionsChecked = true;
    return conversionsOn;
  } catch {
    return false;
  } finally {
    conversionsPending = false;
  }
}

// Pops one image per chapter per cycle so all chapters warm in parallel; on finish, refills via maybeWarmMore(). A chapter is only marked warmed when every page fetch returned image bytes (which is what makes Suwayomi skip it) — failed/empty fetches are retried, and the chapter is abandoned unwarmed if too many fail.
function worker(): void {
  while (running < concurrency()) {
    let started = false;
    for (let i = 0; i < warmOrder.length; i++) {
      const id = warmOrder[i];
      const urls = chapterUrls.get(id);
      if (!urls || urls.length === 0) continue;
      const url = urls.shift()!;
      running++;
      started = true;
      platformService.fetchImage(url, authHeaders())
        .then(blob => {
          running--;
          if (blob.size > 0) {
            // page actually cached on the server — count it
            if (pending.has(id)) {
              const left = pending.get(id)! - 1;
              if (left <= 0) {
                pending.delete(id);
                totals.delete(id);
                chapterUrls.delete(id);
                const idx = warmOrder.indexOf(id);
                if (idx >= 0) warmOrder.splice(idx, 1);
                warmed.add(id);
                saveWarmed();
                maybeWarmMore(); // chapter finished — start the next one
              } else {
                pending.set(id, left);
              }
            }
          } else {
            // resolvable but empty — treat as a failed page
            retryOrAbandon(id, url);
          }
          worker();
        })
        .catch(() => {
          running--;
          // Failed or empty page — didn't reach Suwayomi's cache, so it isn't warmed.
          retryOrAbandon(id, url);
          worker();
        });
    }
    if (!started) break;
  }
}

// Per-chapter count of failed page fetches while warming.
const pageFails = new Map<number, number>();

// A page fetch failed (or came back empty) — it didn't reach Suwayomi's cache. Retry once per page; abandon the whole chapter if the source keeps failing.
function retryOrAbandon(chapterId: number, url: string): void {
  const urls = chapterUrls.get(chapterId);
  const total = totals.get(chapterId);
  if (urls && total !== undefined) {
    const fails = (pageFails.get(chapterId) ?? 0) + 1;
    pageFails.set(chapterId, fails);
    if (fails >= total) {
      stopWarmChapter(chapterId); // stop pre-caching, let normal download handle it
    } else {
      urls.push(url); // retry this page later
    }
  }
}

// Abandon warming a chapter without marking it warmed (unreliable source).
function stopWarmChapter(chapterId: number): void {
  pageFails.delete(chapterId);
  chapterUrls.delete(chapterId);
  pending.delete(chapterId);
  totals.delete(chapterId);
  const idx = warmOrder.indexOf(chapterId);
  if (idx >= 0) warmOrder.splice(idx, 1);
  failed.add(chapterId);
}

function abortWarm(chapterId: number): void {
  inflight.get(chapterId)?.abort();
  inflight.delete(chapterId);
  pending.delete(chapterId);
  totals.delete(chapterId);
  pageFails.delete(chapterId);
  chapterUrls.delete(chapterId);
  const wIdx = warmOrder.indexOf(chapterId);
  if (wIdx >= 0) warmOrder.splice(wIdx, 1);
  warmed.delete(chapterId);
  saveWarmed();
  failed.add(chapterId);
  const qIdx = pageListQueue.indexOf(chapterId);
  if (qIdx >= 0) pageListQueue.splice(qIdx, 1);
}

// Queue mutations (clear/remove) need WebViews; pause warming so the pool is free (image fetches don't use WebViews).
export function pauseWarming(): void {
  paused = true;
  inflight.forEach(c => c.abort());
  inflight.clear();
  pageListQueue.length = 0;
}

export function resumeWarming(): void {
  paused = false;
  maybeWarmMore();
}

// Next chapter's page list from the queue, one at a time.
async function fetchNextPageList(): Promise<void> {
  if (pageListFetching || paused) return;
  const id = pageListQueue.shift();
  if (id === undefined) return;
  pageListFetching = true;
  const ctrl = new AbortController();
  inflight.set(id, ctrl);
  try {
    const urls = await fetchPages(id, false, ctrl.signal);
    if (paused) return;
    if (!urls.length) {
      warmed.add(id); saveWarmed();
      maybeWarmMore();
      return;
    }
    totals.set(id, urls.length);
    pending.set(id, urls.length);
    chapterUrls.set(id, urls);
    warmOrder.push(id);
    worker();
  } catch {
    if (!ctrl.signal.aborted) {
      const n = (attempts.get(id) ?? 0) + 1;
      attempts.set(id, n);
      if (n >= MAX_ATTEMPTS) failed.add(id);
    }
  } finally {
    inflight.delete(id);
    pageListFetching = false;
    if (pageListQueue.length && !paused) void fetchNextPageList();
  }
}

// Chapters in the pipeline: page-list queued, being fetched, or downloading.
function warmingCount(): number {
  return pending.size + inflight.size + pageListQueue.length;
}

// Fill the pipeline up to chapterMax(); called on poll and when a chapter finishes.
function maybeWarmMore(): void {
  if (lastState !== "STARTED" || paused || !warmingEnabled()) return;
  if (!conversionsChecked) {
    void ensureConversionsChecked().then(() => maybeWarmMore());
    return;
  }
  if (conversionsOn) return;
  if (warmingCount() >= chapterMax()) return;

  const coldPerSource = new Map<string, number>();
  const erroredSources = new Set<string>();
  let added = 0;
  for (const item of lastQueue) {
    const src = item.chapter.manga?.sourceId ?? "";
    if (item.state === "ERROR") { erroredSources.add(src); continue; }
    if (item.state !== "QUEUED" && item.state !== "DOWNLOADING") continue;
    const id = item.chapter.id;
    if (warmed.has(id) || pending.has(id) || inflight.has(id) ||
        pageListQueue.includes(id) || chapterUrls.has(id)) continue;
    const cold = (coldPerSource.get(src) ?? 0) + 1;
    coldPerSource.set(src, cold);
    if (item.state !== "QUEUED" || failed.has(id) || erroredSources.has(src)) continue;
    if (cold > coldBuffer()) {
      pageListQueue.push(id);
      added++;
      if (warmingCount() >= chapterMax()) break;
    }
  }
  if (added > 0) void fetchNextPageList();
}

// Precache fraction for UI: 0 = not warming, 1 = fully pre-cached.
export function warmProgress(chapterId: number): number {
  if (warmed.has(chapterId)) return 1;
  const left  = pending.get(chapterId);
  const total = totals.get(chapterId);
  if (left === undefined || !total) return 0;
  return Math.min(1, (total - left) / total);
}

// Suwayomi's sequential downloader skips pages already in cache, so pre-caching queued chapters here in parallel speeds it up. A chapter is only warmed once COLD_BUFFER same-source chapters ahead still need a real download, so the warmer finishes writing before the downloader reaches it (a half-written page would corrupt the CBZ).
export function warmDownloads(state: string, queue: DownloadQueueItem[]): void {
  lastState = state;
  lastQueue = queue;

  if (state !== "STARTED") {
    // Pause/stop: clear transient state but keep `warmed` — the cached pages survive on the server, so the UI indicator persists.
    failed.clear();
    pending.clear();
    totals.clear();
    attempts.clear();
    pageFails.clear();
    chapterUrls.clear();
    warmOrder.length = 0;
    pageListQueue.length = 0;
    inflight.forEach(c => c.abort());
    inflight.clear();
    return;
  }

  // Chapters still in queue (queued or active) — exit set determines warmed pruning.
  const activeIds = new Set(
    queue.filter(i => i.state === "QUEUED" || i.state === "DOWNLOADING").map(i => i.chapter.id)
  );
  const queuedIds = new Set(
    queue.filter(i => i.state === "QUEUED").map(i => i.chapter.id)
  );
  // Stop warming a chapter the downloader picked up — page writes would race the downloader's reads on cache files.
  for (const id of [...inflight.keys(), ...pending.keys()]) {
    if (!queuedIds.has(id)) abortWarm(id);
  }
  for (let i = pageListQueue.length - 1; i >= 0; i--) {
    if (!queuedIds.has(pageListQueue[i])) pageListQueue.splice(i, 1);
  }
  // Prune warmed entries for chapters that left the queue (canceled/removed/finished-cleared).
  let warmedChanged = false;
  for (const id of warmed) {
    if (!activeIds.has(id)) { warmed.delete(id); warmedChanged = true; }
  }
  if (warmedChanged) saveWarmed();
  for (const id of failed) {
    if (!activeIds.has(id)) failed.delete(id);
  }
  for (const id of [...totals.keys()]) {
    if (!activeIds.has(id)) totals.delete(id);
  }
  for (const id of [...attempts.keys()]) {
    if (!activeIds.has(id)) attempts.delete(id);
  }
  if (paused) return;

  maybeWarmMore();
}
