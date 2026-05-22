import type { DownloadItem } from '$lib/server-adapters/types'

export const downloadsState = $state({
  items: [] as DownloadItem[],
  error: null as string | null,
})

export const activeDownloads = $derived(
  downloadsState.items.filter(d => d.state === 'downloading')
)

export const queuedDownloads = $derived(
  downloadsState.items.filter(d => d.state === 'queued')
)

export const downloadCount = $derived(downloadsState.items.length)
