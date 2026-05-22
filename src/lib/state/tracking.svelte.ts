import type { Tracker } from '$lib/types'

export const trackingState = $state({
  trackers: [] as Tracker[],
  loading: false,
  error: null as string | null,
  syncing: false,
})
