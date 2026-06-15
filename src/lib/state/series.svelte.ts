import type { Manga, Chapter }                      from '$lib/types'
import type { BookmarkEntry, MarkerEntry, MarkerColor } from '$lib/types/history'
import type { MangaPrefs }                            from '$lib/types/settings'
import { settingsState, updateSettings }              from '$lib/state/settings.svelte'
import { getAdapter }                                 from '$lib/request-manager'
import { buildChapterList }                           from '$lib/components/series/lib/chapterList'
import { goto }                                       from '$app/navigation'

export type { BookmarkEntry, MarkerEntry, MarkerColor } from '$lib/types/history'
export type { MangaPrefs }                              from '$lib/types/settings'

export const DEFAULT_MANGA_PREFS: MangaPrefs = {
  autoDownload:           false,
  downloadAhead:          0,
  deleteOnRead:           false,
  deleteDelayHours:       0,
  maxKeepChapters:        0,
  pauseUpdates:           false,
  refreshInterval:        'global',
  preferredScanlator:     '',
  scanlatorFilter:        [],
  scanlatorBlacklist:     [],
  scanlatorForce:         false,
  autoDownloadScanlators: [],
}

const CHAPTER_TTL_MS = 2 * 60 * 1000

class SeriesStore {
  activeManga         = $state<Manga | null>(null)
  previewManga        = $state<Manga | null>(null)
  activeChapter       = $state<Chapter | null>(null)
  bookmarks           = $state<BookmarkEntry[]>([])
  markers             = $state<MarkerEntry[]>([])
  acknowledgedUpdates = $state<Set<number>>(new Set())

  #rawChapters = $state<Map<number, Chapter[]>>(new Map())
  #fetchedAt   = new Map<number, number>()
  #abortCtrls  = new Map<number, AbortController>()
  #loading     = $state<Set<number>>(new Set())
  #errors      = $state<Map<number, string>>(new Map())

  readonly activeChapterList = $derived.by(() => {
    const id = this.activeManga?.id
    if (id == null) return []
    const raw     = this.#rawChapters.get(id) ?? []
    const prefs   = settingsState.settings.mangaPrefs?.[id] ?? {}
    const globals = settingsState.settings
    return buildChapterList(raw, {
      sortMode:           globals.chapterSortMode,
      sortDir:            globals.chapterSortDir,
      preferredScanlator: (prefs.preferredScanlator  ?? DEFAULT_MANGA_PREFS.preferredScanlator),
      scanlatorFilter:    (prefs.scanlatorFilter     ?? DEFAULT_MANGA_PREFS.scanlatorFilter),
      scanlatorBlacklist: (prefs.scanlatorBlacklist  ?? DEFAULT_MANGA_PREFS.scanlatorBlacklist),
      scanlatorForce:     (prefs.scanlatorForce      ?? DEFAULT_MANGA_PREFS.scanlatorForce),
    })
  })

  readonly readerChapterList = $derived.by(() => {
    const id = this.activeManga?.id
    if (id == null) return []
    const raw   = this.#rawChapters.get(id) ?? []
    const prefs = settingsState.settings.mangaPrefs?.[id] ?? {}
    return buildChapterList(raw, {
      sortMode:           'source',
      sortDir:            'asc',
      preferredScanlator: (prefs.preferredScanlator  ?? DEFAULT_MANGA_PREFS.preferredScanlator),
      scanlatorFilter:    (prefs.scanlatorFilter     ?? DEFAULT_MANGA_PREFS.scanlatorFilter),
      scanlatorBlacklist: (prefs.scanlatorBlacklist  ?? DEFAULT_MANGA_PREFS.scanlatorBlacklist),
      scanlatorForce:     (prefs.scanlatorForce      ?? DEFAULT_MANGA_PREFS.scanlatorForce),
    })
  })

