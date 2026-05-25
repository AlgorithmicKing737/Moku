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
} from '$lib/server-adapters/types'
import type { Manga, Chapter, Extension, Source, Tracker, Category } from '$lib/types'

function notImplemented(): never {
  throw new Error('MokuAdapter: not implemented')
}

export class MokuAdapter implements ServerAdapter {
  async connect(_config: ServerConfig): Promise<void> { notImplemented() }
  getServerUrl(): string { return notImplemented() }
  async getStatus(): Promise<ServerStatus> { return notImplemented() }

  async getManga(_id: string): Promise<Manga> { return notImplemented() }
  async getMangaList(_filters: MangaFilters): Promise<PaginatedResult<Manga>> { return notImplemented() }
  async searchManga(_query: string, _sourceId?: string): Promise<Manga[]> { return notImplemented() }
  async fetchManga(_id: string): Promise<Manga> { return notImplemented() }
  async addToLibrary(_mangaId: string): Promise<void> { notImplemented() }
  async removeFromLibrary(_mangaId: string): Promise<void> { notImplemented() }
  async updateMangas(_ids: string[], _patch: { inLibrary?: boolean }): Promise<void> { notImplemented() }
  async updateMangaMeta(_id: string, _meta: Partial<MangaMeta>): Promise<void> { notImplemented() }
  async deleteMangaMeta(_id: string, _key: string): Promise<void> { notImplemented() }

  async getChapters(_mangaId: string): Promise<Chapter[]> { return notImplemented() }
  async getChapter(_id: string): Promise<Chapter> { return notImplemented() }
  async getChapterPages(_id: string): Promise<Page[]> { return notImplemented() }
  async fetchChapters(_mangaId: string): Promise<Chapter[]> { return notImplemented() }
  async getRecentlyUpdated(): Promise<Chapter[]> { return notImplemented() }
  async markChapterRead(_id: string, _read: boolean): Promise<void> { notImplemented() }
  async markChaptersRead(_ids: string[], _read: boolean): Promise<void> { notImplemented() }
  async updateChaptersProgress(_ids: string[], _patch: { isRead?: boolean; isBookmarked?: boolean; lastPageRead?: number }): Promise<void> { notImplemented() }
  async deleteDownloadedChapters(_ids: string[]): Promise<void> { notImplemented() }
  async setChapterMeta(_chapterId: string, _key: string, _value: string): Promise<void> { notImplemented() }
  async deleteChapterMeta(_chapterId: string, _key: string): Promise<void> { notImplemented() }

  async getDownloads(): Promise<DownloadItem[]> { return notImplemented() }
  async enqueueDownload(_chapterId: string): Promise<void> { notImplemented() }
  async enqueueDownloads(_chapterIds: string[]): Promise<void> { notImplemented() }
  async dequeueDownload(_chapterId: string): Promise<void> { notImplemented() }
  async dequeueDownloads(_chapterIds: string[]): Promise<void> { notImplemented() }
  async clearDownloads(): Promise<void> { notImplemented() }
  async startDownloader(): Promise<void> { notImplemented() }
  async stopDownloader(): Promise<void> { notImplemented() }

  async getExtensions(): Promise<Extension[]> { return notImplemented() }
  async installExtension(_id: string): Promise<void> { notImplemented() }
  async uninstallExtension(_id: string): Promise<void> { notImplemented() }
  async updateExtension(_id: string): Promise<void> { notImplemented() }
  async updateExtensions(_ids: string[]): Promise<void> { notImplemented() }
  async installExternalExtension(_url: string): Promise<void> { notImplemented() }

  async getSources(): Promise<Source[]> { return notImplemented() }
  async browseSource(_sourceId: string, _page: number): Promise<PaginatedResult<Manga>> { return notImplemented() }

  async getCategories(): Promise<Category[]> { return notImplemented() }
  async createCategory(_name: string): Promise<Category> { return notImplemented() }
  async deleteCategory(_id: number): Promise<void> { notImplemented() }
  async updateCategoryOrder(_id: number, _position: number): Promise<Category[]> { return notImplemented() }
  async updateMangaCategories(_mangaId: string, _addTo: number[], _removeFrom: number[]): Promise<void> { notImplemented() }
  async updateMangasCategories(_mangaIds: string[], _addTo: number[], _removeFrom: number[]): Promise<void> { notImplemented() }
  async updateCategoryManga(_categoryId: number): Promise<void> { notImplemented() }

  async getTrackers(): Promise<Tracker[]> { return notImplemented() }
  async getMangaTrackRecords(_mangaId: string): Promise<unknown[]> { return notImplemented() }
  async searchTracker(_trackerId: string, _query: string): Promise<unknown[]> { return notImplemented() }
  async linkTracker(_mangaId: string, _trackerId: string, _remoteId: string): Promise<void> { notImplemented() }
  async unlinkTracker(_recordId: string): Promise<void> { notImplemented() }
  async fetchTrackRecord(_recordId: string): Promise<void> { notImplemented() }
  async syncTracking(_mangaId: string): Promise<void> { notImplemented() }

  async checkForUpdates(_mangaIds?: string[]): Promise<UpdateResult[]> { return notImplemented() }
  async stopLibraryUpdate(): Promise<void> { notImplemented() }
  async getLibraryUpdateStatus(): Promise<LibraryUpdateProgress> { return notImplemented() }

  clearPageCache(_chapterId?: number): void {}
}