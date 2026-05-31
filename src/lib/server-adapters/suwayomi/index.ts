import type {
  ServerAdapter,
  ServerConfig,
  ServerStatus,
  MangaFilters,
  MangaMeta,
  PaginatedResult,
  Page,
  DownloadItem,
  UpdateResult,
  LibraryUpdateProgress,
  ServerSecurity,
  SetServerAuthInput,
  SetSocksProxyInput,
  SetFlareSolverrInput,
} from '$lib/server-adapters/types'
import type { DownloadStatus } from '$lib/types/api'
import type { Manga, Chapter, Extension, Source, Tracker, Category } from '$lib/types'
import {
  GET_LIBRARY,
  GET_MANGA,
  GET_CATEGORIES,
  FETCH_MANGA,
  UPDATE_MANGA,
  UPDATE_MANGAS,
  UPDATE_MANGA_CATEGORIES,
  UPDATE_MANGAS_CATEGORIES,
  CREATE_CATEGORY,
  DELETE_CATEGORY,
  UPDATE_CATEGORY_ORDER,
  UPDATE_CATEGORY_MANGA,
  UPDATE_LIBRARY,
  UPDATE_LIBRARY_MANGA,
  UPDATE_STOP,
  SET_MANGA_META,
  DELETE_MANGA_META,
  FETCH_SOURCE_MANGA,
  LIBRARY_UPDATE_STATUS,
  MANGAS_BY_GENRE,
} from './manga'
import {
  GET_CHAPTERS,
  GET_CHAPTER,
  GET_RECENTLY_UPDATED,
  FETCH_CHAPTERS,
  FETCH_CHAPTER_PAGES,
  MARK_CHAPTER_READ,
  MARK_CHAPTERS_READ,
  UPDATE_CHAPTERS_PROGRESS,
  DELETE_DOWNLOADED_CHAPTERS,
  SET_CHAPTER_META,
  DELETE_CHAPTER_META,
} from './chapters'
import {
  GET_DOWNLOAD_STATUS,
  ENQUEUE_DOWNLOAD,
  ENQUEUE_CHAPTERS_DOWNLOAD,
  DEQUEUE_DOWNLOAD,
  DEQUEUE_CHAPTERS_DOWNLOAD,
  REORDER_DOWNLOAD,
  START_DOWNLOADER,
  STOP_DOWNLOADER,
  CLEAR_DOWNLOADER,
} from './downloads'
import {
  GET_EXTENSIONS,
  GET_SOURCES,
  GET_SERVER_SECURITY,
  FETCH_EXTENSIONS,
  UPDATE_EXTENSION,
  UPDATE_EXTENSIONS,
  INSTALL_EXTERNAL_EXTENSION,
  SET_SERVER_AUTH,
} from './extensions'
import {
  GET_TRACKERS,
  GET_MANGA_TRACK_RECORDS,
  SEARCH_TRACKER,
  BIND_TRACK,
  UNLINK_TRACK,
  TRACK_PROGRESS,
  UPDATE_TRACK,
} from './tracking'
import {
  type GQLResponse,
  mapManga,
  mapChapter,
  mapExtension,
  mapDownloadItem,
  mapCategory,
} from './types'
import { initPageCache, clearPageCache as _clearPageCache } from './pageCache'

const SET_SOCKS_PROXY = `
  mutation SetSocksProxy(
    $socksProxyEnabled: Boolean!
    $socksProxyHost: String!
    $socksProxyPort: String!
    $socksProxyVersion: Int!
    $socksProxyUsername: String!
    $socksProxyPassword: String!
  ) {
    setSettings(input: { settings: {
      socksProxyEnabled: $socksProxyEnabled
      socksProxyHost: $socksProxyHost
      socksProxyPort: $socksProxyPort
      socksProxyVersion: $socksProxyVersion
      socksProxyUsername: $socksProxyUsername
      socksProxyPassword: $socksProxyPassword
    }}) {
      settings { socksProxyEnabled socksProxyHost socksProxyPort }
    }
  }
`

const SET_FLARE_SOLVERR = `
  mutation SetFlareSolverr(
    $flareSolverrEnabled: Boolean!
    $flareSolverrUrl: String!
    $flareSolverrTimeout: Int!
    $flareSolverrSessionName: String!
    $flareSolverrSessionTtl: Int!
    $flareSolverrAsResponseFallback: Boolean!
  ) {
    setSettings(input: { settings: {
      flareSolverrEnabled: $flareSolverrEnabled
      flareSolverrUrl: $flareSolverrUrl
      flareSolverrTimeout: $flareSolverrTimeout
      flareSolverrSessionName: $flareSolverrSessionName
      flareSolverrSessionTtl: $flareSolverrSessionTtl
      flareSolverrAsResponseFallback: $flareSolverrAsResponseFallback
    }}) {
      settings { flareSolverrEnabled flareSolverrUrl }
    }
  }
`

