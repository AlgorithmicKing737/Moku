import type { DownloadItem } from "$lib/server-adapters/types";

export const downloadsState = $state({
  items: [] as DownloadItem[],
  error: null as string | null,
});

export function activeDownloads() {
  return downloadsState.items.filter(d => d.state === "downloading");
}

export function queuedDownloads() {
  return downloadsState.items.filter(d => d.state === "queued");
}

export function downloadCount() {
  return downloadsState.items.length;
}