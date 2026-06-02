import { dayLabel }     from '$lib/core/util'
import type { ReadSession } from '$lib/types/history'

export type { ReadSession }

export interface HistoryGroup {
  label: string
  items: ReadSession[]
}

export function groupByDay(sessions: ReadSession[]): HistoryGroup[] {
  const map = new Map<string, ReadSession[]>()
  for (const s of sessions) {
    const label = dayLabel(s.endedAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(s)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}