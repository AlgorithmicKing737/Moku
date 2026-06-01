import { dayLabel } from '$lib/core/util'

export interface HistorySession {
  mangaId:           number
  mangaTitle:        string
  thumbnailUrl:      string
  latestChapterId:   number
  latestChapterName: string
  latestPageNumber:  number
  firstChapterName:  string
  chapterCount:      number
  readAt:            number
}

export interface HistoryGroup {
  label: string
  items: HistorySession[]
}

const SESSION_GAP_MS = 30 * 60 * 1_000

export function buildSessions(entries: {
  mangaId:      number
  mangaTitle:   string
  thumbnailUrl: string
  chapterId:    number
  chapterName:  string
  pageNumber:   number
  readAt:       number
}[]): HistorySession[] {
  if (!entries.length) return []
  const sessions: HistorySession[] = []
  let i = 0
  while (i < entries.length) {
    const anchor = entries[i]
    const group  = [anchor]
    let j = i + 1
    while (j < entries.length) {
      const next = entries[j]
      if (next.mangaId === anchor.mangaId && anchor.readAt - next.readAt <= SESSION_GAP_MS) {
        group.push(next); j++
      } else break
    }
    const latest = group[0], oldest = group[group.length - 1]
    sessions.push({
      mangaId:           latest.mangaId,
      mangaTitle:        latest.mangaTitle,
      thumbnailUrl:      latest.thumbnailUrl,
      latestChapterId:   latest.chapterId,
      latestChapterName: latest.chapterName,
      latestPageNumber:  latest.pageNumber,
      firstChapterName:  oldest.chapterName,
      chapterCount:      group.length,
      readAt:            latest.readAt,
    })
    i = j
  }
  return sessions
}

export function groupByDay(sessions: HistorySession[]): HistoryGroup[] {
  const map = new Map<string, HistorySession[]>()
  for (const s of sessions) {
    const l = dayLabel(s.readAt)
    if (!map.has(l)) map.set(l, [])
    map.get(l)!.push(s)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}