type RawQueueItem = Record<string, unknown>

function mapDownloadStatus(raw: { state: string; queue: RawQueueItem[] }): DownloadStatus {
  return {
    state: raw.state,
    queue: raw.queue.map(item => ({
      progress: (item.progress as number) ?? 0,
      state:    item.state as string,
      tries:    (item.tries as number) ?? 0,
      chapter:  item.chapter as DownloadStatus['queue'][number]['chapter'],
    })),
  }
}

export class SuwayomiAdapter implements ServerAdapter {
  private baseUrl = 'http://127.0.0.1:4567'
  private authHeader: string | null = null

  async connect(config: ServerConfig): Promise<void> {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    if (config.credentials) {
      const { username, password } = config.credentials
      this.authHeader = 'Basic ' + btoa(`${username}:${password}`)
    }
    initPageCache(this.gql.bind(this), this.getServerUrl.bind(this))
  }

  getServerUrl(): string {
    return this.baseUrl
  }

  async getStatus(): Promise<ServerStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/graphql`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ query: '{ aboutServer { name } }' }),
      })
      return res.ok ? 'connected' : 'error'
    } catch {
      return 'disconnected'
    }
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.authHeader) h['Authorization'] = this.authHeader
    return h
  }

  private async gql<T>(
    query: string,
    variables?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/graphql`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ query, variables }),
      signal,
    })
    if (!res.ok) throw new Error(`Suwayomi HTTP ${res.status}`)
    const json: GQLResponse<T> = await res.json()
    if (json.errors?.length) throw new Error(json.errors[0].message)
    return json.data
  }

  async getManga(id: string): Promise<Manga> {
    const data = await this.gql<{ manga: Record<string, unknown> }>(GET_MANGA, { id: Number(id) })
    return mapManga(data.manga)
  }

  async fetchManga(id: string): Promise<Manga> {
    const data = await this.gql<{ fetchManga: { manga: Record<string, unknown> } }>(
      FETCH_MANGA, { id: Number(id) }
    )
    return mapManga(data.fetchManga.manga)
  }

  async getMangaList(filters: MangaFilters): Promise<PaginatedResult<Manga>> {
    const data = await this.gql<{ mangas: { nodes: Record<string, unknown>[] } }>(GET_LIBRARY)
    let items = data.mangas.nodes.map(mapManga)
    if (filters.status)       items = items.filter(m => m.status === filters.status)
    if (filters.tags?.length) items = items.filter(m => filters.tags!.every(t => m.tags?.includes(t)))
    if (filters.unread)       items = items.filter(m => (m.unreadCount ?? 0) > 0)
    if (filters.sourceId)     items = items.filter(m => String(m.source?.id) === filters.sourceId)
    return { items, hasNextPage: false }
  }

  async searchManga(query: string, sourceId?: string): Promise<Manga[]> {
    if (!sourceId) return []
    const data = await this.gql<{ fetchSourceManga: { mangas: Record<string, unknown>[] } }>(
      FETCH_SOURCE_MANGA, { source: sourceId, type: 'SEARCH', page: 1, query }
    )
    return data.fetchSourceManga.mangas.map(mapManga)
  }

  async addToLibrary(mangaId: string): Promise<void> {
    await this.gql(UPDATE_MANGA, { id: Number(mangaId), inLibrary: true })
  }

  async removeFromLibrary(mangaId: string): Promise<void> {
    await this.gql(UPDATE_MANGA, { id: Number(mangaId), inLibrary: false })
  }

  async updateMangas(ids: string[], patch: { inLibrary?: boolean }): Promise<void> {
    await this.gql(UPDATE_MANGAS, { ids: ids.map(Number), ...patch })
  }

  async updateMangaMeta(id: string, meta: Partial<MangaMeta>): Promise<void> {
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined) continue
      await this.gql(SET_MANGA_META, { mangaId: Number(id), key, value: String(value) })
    }
  }

  async deleteMangaMeta(id: string, key: string): Promise<void> {
    await this.gql(DELETE_MANGA_META, { mangaId: Number(id), key })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const data = await this.gql<{ chapters: { nodes: Record<string, unknown>[] } }>(
      GET_CHAPTERS, { mangaId: Number(mangaId) }
    )
    return data.chapters.nodes.map(mapChapter)
  }

  async getChapter(id: string): Promise<Chapter> {
    const data = await this.gql<{ chapter: Record<string, unknown> }>(
      GET_CHAPTER, { id: Number(id) }
    )
    return mapChapter(data.chapter)
  }

  async getChapterPages(id: string, signal?: AbortSignal): Promise<Page[]> {
    const data = await this.gql<{ fetchChapterPages: { pages: string[] } }>(
      FETCH_CHAPTER_PAGES, { chapterId: Number(id) }, signal
    )
    return data.fetchChapterPages.pages.map((url, index) => ({ index, url }))
  }

  async fetchChapters(mangaId: string): Promise<Chapter[]> {
    const data = await this.gql<{ fetchChapters: { chapters: Record<string, unknown>[] } }>(
      FETCH_CHAPTERS, { mangaId: Number(mangaId) }
    )
    return data.fetchChapters.chapters.map(mapChapter)
  }

  async getRecentlyUpdated(): Promise<Chapter[]> {
    const data = await this.gql<{ chapters: { nodes: Record<string, unknown>[] } }>(
      GET_RECENTLY_UPDATED
    )
    return data.chapters.nodes.map(mapChapter)
  }

  async markChapterRead(id: string, read: boolean): Promise<void> {
    await this.gql(MARK_CHAPTER_READ, { id: Number(id), isRead: read })
  }

  async markChaptersRead(ids: string[], read: boolean): Promise<void> {
    await this.gql(MARK_CHAPTERS_READ, { ids: ids.map(Number), isRead: read })
  }

  async updateChaptersProgress(
    ids: string[],
    patch: { isRead?: boolean; isBookmarked?: boolean; lastPageRead?: number },
  ): Promise<void> {
    await this.gql(UPDATE_CHAPTERS_PROGRESS, { ids: ids.map(Number), ...patch })
  }

  async deleteDownloadedChapters(ids: string[]): Promise<void> {
    await this.gql(DELETE_DOWNLOADED_CHAPTERS, { ids: ids.map(Number) })
  }

  async setChapterMeta(chapterId: string, key: string, value: string): Promise<void> {
    await this.gql(SET_CHAPTER_META, { chapterId: Number(chapterId), key, value })
  }

  async deleteChapterMeta(chapterId: string, key: string): Promise<void> {
    await this.gql(DELETE_CHAPTER_META, { chapterId: Number(chapterId), key })
  }

  // ── Downloads ──────────────────────────────────────────────────────────────

  /** @deprecated Use getDownloadStatus() — kept for any legacy callers. */
  async getDownloads(): Promise<DownloadItem[]> {
    const status = await this.getDownloadStatus()
    return status.queue.map(item => ({
      chapterId:   String(item.chapter.id),
      mangaId:     String(item.chapter.mangaId ?? item.chapter.manga?.id),
      chapterName: item.chapter.name,
      mangaTitle:  item.chapter.manga?.title ?? '',
      progress:    item.progress,
      state:       item.state === 'DOWNLOADING' ? 'downloading'
                 : item.state === 'FINISHED'    ? 'finished'
                 : item.state === 'ERROR'       ? 'error'
                 : 'queued',
    }))
  }

  async getDownloadStatus(): Promise<DownloadStatus> {
    const data = await this.gql<{
      downloadStatus: { state: string; queue: RawQueueItem[] }
    }>(GET_DOWNLOAD_STATUS)
    return mapDownloadStatus(data.downloadStatus)
  }

  async enqueueDownload(chapterId: string): Promise<void> {
    await this.gql(ENQUEUE_DOWNLOAD, { chapterId: Number(chapterId) })
  }

  async enqueueDownloads(chapterIds: string[]): Promise<void> {
    await this.gql(ENQUEUE_CHAPTERS_DOWNLOAD, { chapterIds: chapterIds.map(Number) })
  }

  async dequeueDownload(chapterId: string): Promise<void> {
    await this.gql(DEQUEUE_DOWNLOAD, { chapterId: Number(chapterId) })
  }

  async dequeueDownloads(chapterIds: string[]): Promise<void> {
    await this.gql(DEQUEUE_CHAPTERS_DOWNLOAD, { chapterIds: chapterIds.map(Number) })
  }

  async reorderDownload(chapterId: string, to: number): Promise<DownloadStatus | null> {
    try {
      const data = await this.gql<{
        reorderChapterDownload: { downloadStatus: { state: string; queue: RawQueueItem[] } }
      }>(REORDER_DOWNLOAD, { chapterId: Number(chapterId), to })
      return mapDownloadStatus(data.reorderChapterDownload.downloadStatus)
    } catch {
      return null
    }
  }

  async clearDownloads(): Promise<void> {
    await this.gql(CLEAR_DOWNLOADER)
  }

  async startDownloader(): Promise<DownloadStatus | null> {
    try {
      const data = await this.gql<{
        startDownloader: { downloadStatus: { state: string; queue: RawQueueItem[] } }
      }>(START_DOWNLOADER)
      return mapDownloadStatus(data.startDownloader.downloadStatus)
    } catch { return null }
  }

  async stopDownloader(): Promise<DownloadStatus | null> {
    try {
      const data = await this.gql<{
        stopDownloader: { downloadStatus: { state: string; queue: RawQueueItem[] } }
      }>(STOP_DOWNLOADER)
      return mapDownloadStatus(data.stopDownloader.downloadStatus)
    } catch { return null }
  }

  // ── Extensions & Sources ───────────────────────────────────────────────────

  async getExtensions(): Promise<Extension[]> {
    await this.gql(FETCH_EXTENSIONS)
    const data = await this.gql<{ extensions: { nodes: Record<string, unknown>[] } }>(GET_EXTENSIONS)
    return data.extensions.nodes.map(mapExtension)
  }

  async installExtension(id: string): Promise<void> {
    await this.gql(UPDATE_EXTENSION, { id, install: true })
  }

  async uninstallExtension(id: string): Promise<void> {
    await this.gql(UPDATE_EXTENSION, { id, uninstall: true })
  }

  async updateExtension(id: string): Promise<void> {
    await this.gql(UPDATE_EXTENSION, { id, update: true })
  }

  async updateExtensions(ids: string[]): Promise<void> {
    await this.gql(UPDATE_EXTENSIONS, { ids, update: true })
  }

  async installExternalExtension(url: string): Promise<void> {
    await this.gql(INSTALL_EXTERNAL_EXTENSION, { url })
  }

  async getSources(): Promise<Source[]> {
    const data = await this.gql<{ sources: { nodes: Source[] } }>(GET_SOURCES)
    return data.sources.nodes
  }

  async browseSource(sourceId: string, page: number): Promise<PaginatedResult<Manga>> {
    const data = await this.gql<{
      fetchSourceManga: { mangas: Record<string, unknown>[]; hasNextPage: boolean }
    }>(FETCH_SOURCE_MANGA, { source: sourceId, type: 'LATEST', page })
    return {
      items: data.fetchSourceManga.mangas.map(mapManga),
      hasNextPage: data.fetchSourceManga.hasNextPage,
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    const data = await this.gql<{ categories: { nodes: Record<string, unknown>[] } }>(GET_CATEGORIES)
    return data.categories.nodes.map(mapCategory)
  }

  async createCategory(name: string): Promise<Category> {
    const data = await this.gql<{ createCategory: { category: Record<string, unknown> } }>(
      CREATE_CATEGORY, { name }
    )
    return mapCategory(data.createCategory.category)
  }

  async deleteCategory(id: number): Promise<void> {
    await this.gql(DELETE_CATEGORY, { id })
  }

  async updateCategoryOrder(id: number, position: number): Promise<Category[]> {
    const data = await this.gql<{ updateCategoryOrder: { categories: Record<string, unknown>[] } }>(
      UPDATE_CATEGORY_ORDER, { id, position }
    )
    return data.updateCategoryOrder.categories.map(mapCategory)
  }

  async updateMangaCategories(mangaId: string, addTo: number[], removeFrom: number[]): Promise<void> {
    await this.gql(UPDATE_MANGA_CATEGORIES, { mangaId: Number(mangaId), addTo, removeFrom })
  }

  async updateMangasCategories(mangaIds: string[], addTo: number[], removeFrom: number[]): Promise<void> {
    await this.gql(UPDATE_MANGAS_CATEGORIES, { ids: mangaIds.map(Number), addTo, removeFrom })
  }

  async updateCategoryManga(categoryId: number): Promise<void> {
    await this.gql(UPDATE_CATEGORY_MANGA, { categoryId })
  }

  // ── Tracking ───────────────────────────────────────────────────────────────

  async getTrackers(): Promise<Tracker[]> {
    const data = await this.gql<{ trackers: { nodes: Tracker[] } }>(GET_TRACKERS)
    return data.trackers.nodes
  }

  async getMangaTrackRecords(mangaId: string): Promise<unknown[]> {
    const data = await this.gql<{ manga: { trackRecords: { nodes: unknown[] } } }>(
      GET_MANGA_TRACK_RECORDS, { mangaId: Number(mangaId) }
    )
    return data.manga.trackRecords.nodes
  }

  async searchTracker(trackerId: string, query: string): Promise<unknown[]> {
    const data = await this.gql<{ searchTracker: { trackSearches: unknown[] } }>(
      SEARCH_TRACKER, { trackerId: Number(trackerId), query }
    )
    return data.searchTracker.trackSearches
  }

  async linkTracker(mangaId: string, trackerId: string, remoteId: string): Promise<void> {
    await this.gql(BIND_TRACK, {
      mangaId: Number(mangaId),
      trackerId: Number(trackerId),
      remoteId,
    })
  }

  async unlinkTracker(recordId: string): Promise<void> {
    await this.gql(UNLINK_TRACK, { trackRecordId: Number(recordId) })
  }

  async fetchTrackRecord(recordId: string): Promise<void> {
    await this.gql(UPDATE_TRACK, { recordId: Number(recordId) })
  }

  async syncTracking(mangaId: string): Promise<void> {
    await this.gql(TRACK_PROGRESS, { mangaId: Number(mangaId) })
  }

  // ── Security ───────────────────────────────────────────────────────────────

  async getServerSecurity(): Promise<ServerSecurity> {
    const data = await this.gql<{ settings: ServerSecurity }>(GET_SERVER_SECURITY)
    return data.settings
  }

  async setServerAuth(input: SetServerAuthInput): Promise<void> {
    await this.gql(SET_SERVER_AUTH, {
      authMode: input.authMode,
      authUsername: input.authUsername,
      authPassword: input.authPassword,
    })
  }

  async setSocksProxy(input: SetSocksProxyInput): Promise<void> {
    await this.gql(SET_SOCKS_PROXY, input)
  }

  async setFlareSolverr(input: SetFlareSolverrInput): Promise<void> {
    await this.gql(SET_FLARE_SOLVERR, input)
  }

  // ── Browse / Search ────────────────────────────────────────────────────────
 
  async searchSource(
    sourceId: string,
    query:    string,
    page      = 1,
    signal?:  AbortSignal,
  ): Promise<PaginatedResult<Manga>> {
    const data = await this.gql<{
      fetchSourceManga: { mangas: Record<string, unknown>[]; hasNextPage: boolean }
    }>(FETCH_SOURCE_MANGA, { source: sourceId, type: 'SEARCH', page, query }, signal)
    return {
      items:       data.fetchSourceManga.mangas.map(mapManga),
      hasNextPage: data.fetchSourceManga.hasNextPage,
    }
  }
 
  async getMangasByGenre(
    filter:  Record<string, unknown>,
    first:   number,
    offset:  number,
    signal?: AbortSignal,
  ): Promise<{ items: Manga[]; hasNextPage: boolean; totalCount: number }> {
    const data = await this.gql<{
      mangas: {
        nodes:     Record<string, unknown>[];
        pageInfo:  { hasNextPage: boolean };
        totalCount: number;
      }
    }>(MANGAS_BY_GENRE, { filter, first, offset }, signal)
    return {
      items:      data.mangas.nodes.map(mapManga),
      hasNextPage: data.mangas.pageInfo.hasNextPage,
      totalCount:  data.mangas.totalCount,
    }
  }

  // ── Library updates ────────────────────────────────────────────────────────

  async checkForUpdates(mangaIds?: string[]): Promise<UpdateResult[]> {
    if (mangaIds?.length) {
      const results: UpdateResult[] = []
      for (const id of mangaIds) {
        const before = await this.getChapters(id)
        await this.gql(UPDATE_LIBRARY_MANGA, { mangaId: Number(id) })
        const after = await this.getChapters(id)
        results.push({ mangaId: id, newChapters: after.length - before.length })
      }
      return results
    }
    await this.gql(UPDATE_LIBRARY)
    return []
  }

  async stopLibraryUpdate(): Promise<void> {
    await this.gql(UPDATE_STOP)
  }

  async getLibraryUpdateStatus(): Promise<LibraryUpdateProgress> {
    const data = await this.gql<{
      libraryUpdateStatus: {
        jobsInfo: { isRunning: boolean; finishedJobs: number; totalJobs: number }
      }
    }>(LIBRARY_UPDATE_STATUS)
    const { isRunning, finishedJobs, totalJobs } = data.libraryUpdateStatus.jobsInfo
    return { isRunning, finishedJobs, totalJobs }
  }

  clearPageCache(chapterId?: number): void {
    _clearPageCache(chapterId)
  }
}

