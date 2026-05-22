import { getAdapter } from '$lib/request-manager'
import { trackingState } from '$lib/state/tracking.svelte'

export async function loadTrackers() {
  trackingState.loading = true
  trackingState.error = null
  try {
    trackingState.trackers = await getAdapter().getTrackers()
  } catch (e) {
    trackingState.error = String(e)
  } finally {
    trackingState.loading = false
  }
}

export async function linkTracker(mangaId: string, trackerId: string, remoteId: string) {
  await getAdapter().linkTracker(mangaId, trackerId, remoteId)
  await loadTrackers()
}

export async function syncTracking(mangaId: string) {
  trackingState.syncing = true
  try {
    await getAdapter().syncTracking(mangaId)
  } finally {
    trackingState.syncing = false
  }
}
