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
  const ts = item.fetchedAt ? new Date(item.fetchedAt).getTime() : Date.now()
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
  for (const item of updates) {
    const label = dayLabel(fetchedAtMs(item))
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(item)
  }
  return Object.entries(grouped).map(([label, items]) => ({ label, items }))
}