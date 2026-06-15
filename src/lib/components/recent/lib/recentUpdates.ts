import { dayLabel } from '$lib/core/util'

export interface RecentUpdate {
  id:            number
  name:          string
  chapterNumber: number
  sourceOrder:   number
  isRead:        boolean
  lastPageRead:  number
  mangaId:       number
  fetchedAt:     string
  manga: { id: number; title: string; thumbnailUrl: string; inLibrary: boolean } | null
}

export interface UpdateGroup {
  label: string
  items: RecentUpdate[]
}

export interface UpdateStatus {
  isRunning:    boolean
  finishedJobs: number | null
  totalJobs:    number | null
  lastUpdated?: unknown
}

export function fetchedAtMs(item: Pick<RecentUpdate, 'fetchedAt'>): number {
  if (!item.fetchedAt) return Date.now()
  const numeric = Number(item.fetchedAt)
  if (Number.isFinite(numeric)) return numeric * 1000
  const ts = new Date(item.fetchedAt).getTime()
  return Number.isFinite(ts) ? ts : Date.now()
}

export function parseServerTimestamp(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
    const parsed = new Date(value).getTime()
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function groupUpdatesByDay(updates: RecentUpdate[]): UpdateGroup[] {
  const grouped: Record<string, RecentUpdate[]> = {}
  const order: Record<string, number> = {}
  for (const item of updates) {
    const ts = fetchedAtMs(item)
    const label = dayLabel(ts)
    if (!grouped[label]) {
      grouped[label] = []
      order[label] = ts
    }
    grouped[label].push(item)
    if (ts > order[label]) order[label] = ts
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => order[b] - order[a])
    .map(([label, items]) => ({ label, items }))
}