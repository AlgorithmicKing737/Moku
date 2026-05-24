import {getAdapter} from '$lib/request-manager';
import {trackingState} from '$lib/state/tracking.svelte';
import type {TrackRecord} from '$lib/types/index';

export async function loadTrackers() {
  trackingState.loading = true;
  trackingState.error = null;
  try {
    trackingState.trackers = await getAdapter().getTrackers();
  } catch (e) {
    trackingState.error = String(e);
  } finally {
    trackingState.loading = false;
  }
}

export async function loadTrackerRecords(): Promise<TrackRecord[]> {
  return getAdapter().getTrackerRecords();
}

export async function loginTrackerOAuth(trackerId: number, callbackUrl: string) {
  await getAdapter().loginTrackerOAuth(trackerId, callbackUrl);
  await loadTrackers();
}

export async function loginTrackerCredentials(trackerId: number, username: string, password: string) {
  await getAdapter().loginTrackerCredentials(trackerId, username, password);
  await loadTrackers();
}

export async function logoutTracker(trackerId: number) {
  await getAdapter().logoutTracker(trackerId);
  await loadTrackers();
}

export async function linkTracker(mangaId: string, trackerId: string, remoteId: string) {
  await getAdapter().linkTracker(mangaId, trackerId, remoteId);
  await loadTrackers();
}

export async function syncTracking(mangaId: string) {
  trackingState.syncing = true;
  try {
    await getAdapter().syncTracking(mangaId);
  } finally {
    trackingState.syncing = false;
  }
}
