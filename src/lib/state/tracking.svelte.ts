import { getAdapter }        from '$lib/request-manager'
import { settingsState }     from '$lib/state/settings.svelte'
import { buildChapterList, type ChapterDisplayPrefs } from '$lib/components/series/lib/chapterList'
import { syncBackFromTracker }                        from '$lib/components/tracking/lib/trackingSync'
import type { Tracker, TrackRecord }  from '$lib/types'
import type { Chapter }               from '$lib/types'
import type { TrackerWithRecords }    from '$lib/components/tracking/lib/trackingSync'

const BOOT_SYNC_RATE_MS = 400

type RecordMap   = Map<number, TrackRecord[]>
type MangaBucket = { mangaId: number; records: TrackRecord[] }

class TrackingState {
  private byManga: RecordMap = $state(new Map())

  allTrackers: TrackerWithRecords[] = $state([])
  loadingAll:  boolean              = $state(false)
  loadingFor:  Set<number>          = $state(new Set())
  error:       string | null        = $state(null)

  trackers:       Tracker[]     = $state([])
  loading:        boolean       = $state(false)
  syncing:        boolean       = $state(false)
  recordsLoading: boolean       = $state(false)
  recordsError:   string | null = $state(null)
  searchResults:  unknown[]     = $state([])
  searchLoading:  boolean       = $state(false)
  searchError:    string | null = $state(null)

  recordsFor(mangaId: number): TrackRecord[] {
    return this.byManga.get(mangaId) ?? []
  }

  private setFor(mangaId: number, records: TrackRecord[]) {
    const next = new Map(this.byManga)
    next.set(mangaId, records)
    this.byManga = next
  }

  private patchFor(mangaId: number, updated: Partial<TrackRecord> & { id: number }) {
    const records = this.recordsFor(mangaId).map((r) =>
      r.id === updated.id ? { ...r, ...updated } : r
    )
    this.setFor(mangaId, records)

    this.allTrackers = this.allTrackers.map((t) => ({
      ...t,
      trackRecords: {
        nodes: t.trackRecords.nodes.map((r) =>
          r.id === updated.id ? { ...r, ...updated } : r
        ),
      },
    }))
  }


  async loadForManga(mangaId: number) {
    if (this.loadingFor.has(mangaId)) return
    const existing = this.byManga.get(mangaId)
    if (existing && existing.length > 0) return

    const next = new Set(this.loadingFor)
    next.add(mangaId)
    this.loadingFor = next

    try {
      const records = await getAdapter().getMangaTrackRecords(String(mangaId)) as TrackRecord[]
      this.setFor(mangaId, records)
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Failed to load tracking'
    } finally {
      const s = new Set(this.loadingFor)
      s.delete(mangaId)
      this.loadingFor = s
    }
  }

  async loadAll() {
    this.loadingAll = true
    this.error      = null
    try {
      const trackers = await getAdapter().getAllTrackerRecords() as TrackerWithRecords[]
      this.allTrackers = trackers
      this.trackers    = trackers

      for (const tracker of trackers.filter((t) => t.isLoggedIn)) {
        for (const record of tracker.trackRecords.nodes) {
          if (!record.manga?.id) continue
          const mangaId  = record.manga.id
          const existing = this.byManga.get(mangaId) ?? []
          const merged   = [...existing.filter((r) => r.id !== record.id), record]
          this.setFor(mangaId, merged)
        }
      }
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Failed to load tracking'
    } finally {
      this.loadingAll = false
    }
  }

  async updateStatus(mangaId: number, record: TrackRecord, status: number): Promise<TrackRecord> {
    const fresh = await getAdapter().updateTrackRecord(String(record.id), { status })
    this.patchFor(mangaId, fresh)
    return fresh
  }

  async updateScore(mangaId: number, record: TrackRecord, scoreString: string): Promise<TrackRecord> {
    const fresh = await getAdapter().updateTrackRecord(String(record.id), { scoreString })
    this.patchFor(mangaId, fresh)
    return fresh
  }

  async updateChapterProgress(mangaId: number, record: TrackRecord, lastChapterRead: number): Promise<TrackRecord> {
    const fresh = await getAdapter().updateTrackRecord(String(record.id), { lastChapterRead })
    this.patchFor(mangaId, fresh)
    return fresh
  }

  async unbind(mangaId: number, record: TrackRecord) {
    await getAdapter().unlinkTracker(String(record.id))
    this.setFor(mangaId, this.recordsFor(mangaId).filter((r) => r.id !== record.id))
    this.allTrackers = this.allTrackers.map((t) => ({
      ...t,
      trackRecords: { nodes: t.trackRecords.nodes.filter((r) => r.id !== record.id) },
    }))
  }


  async syncFromRemote(
    mangaId:  number,
    record:   TrackRecord,
    chapters: Chapter[],
    prefs:    ChapterDisplayPrefs,
  ): Promise<{ fresh: TrackRecord; markedIds: number[] }> {
    const fresh = await getAdapter().fetchTrackRecord(String(record.id)) as TrackRecord
    this.patchFor(mangaId, fresh)

    const markedIds = await this._applyRemoteProgress(fresh, chapters, prefs)
    return { fresh, markedIds }
  }

