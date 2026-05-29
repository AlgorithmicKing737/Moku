import { getAdapter }    from "$lib/request-manager";
import { trackingState } from "$lib/state/tracking.svelte";

export async function loadTrackers() {
  trackingState.loading = true;
  trackingState.error   = null;
  try {
    trackingState.trackers = await getAdapter().getTrackers();
  } catch (e) {
    trackingState.error = String(e);
  } finally {
    trackingState.loading = false;
  }
}

export async function loadMangaTrackRecords(mangaId: string) {
  trackingState.recordsLoading = true;
  trackingState.recordsError   = null;
  try {
    trackingState.records = await getAdapter().getMangaTrackRecords(mangaId);
  } catch (e) {
    trackingState.recordsError = String(e);
  } finally {
    trackingState.recordsLoading = false;
  }
}

export async function searchTracker(trackerId: string, query: string) {
  trackingState.searchLoading = true;
  trackingState.searchError   = null;
  try {
    trackingState.searchResults = await getAdapter().searchTracker(trackerId, query);
  } catch (e) {
    trackingState.searchError = String(e);
  } finally {
    trackingState.searchLoading = false;
  }
}

export async function linkTracker(mangaId: string, trackerId: string, remoteId: string) {
  await getAdapter().linkTracker(mangaId, trackerId, remoteId);
  await loadMangaTrackRecords(mangaId);
}

export async function unlinkTracker(mangaId: string, recordId: string) {
  await getAdapter().unlinkTracker(recordId);
  await loadMangaTrackRecords(mangaId);
}

export async function syncTracking(mangaId: string) {
  trackingState.syncing = true;
  try {
    await getAdapter().syncTracking(mangaId);
  } finally {
    trackingState.syncing = false;
  }
}