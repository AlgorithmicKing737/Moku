import type { DownloadQueueItem } from "$lib/types/api";

export function isRunning(state: string | undefined): boolean {
  return state === "STARTED";
}

export function getErrored(queue: DownloadQueueItem[]): DownloadQueueItem[] {
  return queue.filter(i => i.state === "ERROR");
}

export function pageProgress(progress: number, pageCount: number): { done: number; total: number } {
  return { done: Math.round(progress * pageCount), total: pageCount };
}

export interface SpeedSample {
  ts:       number;
  progress: number;
  pages:    number;
}

export function calcSpeed(prev: SpeedSample | null, current: SpeedSample): number | null {
  if (!prev) return null;
  const dt = (current.ts - prev.ts) / 1000;
  if (dt <= 0) return null;
  const delta = Math.round(current.progress * current.pages) - Math.round(prev.progress * prev.pages);
  if (delta <= 0) return null;
  return delta / dt;
}

export function estimateEta(pagesPerSec: number, queue: DownloadQueueItem[]): number | null {
  if (pagesPerSec <= 0 || !queue.length) return null;
  let remaining = 0;
  for (const item of queue) {
    const pages = item.chapter.pageCount ?? 0;
    remaining  += pages - Math.round(item.progress * pages);
  }
  const eta = remaining / pagesPerSec;
  return eta > 0 ? eta : null;
}

export function estimateQueueBytes(queue: DownloadQueueItem[]): number {
  const AVG = 1_500_000;
  let total = 0;
  for (const item of queue) {
    const pages = item.chapter.pageCount ?? 0;
    total += (pages - Math.round(item.progress * pages)) * AVG;
  }
  return total;
}

export function formatEta(seconds: number): string {
  if (seconds < 60)   return `~${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)}m`;
  return `~${(seconds / 3600).toFixed(1)}h`;
}