  private async _applyRemoteProgress(
    record:   TrackRecord,
    chapters: Chapter[],
    prefs:    ChapterDisplayPrefs,
  ): Promise<number[]> {
    if (!settingsState.settings.trackerSyncBack) return []

    return syncBackFromTracker(
      [record],
      chapters,
      {
        threshold:              settingsState.settings.trackerSyncBackThreshold ?? null,
        respectScanlatorFilter: settingsState.settings.trackerRespectScanlatorFilter ?? true,
        chapterPrefs:           prefs,
      },
      (ids, read) => getAdapter().markChaptersRead(ids, read),
    )
  }


  async updateFromRead(
    mangaId:     number,
    chapter:     Chapter,
    chapterList: Chapter[],
    prefs:       ChapterDisplayPrefs,
  ) {
    const filtered = buildChapterList(chapterList, { ...prefs, sortDir: 'asc' })
    const idx      = filtered.findIndex((c) => c.id === chapter.id)
    if (idx < 0) return
    const position = idx + 1

    const records = this.recordsFor(mangaId)
    for (const record of records) {
      try {
        const completedValue = this._completedStatusFor(record.trackerId)
        const isCompleted    = completedValue !== null && record.status === completedValue
        const readingValue   = this._readingStatusFor(record.trackerId)
        const belowMax       = record.totalChapters > 0 && (record.lastChapterRead ?? 0) < record.totalChapters

        if ((isCompleted || belowMax) && readingValue !== null && position > (record.lastChapterRead ?? 0)) {
          const fresh = await getAdapter().updateTrackRecord(String(record.id), {
            lastChapterRead: position,
            status:          readingValue,
          })
          this.patchFor(mangaId, fresh)
        } else if (!isCompleted && position > (record.lastChapterRead ?? 0)) {
          await this.updateChapterProgress(mangaId, record, position)
        }
      } catch {}
    }
  }

  async updateFromUnread(
    mangaId:     number,
    chapterList: Chapter[],
    prefs:       ChapterDisplayPrefs,
  ) {
    const filtered = buildChapterList(chapterList, { ...prefs, sortDir: 'asc' })
    const lastRead = [...filtered].reverse().find((c) => c.read)
    const position = lastRead ? filtered.findIndex((c) => c.id === lastRead.id) + 1 : 0

    const records = this.recordsFor(mangaId)
    for (const record of records.filter((r) => (r.lastChapterRead ?? 0) > position)) {
      try {
        const completedValue = this._completedStatusFor(record.trackerId)
        const isCompleted    = completedValue !== null && record.status === completedValue
        const belowMax       = record.totalChapters > 0 && position < record.totalChapters
        const readingValue   = this._readingStatusFor(record.trackerId)

        if ((isCompleted || belowMax) && readingValue !== null) {
          const fresh = await getAdapter().updateTrackRecord(String(record.id), {
            lastChapterRead: position,
            status:          readingValue,
          })
          this.patchFor(mangaId, fresh)
        } else {
          await this.updateChapterProgress(mangaId, record, position)
        }
      } catch {}
    }
  }


  async bootSync() {
    if (!settingsState.settings.trackerSyncBack) return
    if (this.allTrackers.length === 0) await this.loadAll()

    const buckets = new Map<number, MangaBucket>()

    for (const tracker of this.allTrackers.filter((t) => t.isLoggedIn)) {
      const completedValue = this._completedStatusFor(tracker.id)
      for (const record of tracker.trackRecords.nodes) {
        const mangaId = record.manga?.id
        if (!mangaId) continue
        if (completedValue !== null && record.status === completedValue) continue
        const bucket = buckets.get(mangaId) ?? { mangaId, records: [] }
        bucket.records.push(record)
        buckets.set(mangaId, bucket)
      }
    }

    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    for (const { mangaId, records } of buckets.values()) {
      const prefs = { ...(settingsState.settings.mangaPrefs?.[mangaId] ?? {}) } as ChapterDisplayPrefs

      let chapters: Chapter[]
      try {
        chapters = await getAdapter().getChapters(String(mangaId))
      } catch {
        continue
      }

      const freshRecords: TrackRecord[] = []
      for (const record of records) {
        await delay(BOOT_SYNC_RATE_MS)
        try {
          const fresh = await getAdapter().fetchTrackRecord(String(record.id)) as TrackRecord
          this.patchFor(mangaId, fresh)
          freshRecords.push(fresh)
        } catch {
          freshRecords.push(record)
        }
      }

      try {
        await syncBackFromTracker(
          freshRecords,
          chapters,
          {
            threshold:              settingsState.settings.trackerSyncBackThreshold ?? null,
            respectScanlatorFilter: settingsState.settings.trackerRespectScanlatorFilter ?? true,
            chapterPrefs:           prefs,
          },
          (ids, read) => getAdapter().markChaptersRead(ids, read),
        )
      } catch {}
    }
  }

  clear(mangaId: number) {
    const next = new Map(this.byManga)
    next.delete(mangaId)
    this.byManga = next
  }


  private _statusesFor(trackerId: number): { value: number; name: string }[] {
    return this.allTrackers.find((t) => t.id === trackerId)?.statuses ?? []
  }

  private _completedStatusFor(trackerId: number): number | null {
    const s = this._statusesFor(trackerId).find((s) => s.name.toLowerCase() === 'completed')
    return s?.value ?? null
  }

  private _readingStatusFor(trackerId: number): number | null {
    const s = this._statusesFor(trackerId).find((s) => s.name.toLowerCase() === 'reading')
    return s?.value ?? null
  }
}

export const trackingState = new TrackingState()