  chaptersFor(mangaId: number): Chapter[] { return this.#rawChapters.get(mangaId) ?? [] }
  isLoadingChapters(mangaId: number)      { return this.#loading.has(mangaId) }
  chapterError(mangaId: number)           { return this.#errors.get(mangaId) ?? null }

  async loadChapters(mangaId: number, { force = false } = {}): Promise<void> {
    const now    = Date.now()
    const stalest = this.#fetchedAt.get(mangaId) ?? 0
    const fresh  = !force && this.#rawChapters.has(mangaId) && now - stalest < CHAPTER_TTL_MS

    if (fresh) return

    this.#abortCtrls.get(mangaId)?.abort()
    const ctrl = new AbortController()
    this.#abortCtrls.set(mangaId, ctrl)

    this.#loading = new Set([...this.#loading, mangaId])
    this.#errors  = new Map(this.#errors)
    this.#errors.delete(mangaId)

    try {
      const adapter = getAdapter()
      let nodes = await adapter.getChapters(String(mangaId), ctrl.signal)

      if (!ctrl.signal.aborted && nodes.length === 0) {
        const fetched = await adapter.fetchChapters(String(mangaId), ctrl.signal)
        if (!ctrl.signal.aborted) nodes = fetched
      }

      if (ctrl.signal.aborted) return

      this.#rawChapters = new Map(this.#rawChapters).set(mangaId, nodes)
      this.#fetchedAt.set(mangaId, Date.now())
    } catch (e: unknown) {
      if ((e as { name?: string }).name === 'AbortError') return
      const msg = e instanceof Error ? e.message : String(e)
      this.#errors = new Map(this.#errors).set(mangaId, msg)
    } finally {
      if (!ctrl.signal.aborted) {
        const next = new Set(this.#loading)
        next.delete(mangaId)
        this.#loading = next
      }
    }
  }

  invalidateChapters(mangaId: number) {
    this.#fetchedAt.delete(mangaId)
  }

  patchChapters(mangaId: number, updater: (chapters: Chapter[]) => Chapter[]) {
    const current = this.#rawChapters.get(mangaId)
    if (!current) return
    this.#rawChapters = new Map(this.#rawChapters).set(mangaId, updater(current))
  }

  setActiveManga(manga: Manga | null)  { this.activeManga  = manga }
  setPreviewManga(manga: Manga | null) { this.previewManga = manga }

  openReaderForChapter(chapter: Chapter, manga?: Manga | null) {
    if (manga !== undefined) this.activeManga = manga
    const mangaId = this.activeManga?.id
    if (!mangaId) return

    const list  = this.readerChapterList
    const prefs = settingsState.settings.mangaPrefs?.[mangaId] ?? {}
    const ahead = (prefs.downloadAhead ?? DEFAULT_MANGA_PREFS.downloadAhead) as number

    if (ahead > 0) {
      const idx = list.findIndex(c => c.id === chapter.id)
      if (idx >= 0) {
        const toQueue = list
          .slice(idx + 1, idx + 1 + ahead)
          .filter(c => !c.downloaded && !c.read)
          .map(c => String(c.id))
        if (toQueue.length) getAdapter().enqueueDownloads(toQueue).catch(console.error)
      }
    }

    this.activeChapter = chapter
    goto(`/reader/${mangaId}/${chapter.id}`)
  }

  closeReader() {
    this.activeChapter = null
  }

  acknowledgeUpdate(mangaId: number) {
    if (this.acknowledgedUpdates.has(mangaId)) return
    this.acknowledgedUpdates = new Set([...this.acknowledgedUpdates, mangaId])
  }

  getPref<K extends keyof MangaPrefs>(mangaId: number, key: K): MangaPrefs[K] {
    const prefs = settingsState.settings.mangaPrefs?.[mangaId] ?? {}
    return (prefs[key] ?? DEFAULT_MANGA_PREFS[key]) as MangaPrefs[K]
  }

  setPref<K extends keyof MangaPrefs>(mangaId: number, key: K, value: MangaPrefs[K]) {
    updateSettings({
      mangaPrefs: {
        ...settingsState.settings.mangaPrefs,
        [mangaId]: { ...(settingsState.settings.mangaPrefs?.[mangaId] ?? {}), [key]: value },
      },
    })
  }

  addBookmark(entry: Omit<BookmarkEntry, 'savedAt'>, label?: string) {
    this.bookmarks = [
      { ...entry, savedAt: Date.now(), label },
      ...this.bookmarks.filter(b => b.chapterId !== entry.chapterId),
    ].slice(0, 200)
  }

  /** Sets the single "resume" bookmark for a manga, replacing any bookmark
   *  that exists for that manga in a different chapter. */
  setBookmark(entry: Omit<BookmarkEntry, 'savedAt'>, label?: string) {
    const other = this.bookmarks.find(b => b.mangaId === entry.mangaId && b.chapterId !== entry.chapterId)
    if (other) this.removeBookmark(other.chapterId)
    this.addBookmark(entry, label)
  }

  removeBookmark(chapterId: number) { this.bookmarks = this.bookmarks.filter(b => b.chapterId !== chapterId) }
  clearBookmarks()                  { this.bookmarks = [] }
  getBookmark(chapterId: number)    { return this.bookmarks.find(b => b.chapterId === chapterId) }

  addMarker(entry: Omit<MarkerEntry, 'id' | 'createdAt'>): string {
    const id = Math.random().toString(36).slice(2)
    this.markers = [...this.markers, { ...entry, id, createdAt: Date.now() }]
    return id
  }

  updateMarker(id: string, patch: Partial<Pick<MarkerEntry, 'note' | 'color'>>) {
    this.markers = this.markers.map(m => m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)
  }

  removeMarker(id: string)                           { this.markers = this.markers.filter(m => m.id !== id) }
  getMarkersForPage(chapterId: number, page: number) { return this.markers.filter(m => m.chapterId === chapterId && m.pageNumber === page) }
  getMarkersForChapter(chapterId: number)            { return this.markers.filter(m => m.chapterId === chapterId) }
  getMarkersForManga(mangaId: number)                { return this.markers.filter(m => m.mangaId === mangaId) }
  clearMarkersForManga(mangaId: number)              { this.markers = this.markers.filter(m => m.mangaId !== mangaId) }

  get settings() { return settingsState.settings }
}

export const seriesState = new SeriesStore()
export const seriesStore  = seriesState

export function setActiveManga(next: Manga | null)                                                  { seriesState.setActiveManga(next) }
export function setPreviewManga(next: Manga | null)                                                 { seriesState.setPreviewManga(next) }
export function openReaderForChapter(ch: Chapter, manga?: Manga | null)                             { seriesState.openReaderForChapter(ch, manga) }
export function closeReader()                                                                        { seriesState.closeReader() }
export function acknowledgeUpdate(mangaId: number)                                                  { seriesState.acknowledgeUpdate(mangaId) }
export function addBookmark(entry: Omit<BookmarkEntry, 'savedAt'>, label?: string)                  { seriesState.addBookmark(entry, label) }
export function setBookmark(entry: Omit<BookmarkEntry, 'savedAt'>, label?: string)                  { seriesState.setBookmark(entry, label) }
export function removeBookmark(chapterId: number)                                                   { seriesState.removeBookmark(chapterId) }
export function clearBookmarks()                                                                     { seriesState.clearBookmarks() }
export function getBookmark(chapterId: number)                                                      { return seriesState.getBookmark(chapterId) }
export function addMarker(entry: Omit<MarkerEntry, 'id' | 'createdAt'>): string                     { return seriesState.addMarker(entry) }
export function updateMarker(id: string, patch: Partial<Pick<MarkerEntry, 'note' | 'color'>>)       { seriesState.updateMarker(id, patch) }
export function removeMarker(id: string)                                                             { seriesState.removeMarker(id) }
export function getMarkersForPage(chapterId: number, page: number)                                  { return seriesState.getMarkersForPage(chapterId, page) }
export function getMarkersForChapter(chapterId: number)                                             { return seriesState.getMarkersForChapter(chapterId) }
export function getMarkersForManga(mangaId: number)                                                 { return seriesState.getMarkersForManga(mangaId) }
export function clearMarkersForManga(mangaId: number)                                               { seriesState.clearMarkersForManga(mangaId) }
export function getPref<K extends keyof MangaPrefs>(mangaId: number, key: K): MangaPrefs[K]         { return seriesState.getPref(mangaId, key) }
export function setPref<K extends keyof MangaPrefs>(mangaId: number, key: K, v: MangaPrefs[K])      { seriesState.setPref(mangaId, key, v) }