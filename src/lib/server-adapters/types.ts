import type { Manga, Chapter, Extension, Source, Tracker, Category } from '$lib/types'

export interface ServerConfig {
  baseUrl: string
  credentials?: { username: string; password: string }
}

export type ServerStatus = 'connected' | 'disconnected' | 'error'

export interface MangaFilters {
  inLibrary?: boolean
  status?: MangaStatus
  tags?: string[]
  unread?: boolean
  sourceId?: string
}

export type MangaStatus =
  | 'ONGOING'
  | 'COMPLETED'
  | 'LICENSED'
  | 'PUBLISHING_FINISHED'
  | 'CANCELLED'
  | 'ON_HIATUS'

export interface PaginatedResult<T> {
  items: T[]
  hasNextPage: boolean
  total?: number
}

export interface MangaMeta {
  customTitle?: string
  customCover?: string
  notes?: string
  [key: string]: unknown
}

export interface Page {
  index: number
  url: string
  imageData?: string
}

export interface DownloadItem {
  chapterId: string
  mangaId: string
  chapterName: string
  mangaTitle: string
  thumbnailUrl?: string
  progress: number
  state: 'queued' | 'downloading' | 'finished' | 'error'
}

export interface UpdateResult {
  mangaId: string
  newChapters: number
}

export interface LibraryUpdateProgress {
  isRunning: boolean
  finishedJobs: number
  totalJobs: number
}

export interface ServerSecurity {
  authMode: string
  authUsername: string
  socksProxyEnabled: boolean
  socksProxyHost: string
  socksProxyPort: string
  socksProxyVersion: number
  socksProxyUsername: string
  flareSolverrEnabled: boolean
  flareSolverrUrl: string
  flareSolverrTimeout: number
  flareSolverrSessionName: string
  flareSolverrSessionTtl: number
  flareSolverrAsResponseFallback: boolean
}

export interface SetServerAuthInput {
  authMode: string
  authUsername: string
  authPassword: string
}

export interface SetSocksProxyInput {
  socksProxyEnabled: boolean
  socksProxyHost: string
  socksProxyPort: string
  socksProxyVersion: number
  socksProxyUsername: string
  socksProxyPassword: string
}

export interface SetFlareSolverrInput {
  flareSolverrEnabled: boolean
  flareSolverrUrl: string
  flareSolverrTimeout: number
  flareSolverrSessionName: string
  flareSolverrSessionTtl: number
  flareSolverrAsResponseFallback: boolean
}

export interface ServerAdapter {
  connect(config: ServerConfig): Promise<void>
  getStatus(): Promise<ServerStatus>
  getServerUrl(): string

  getManga(id: string): Promise<Manga>
  getMangaList(filters: MangaFilters): Promise<PaginatedResult<Manga>>
  searchManga(query: string, sourceId?: string): Promise<Manga[]>
  fetchManga(id: string): Promise<Manga>
  addToLibrary(mangaId: string): Promise<void>
  removeFromLibrary(mangaId: string): Promise<void>
  updateMangas(ids: string[], patch: { inLibrary?: boolean }): Promise<void>
  updateMangaMeta(id: string, meta: Partial<MangaMeta>): Promise<void>
  deleteMangaMeta(id: string, key: string): Promise<void>

  getChapters(mangaId: string): Promise<Chapter[]>
  getChapter(id: string): Promise<Chapter>
  getChapterPages(id: string, signal?: AbortSignal): Promise<Page[]>
  fetchChapters(mangaId: string): Promise<Chapter[]>
  getRecentlyUpdated(): Promise<Chapter[]>
  markChapterRead(id: string, read: boolean): Promise<void>
  markChaptersRead(ids: string[], read: boolean): Promise<void>
  updateChaptersProgress(ids: string[], patch: { isRead?: boolean; isBookmarked?: boolean; lastPageRead?: number }): Promise<void>
  deleteDownloadedChapters(ids: string[]): Promise<void>
  setChapterMeta(chapterId: string, key: string, value: string): Promise<void>
  deleteChapterMeta(chapterId: string, key: string): Promise<void>

  getDownloads(): Promise<DownloadItem[]>
  enqueueDownload(chapterId: string): Promise<void>
  enqueueDownloads(chapterIds: string[]): Promise<void>
  dequeueDownload(chapterId: string): Promise<void>
  dequeueDownloads(chapterIds: string[]): Promise<void>
  clearDownloads(): Promise<void>
  startDownloader(): Promise<void>
  stopDownloader(): Promise<void>

  getExtensions(): Promise<Extension[]>
  installExtension(id: string): Promise<void>
  uninstallExtension(id: string): Promise<void>
  updateExtension(id: string): Promise<void>
  updateExtensions(ids: string[]): Promise<void>
  installExternalExtension(url: string): Promise<void>

  getSources(): Promise<Source[]>
  browseSource(sourceId: string, page: number): Promise<PaginatedResult<Manga>>

  getCategories(): Promise<Category[]>
  createCategory(name: string): Promise<Category>
  deleteCategory(id: number): Promise<void>
  updateCategoryOrder(id: number, position: number): Promise<Category[]>
  updateMangaCategories(mangaId: string, addTo: number[], removeFrom: number[]): Promise<void>
  updateMangasCategories(mangaIds: string[], addTo: number[], removeFrom: number[]): Promise<void>
  updateCategoryManga(categoryId: number): Promise<void>

  getTrackers(): Promise<Tracker[]>
  getMangaTrackRecords(mangaId: string): Promise<unknown[]>
  searchTracker(trackerId: string, query: string): Promise<unknown[]>
  linkTracker(mangaId: string, trackerId: string, remoteId: string): Promise<void>
  unlinkTracker(recordId: string): Promise<void>
  fetchTrackRecord(recordId: string): Promise<void>
  syncTracking(mangaId: string): Promise<void>

  getServerSecurity(): Promise<ServerSecurity>
  setServerAuth(input: SetServerAuthInput): Promise<void>
  setSocksProxy(input: SetSocksProxyInput): Promise<void>
  setFlareSolverr(input: SetFlareSolverrInput): Promise<void>

  checkForUpdates(mangaIds?: string[]): Promise<UpdateResult[]>
  stopLibraryUpdate(): Promise<void>
  getLibraryUpdateStatus(): Promise<LibraryUpdateProgress>
  clearPageCache(chapterId?: number): void
}