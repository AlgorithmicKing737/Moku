import { historyState } from '$lib/state/history.svelte'

export const homeState = $state({
  heroSlots: [null, null, null, null] as [number | null, number | null, number | null, number | null],
})

export function getHistoryStats()       { return historyState.stats }
export function getHistorySessions()    { return historyState.sessions }
export function getHistoryDailyCounts() { return historyState.dailyReadCounts }

export function setHeroSlot(i: 1 | 2 | 3, mangaId: number | null) {
  homeState.heroSlots[i] = mangaId
}

export function clearHistory() {
  historyState.clearHistory()
}