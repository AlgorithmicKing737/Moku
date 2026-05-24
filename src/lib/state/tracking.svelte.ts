import type { Tracker } from '$lib/types'

export const trackingState = $state({
  trackers:       [] as Tracker[],
  loading:        false,
  error:          null as string | null,
  syncing:        false,

  records:        [] as unknown[],
  recordsLoading: false,
  recordsError:   null as string | null,

  searchResults:  [] as unknown[],
  searchLoading:  false,
  searchError:    null as string | null,
})