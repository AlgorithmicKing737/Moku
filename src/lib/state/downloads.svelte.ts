import type { DownloadItem } from '$lib/server-adapters/types'

export const downloadsState = $state({
  items: [] as DownloadItem[],
  error: null as string | null,
})

const activeDownloadsValue = $derived(
  downloadsState.items.filter(d => d.state === 'downloading')
)

const queuedDownloadsValue = $derived(
  downloadsState.items.filter(d => d.state === 'queued')
)

const downloadCountValue = $derived(downloadsState.items.length)

export function activeDownloads() {
  return activeDownloadsValue
}

export function queuedDownloads() {
  return queuedDownloadsValue
}

export function downloadCount() {
  return downloadCountValue
}
