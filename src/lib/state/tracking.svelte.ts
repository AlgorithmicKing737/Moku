import { getAdapter }       from '$lib/request-manager'
import { settingsState }    from '$lib/state/settings.svelte'
import { buildChapterList } from '$lib/components/series/lib/chapterList'
import type { Tracker, TrackRecord } from '$lib/types'
import type { Chapter }              from '$lib/types'
import type { ChapterDisplayPrefs }  from '$lib/components/series/lib/chapterList'

type RecordMap = Map<number, TrackRecord[]>

class TrackingStore {
  private byManga: RecordMap = $state(new Map())

  trackers:       Tracker[]     = $state([])
  loading:        boolean       = $state(false)
  error:          string | null = $state(null)
  syncing:        boolean       = $state(false)

  recordsLoading: boolean       = $state(false)
  recordsError:   string | null = $state(null)
  searchResults:  unknown[]     = $state([])
  searchLoading:  boolean       = $state(false)
  searchError:    string | null = $state(null)

  private loadingFor = new Set<number>()

  recordsFor(mangaId: number): TrackRecord[] {
    return this.byManga.get(mangaId) ?? []
  }

  private setFor(mangaId: number, records: TrackRecord[]) {
    const next = new Map(this.byManga)
    next.set(mangaId, records)
    this.byManga = next
  }

  async loadForManga(mangaId: number) {
    if (this.loadingFor.has(mangaId)) return
    const existing = this.byManga.get(mangaId)
    if (existing && existing.length > 0) return

    this.loadingFor.add(mangaId)
    try {
      const records = await getAdapter().getMangaTrackRecords(String(mangaId)) as TrackRecord[]
      this.setFor(mangaId, records)
    } catch (e) {
      // silently ignore — tracking is non-critical
    } finally {
      this.loadingFor.delete(mangaId)
    }
  }

  async syncFromRemote(
    mangaId:  number,
    record:   TrackRecord,
    chapters: Chapter[],
    prefs:    ChapterDisplayPrefs,
  ): Promise<{ markedIds: number[] }> {
    if (!settingsState.settings.trackerSyncBack) return { markedIds: [] }

    try {
      await getAdapter().syncTracking(String(mangaId))
      const fresh = await getAdapter().getMangaTrackRecords(String(mangaId)) as TrackRecord[]
      this.setFor(mangaId, fresh)

      const freshRecord = fresh.find(r => r.id === record.id)
      if (!freshRecord) return { markedIds: [] }

      const markedIds = this._applyRemoteProgress(freshRecord, chapters, prefs)
      return { markedIds }
    } catch {
      return { markedIds: [] }
    }
  }

  private _applyRemoteProgress(
    record:   TrackRecord,
    chapters: Chapter[],
    prefs:    ChapterDisplayPrefs,
  ): number[] {
    const lastRead = record.lastChapterRead ?? 0
    if (lastRead <= 0) return []

    const threshold = settingsState.settings.trackerSyncBackThreshold ?? null
    const respectScanlator = settingsState.settings.trackerRespectScanlatorFilter ?? true
    const activeScanlators: string[] | null =
      respectScanlator && (prefs as any).scanlatorFilter?.length
        ? (prefs as any).scanlatorFilter
        : null

    return chapters
      .filter(ch => {
        if (ch.read) return false
        if (activeScanlators && ch.scanlator && !activeScanlators.includes(ch.scanlator)) return false
        return threshold !== null
          ? ch.chapterNumber <= lastRead && ch.chapterNumber >= lastRead - threshold
          : ch.chapterNumber <= lastRead
      })
      .map(ch => ch.id)
  }

  async updateFromRead(
    mangaId:     number,
    chapter:     Chapter,
    chapterList: Chapter[],
    prefs:       ChapterDisplayPrefs,
  ) {
    const records = this.recordsFor(mangaId)
    if (!records.length) return
    try {
      await getAdapter().syncTracking(String(mangaId))
      const fresh = await getAdapter().getMangaTrackRecords(String(mangaId)) as TrackRecord[]
      this.setFor(mangaId, fresh)
    } catch {}
  }

  async updateFromUnread(
    mangaId:     number,
    chapterList: Chapter[],
    prefs:       ChapterDisplayPrefs,
  ) {
    const records = this.recordsFor(mangaId)
    if (!records.length) return
    try {
      await getAdapter().syncTracking(String(mangaId))
      const fresh = await getAdapter().getMangaTrackRecords(String(mangaId)) as TrackRecord[]
      this.setFor(mangaId, fresh)
    } catch {}
  }

  clear(mangaId: number) {
    const next = new Map(this.byManga)
    next.delete(mangaId)
    this.byManga = next
  }
}

export const trackingState = new TrackingStore()

// Standalone export for components that run their own sync loop (e.g. TrackingSettings)
export async function syncBackFromTracker(
  records:  TrackRecord[],
  chapters: Chapter[],
  opts: {
    threshold:              number | null
    respectScanlatorFilter: boolean
    chapterPrefs:           Partial<any>
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

    if (!toMark.length) continue
    await markChaptersRead(toMark.map(ch => String(ch.id)), true)
    marked.push(...toMark)
  }

  return marked
}