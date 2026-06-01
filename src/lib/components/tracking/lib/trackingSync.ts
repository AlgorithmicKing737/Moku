import type { Tracker, TrackRecord } from '$lib/types'
import { buildChapterList, type ChapterDisplayPrefs } from '$lib/components/series/lib/chapterList'
import type { Chapter } from '$lib/types'

export interface TrackerWithRecords extends Tracker {
  trackRecords: { nodes: TrackRecord[] }
}

export interface FlatRecord extends TrackRecord {
  tracker: Tracker
}

export type SortKey = 'title' | 'status' | 'score' | 'progress'

export function flattenRecords(trackers: TrackerWithRecords[]): FlatRecord[] {
  return trackers
    .filter((t) => t.isLoggedIn)
    .flatMap((t) =>
      t.trackRecords.nodes.map((r) => ({
        ...r,
        trackerId: r.trackerId ?? t.id,
        tracker:   t as Tracker,
      }))
    )
}

export function dedupeStatuses(trackers: TrackerWithRecords[]): { value: number; name: string }[] {
  const seen = new Map<string, { value: number; name: string }>()
  for (const t of trackers.filter((t) => t.isLoggedIn))
    for (const s of t.statuses ?? [])
      seen.set(`${s.value}:${s.name}`, s)
  return [...seen.values()]
}

export function filterRecords(
  records:      FlatRecord[],
  trackerId:    number | 'all',
  statusFilter: number | 'all',
  query:        string,
): FlatRecord[] {
  let list = trackerId === 'all'
    ? records
    : records.filter((r) => Number(r.trackerId) === Number(trackerId))

  if (statusFilter !== 'all')
    list = list.filter((r) => Number(r.status) === Number(statusFilter))

  if (query.trim()) {
    const q = query.toLowerCase()
    list = list.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.manga?.title?.toLowerCase().includes(q)
    )
  }

  return list
}

export function sortRecords(records: FlatRecord[], sortBy: SortKey): FlatRecord[] {
  return [...records].sort((a, b) => {
    if (sortBy === 'title')    return a.title.localeCompare(b.title)
    if (sortBy === 'status')   return a.status - b.status
    if (sortBy === 'score')    return parseFloat(b.displayScore ?? '0') - parseFloat(a.displayScore ?? '0')
    if (sortBy === 'progress') {
      const ap = a.totalChapters > 0 ? a.lastChapterRead / a.totalChapters : 0
      const bp = b.totalChapters > 0 ? b.lastChapterRead / b.totalChapters : 0
      return bp - ap
    }
    return 0
  })
}

export function calcProgress(lastChapterRead: number, totalChapters: number): number | null {
  if (totalChapters <= 0) return null
  return Math.min(100, (lastChapterRead / totalChapters) * 100)
}

export interface SyncBackOptions {
  threshold:              number | null
  respectScanlatorFilter: boolean
  chapterPrefs:           ChapterDisplayPrefs
}

export async function syncBackFromTracker(
  records:  TrackRecord[],
  chapters: Chapter[],
  opts:     SyncBackOptions,
  markRead: (ids: string[], read: boolean) => Promise<void>,
): Promise<number[]> {
  const eligible = buildChapterList(chapters, {
    ...opts.chapterPrefs,
    sortDir: 'asc',
    ...(opts.respectScanlatorFilter ? {} : {
      scanlatorFilter:    [],
      scanlatorBlacklist: [],
      scanlatorForce:     false,
    }),
  })

  // Dedupe to one chapter per integer floor (prefer exact integer)
  const seenInt = new Map<number, Chapter>()
  for (const ch of eligible) {
    if (!Number.isInteger(ch.chapterNumber)) continue
    const key = Math.floor(ch.chapterNumber)
    if (!seenInt.has(key)) seenInt.set(key, ch)
  }
  const dedupedEligible = [...seenInt.values()]

  // Also track decimal sub-chapters grouped by their floor
  const decimalsByFloor = new Map<number, Chapter[]>()
  for (const ch of eligible) {
    if (Number.isInteger(ch.chapterNumber)) continue
    const key = Math.floor(ch.chapterNumber)
    const arr = decimalsByFloor.get(key) ?? []
    arr.push(ch)
    decimalsByFloor.set(key, arr)
  }

  const toMarkRead: number[] = []

  for (const record of records) {
    const remote = record.lastChapterRead
    if (!remote || remote <= 0) continue

    for (const chapter of dedupedEligible) {
      if (chapter.read)                                                            continue
      if (chapter.chapterNumber > remote)                                          continue
      if (opts.threshold !== null && remote - chapter.chapterNumber > opts.threshold) continue
      toMarkRead.push(chapter.id)
      for (const dec of decimalsByFloor.get(chapter.chapterNumber) ?? []) {
        if (!dec.read) toMarkRead.push(dec.id)
      }
    }
  }

  const ids = [...new Set(toMarkRead)]
  if (ids.length > 0) {
    await markRead(ids.map(String), true)
  }
  return ids
}