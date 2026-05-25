import type { Tracker, TrackRecord } from '$lib/types'
import type { Chapter } from '$lib/types/chapter'
import type { MangaPrefs } from '$lib/types/settings'

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

export async function syncBackFromTracker(
  records: TrackRecord[],
  chapters: Chapter[],
  opts: {
    threshold:              number | null
    respectScanlatorFilter: boolean
    chapterPrefs:           Partial<MangaPrefs>
  },
  markChaptersRead: (ids: string[], read: boolean) => Promise<void>,
): Promise<Chapter[]> {
  const marked: Chapter[] = []

  const activeScanlators: string[] | null =
    opts.respectScanlatorFilter && opts.chapterPrefs.scanlatorFilter?.length
      ? opts.chapterPrefs.scanlatorFilter
      : null

  for (const record of records) {
    const lastRead = record.lastChapterRead ?? 0
    if (lastRead <= 0) continue

    const toMark = chapters.filter(ch => {
      if (ch.read) return false
      if (activeScanlators && ch.scanlator && !activeScanlators.includes(ch.scanlator)) return false
      return opts.threshold !== null
        ? ch.chapterNumber <= lastRead && ch.chapterNumber >= lastRead - opts.threshold
        : ch.chapterNumber <= lastRead
    })

    if (toMark.length === 0) continue

    await markChaptersRead(toMark.map(ch => String(ch.id)), true)
    marked.push(...toMark)
  }

  return marked
}