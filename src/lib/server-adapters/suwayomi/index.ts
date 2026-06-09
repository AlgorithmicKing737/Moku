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
  TrackRecordPatch,
  AboutServer,
  AboutWebUI,
  RestoreStatus,
  ValidateBackupResult,
} from '$lib/server-adapters/types'
import type { DownloadStatus } from '$lib/types/api'
import type { Manga, Chapter, Extension, Source, Tracker, TrackRecord, Category } from '$lib/types'
import {
  GET_LIBRARY,
  GET_MANGA,
  GET_CATEGORIES,
  GET_DOWNLOADS_PATH,
  FETCH_MANGA,
  UPDATE_MANGA,
  UPDATE_MANGAS,
  UPDATE_MANGA_CATEGORIES,
  UPDATE_MANGAS_CATEGORIES,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY,
  UPDATE_CATEGORY_ORDER,
  UPDATE_CATEGORY_MANGA,
  UPDATE_LIBRARY,
  UPDATE_LIBRARY_MANGA,
  UPDATE_STOP,
  SET_MANGA_META,
  DELETE_MANGA_META,
  CREATE_BACKUP,
  FETCH_SOURCE_MANGA,
  LIBRARY_UPDATE_STATUS,
  MANGAS_BY_GENRE,
  POLL_RESTORE_STATUS,
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
  SET_DOWNLOADS_PATH,
  SET_LOCAL_SOURCE_PATH,
} from './downloads'
import {
  GET_EXTENSIONS,
  GET_SOURCES,
  GET_SOURCE_SETTINGS,
  GET_SETTINGS,
  GET_SERVER_SECURITY,
  FETCH_EXTENSIONS,
  UPDATE_EXTENSION,
  UPDATE_EXTENSIONS,
  INSTALL_EXTERNAL_EXTENSION,
  UPDATE_SOURCE_PREFERENCE,
  SET_SOURCE_META,
  DELETE_SOURCE_META,
  SET_EXTENSION_REPOS,
  SET_SERVER_AUTH,
  CLEAR_CACHED_IMAGES,
  RESET_SETTINGS,
} from './extensions'
import {
  GET_TRACKERS,
  GET_ALL_TRACKER_RECORDS,
  GET_MANGA_TRACK_RECORDS,
  SEARCH_TRACKER,
  FETCH_TRACK,
  BIND_TRACK,
  UNLINK_TRACK,
  TRACK_PROGRESS,
  UPDATE_TRACK,
  LOGIN_TRACKER_CREDENTIALS,
  LOGOUT_TRACKER,
  LOGIN_TRACKER_OAUTH,
} from './tracking'
import {
  GET_ABOUT_SERVER,
  GET_ABOUT_WEBUI,
  CHECK_FOR_SERVER_UPDATES,
  GET_META,
  GET_METAS,
  SET_SOCKS_PROXY,
  SET_FLARE_SOLVERR,
  RESTORE_BACKUP,
  VALIDATE_BACKUP,
} from './meta'
import { authHeaders } from '$lib/core/auth'
import {
  type GQLResponse,
  mapManga,
  mapChapter,
  mapExtension,
  mapDownloadItem,
  mapCategory,
} from './types'
import { initPageCache, clearPageCache as _clearPageCache } from './pageCache'

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

  async connect(config: ServerConfig): Promise<void> {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    initPageCache(this.gql.bind(this), this.getServerUrl.bind(this))
  }

  getServerUrl(): string {
    return this.baseUrl
  }

  async getStatus(): Promise<ServerStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/graphql`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({ query: '{ aboutServer { name } }' }),
      })
      return res.ok ? 'connected' : 'error'
    } catch {
      return 'disconnected'
    }
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', ...authHeaders() }
  }

  private async gql<T>(
    query: string,
    variables?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/graphql`, {
      method:  'POST',
      headers: this.headers(),
      body:    JSON.stringify({ query, variables }),
      signal,
    })
    if (!res.ok) throw new Error(`Suwayomi HTTP ${res.status}`)
    const json: GQLResponse<T> = await res.json()
    if (json.errors?.length) throw new Error(json.errors[0].message)
    return json.data
  }

  async getAboutServer(): Promise<AboutServer> {
    const data = await this.gql<{ aboutServer: AboutServer }>(GET_ABOUT_SERVER)
    return data.aboutServer
  }

  async getAboutWebUI(): Promise<AboutWebUI> {
    const data = await this.gql<{ aboutWebUI: AboutWebUI }>(GET_ABOUT_WEBUI)
    return data.aboutWebUI
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

  async getMangasByGenre(
    filter:  Record<string, unknown>,
    first:   number,
    offset:  number,
    signal?: AbortSignal,
  ): Promise<{ items: Manga[]; hasNextPage: boolean; totalCount: number }> {
    const data = await this.gql<{
      mangas: {
        nodes:      Record<string, unknown>[]
        pageInfo:   { hasNextPage: boolean }
        totalCount: number
      }
    }>(MANGAS_BY_GENRE, { filter, first, offset }, signal)
    return {
      items:       data.mangas.nodes.map(mapManga),
      hasNextPage: data.mangas.pageInfo.hasNextPage,
      totalCount:  data.mangas.totalCount,
    }
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
    const data = await this.gql<{ chapters: { nodes: Record<string, unknown>[] } }>(GET_RECENTLY_UPDATED)
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
    } catch { return null }
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

  async getExtensionRepos(): Promise<string[]> {
    const data = await this.gql<{ settings: { extensionRepos: string[] } }>(GET_SETTINGS)
    return data.settings.extensionRepos ?? []
  }

  async setExtensionRepos(repos: string[]): Promise<string[]> {
    const data = await this.gql<{ setSettings: { settings: { extensionRepos: string[] } } }>(
      SET_EXTENSION_REPOS, { repos }
    )
    return data.setSettings.settings.extensionRepos
  }

  async getSources(): Promise<Source[]> {
    const data = await this.gql<{ sources: { nodes: Source[] } }>(GET_SOURCES)
    return data.sources.nodes
  }

  async browseSource(sourceId: string, page: number): Promise<PaginatedResult<Manga>> {
    const data = await this.gql<{
      fetchSourceManga: { mangas: Record<string, unknown>[]; hasNextPage: boolean }
    }>(FETCH_SOURCE_MANGA, { source: sourceId, type: sourceId === '0' ? 'POPULAR' : 'LATEST', page })
    return {
      items:       data.fetchSourceManga.mangas.map(mapManga),
      hasNextPage: data.fetchSourceManga.hasNextPage,
    }
  }

  async getSourceSettings(sourceId: string): Promise<unknown[]> {
    const data = await this.gql<{ source: { preferences: unknown[] } }>(
      GET_SOURCE_SETTINGS, { id: sourceId }
    )
    return data.source.preferences ?? []
  }

  async updateSourcePreference(
    sourceId:   string,
    position:   number,
    changeType: string,
    value:      unknown,
  ): Promise<unknown[]> {
    await this.gql(UPDATE_SOURCE_PREFERENCE, {
      source: sourceId,
      change: { position, [changeType]: value },
    })
    const data = await this.gql<{ source: { preferences: unknown[] } }>(
      GET_SOURCE_SETTINGS, { id: sourceId }
    )
    return data.source.preferences ?? []
  }

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

  async getTrackers(): Promise<Tracker[]> {
    const data = await this.gql<{ trackers: { nodes: Tracker[] } }>(GET_TRACKERS)
    return data.trackers.nodes
  }

  async getAllTrackerRecords(): Promise<unknown[]> {
    const data = await this.gql<{ trackers: { nodes: unknown[] } }>(GET_ALL_TRACKER_RECORDS)
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
    await this.gql(BIND_TRACK, { mangaId: Number(mangaId), trackerId: Number(trackerId), remoteId })
  }

  async unlinkTracker(recordId: string): Promise<void> {
    await this.gql(UNLINK_TRACK, { trackRecordId: Number(recordId) })
  }

  async updateTrackRecord(recordId: string, patch: TrackRecordPatch): Promise<TrackRecord> {
    const data = await this.gql<{ updateTrack: { trackRecord: TrackRecord } }>(
      UPDATE_TRACK, { recordId: Number(recordId), ...patch }
    )
    return data.updateTrack.trackRecord
  }

  async fetchTrackRecord(recordId: string): Promise<TrackRecord> {
    const data = await this.gql<{ fetchTrack: { trackRecord: TrackRecord } }>(
      FETCH_TRACK, { recordId: Number(recordId) }
    )
    return data.fetchTrack.trackRecord
  }

  async syncTracking(mangaId: string): Promise<void> {
    await this.gql(TRACK_PROGRESS, { mangaId: Number(mangaId) })
  }

  async loginTrackerOAuth(trackerId: string, callbackUrl: string): Promise<void> {
    await this.gql(LOGIN_TRACKER_OAUTH, { trackerId: Number(trackerId), callbackUrl })
  }

  async loginTrackerCredentials(trackerId: string, username: string, password: string): Promise<void> {
    await this.gql(LOGIN_TRACKER_CREDENTIALS, { trackerId: Number(trackerId), username, password })
  }

  async logoutTracker(trackerId: string): Promise<void> {
    await this.gql(LOGOUT_TRACKER, { trackerId: Number(trackerId) })
  }

  async getServerSecurity(): Promise<ServerSecurity> {
    const data = await this.gql<{ settings: ServerSecurity }>(GET_SERVER_SECURITY)
    return data.settings
  }

  async setServerAuth(input: SetServerAuthInput): Promise<void> {
    await this.gql(SET_SERVER_AUTH, {
      authMode:     input.authMode,
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

  async getDownloadsPath(): Promise<{ downloadsPath: string; localSourcePath: string }> {
    const data = await this.gql<{ settings: { downloadsPath: string | null; localSourcePath: string | null } }>(
      GET_DOWNLOADS_PATH
    )
    return {
      downloadsPath:   data.settings.downloadsPath  ?? '',
      localSourcePath: data.settings.localSourcePath ?? '',
    }
  }

  async setDownloadsPath(path: string): Promise<void> {
    await this.gql(SET_DOWNLOADS_PATH, { path })
  }

  async setLocalSourcePath(path: string): Promise<void> {
    await this.gql(SET_LOCAL_SOURCE_PATH, { path })
  }

  async createBackup(): Promise<{ url: string }> {
    const data = await this.gql<{ createBackup: { url: string } }>(CREATE_BACKUP)
    return data.createBackup
  }

  private multipartGql<T>(query: string, file: File): Promise<T> {
    const form = new FormData()
    form.append('operations', JSON.stringify({ query, variables: { backup: null } }))
    form.append('map', JSON.stringify({ '0': ['variables.backup'] }))
    form.append('0', file, file.name)
    const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() }
    return fetch(`${this.baseUrl}/api/graphql`, { method: 'POST', headers, body: form })
      .then(r => { if (!r.ok) throw new Error(`Suwayomi HTTP ${r.status}`); return r.json() })
      .then((json: GQLResponse<T>) => { if (json.errors?.length) throw new Error(json.errors[0].message); return json.data })
  }

  async restoreBackup(file: File): Promise<{ id: string; status: RestoreStatus }> {
    const data = await this.multipartGql<{ restoreBackup: { id: string; status: RestoreStatus } }>(RESTORE_BACKUP, file)
    return data.restoreBackup
  }

  async validateBackup(file: File): Promise<ValidateBackupResult> {
    const data = await this.multipartGql<{ validateBackup: ValidateBackupResult }>(VALIDATE_BACKUP, file)
    return data.validateBackup
  }

  async pollRestoreStatus(id: string): Promise<RestoreStatus> {
    const data = await this.gql<{ restoreStatus: RestoreStatus }>(POLL_RESTORE_STATUS, { id })
    return data.restoreStatus
  }

  async clearCachedImages(opts: { cachedPages: boolean; cachedThumbnails: boolean; downloadedThumbnails: boolean }): Promise<void> {
    await this.gql(CLEAR_CACHED_IMAGES, opts)
  }

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