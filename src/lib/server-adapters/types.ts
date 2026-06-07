import type { DownloadStatus } from '$lib/types/api'
import type { Manga, Chapter, Extension, Source, Tracker, TrackRecord, Category } from '$lib/types'

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

export interface AboutServer {
  name:      string
  version:   string
  buildType: string
  buildTime: number
  github:    string
  discord:   string
}

export interface AboutWebUI {
  channel:         string
  tag:             string
  updateTimestamp: number
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

export interface TrackRecordPatch {
  status?:          number
  score?:           number
  lastChapterRead?: number
  startDate?:       string
  finishDate?:      string
  private?:         boolean
}

export interface RestoreStatus {
  mangaProgress: number
  state:         string
  totalManga:    number
}

export interface ValidateBackupResult {
  missingSources: { id: string; name: string }[]
  missingTrackers: { name: string }[]
}

export interface ServerAdapter {
  connect(config: ServerConfig): Promise<void>
  getStatus(): Promise<ServerStatus>
  getServerUrl(): string

  getManga(id: string, signal?: AbortSignal): Promise<Manga>
  getMangaList(filters: MangaFilters): Promise<PaginatedResult<Manga>>
  getMangasByGenre(filter: Record<string, unknown>, first: number, offset: number, signal?: AbortSignal): Promise<{ items: Manga[]; hasNextPage: boolean; totalCount: number }>
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

  getAboutServer(): Promise<AboutServer>
  getAboutWebUI():  Promise<AboutWebUI>

  getDownloads(): Promise<DownloadItem[]>
  getDownloadStatus(): Promise<DownloadStatus>
  enqueueDownload(chapterId: string): Promise<void>
  enqueueDownloads(chapterIds: string[]): Promise<void>
  dequeueDownload(chapterId: string): Promise<void>
  dequeueDownloads(chapterIds: string[]): Promise<void>
  reorderDownload(chapterId: string, to: number): Promise<DownloadStatus | null>
  clearDownloads(): Promise<void>
  startDownloader(): Promise<DownloadStatus | null>
  stopDownloader(): Promise<DownloadStatus | null>

  getExtensions(): Promise<Extension[]>
  installExtension(id: string): Promise<void>
  uninstallExtension(id: string): Promise<void>
  updateExtension(id: string): Promise<void>
  updateExtensions(ids: string[]): Promise<void>
  installExternalExtension(url: string): Promise<void>
  getExtensionRepos(): Promise<string[]>
  setExtensionRepos(repos: string[]): Promise<string[]>

  getSources(): Promise<Source[]>
  browseSource(sourceId: string, page: number): Promise<PaginatedResult<Manga>>
  getSourceSettings(sourceId: string): Promise<unknown[]>
  updateSourcePreference(sourceId: string, position: number, changeType: string, value: unknown): Promise<unknown[]>

  getCategories(): Promise<Category[]>
  createCategory(name: string): Promise<Category>
  deleteCategory(id: number): Promise<void>
  updateCategoryOrder(id: number, position: number): Promise<Category[]>
  updateMangaCategories(mangaId: string, addTo: number[], removeFrom: number[]): Promise<void>
  updateMangasCategories(mangaIds: string[], addTo: number[], removeFrom: number[]): Promise<void>
  updateCategoryManga(categoryId: number): Promise<void>

  getTrackers(): Promise<Tracker[]>
  getAllTrackerRecords(): Promise<unknown[]>
  getMangaTrackRecords(mangaId: string): Promise<unknown[]>
  searchTracker(trackerId: string, query: string): Promise<unknown[]>
  linkTracker(mangaId: string, trackerId: string, remoteId: string): Promise<void>
  unlinkTracker(recordId: string): Promise<void>
  updateTrackRecord(recordId: string, patch: TrackRecordPatch): Promise<TrackRecord>
  fetchTrackRecord(recordId: string): Promise<TrackRecord>
  syncTracking(mangaId: string): Promise<void>
  loginTrackerOAuth(trackerId: string, callbackUrl: string): Promise<void>
  loginTrackerCredentials(trackerId: string, username: string, password: string): Promise<void>
  logoutTracker(trackerId: string): Promise<void>

  getServerSecurity(): Promise<ServerSecurity>
  setServerAuth(input: SetServerAuthInput): Promise<void>
  setSocksProxy(input: SetSocksProxyInput): Promise<void>
  setFlareSolverr(input: SetFlareSolverrInput): Promise<void>

  getDownloadsPath(): Promise<{ downloadsPath: string; localSourcePath: string }>
  setDownloadsPath(path: string): Promise<void>
  setLocalSourcePath(path: string): Promise<void>
  createBackup(): Promise<{ url: string }>
  restoreBackup(file: File): Promise<{ id: string; status: RestoreStatus }>
  validateBackup(file: File): Promise<ValidateBackupResult>
  pollRestoreStatus(id: string): Promise<RestoreStatus>
  clearCachedImages(opts: { cachedPages: boolean; cachedThumbnails: boolean; downloadedThumbnails: boolean }): Promise<void>

  checkForUpdates(mangaIds?: string[]): Promise<UpdateResult[]>
  stopLibraryUpdate(): Promise<void>
  getLibraryUpdateStatus(): Promise<LibraryUpdateProgress>
  clearPageCache(chapterId?: number): void
}