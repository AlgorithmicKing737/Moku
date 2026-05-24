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
} from '$lib/server-adapters/types';
import type {Manga, Chapter, Extension, Source, Tracker} from '$lib/types';
import type {TrackRecord} from '$lib/types/tracking';

function notImplemented(): never {
  throw new Error('MokuAdapter: not implemented');
}

export class MokuAdapter implements ServerAdapter {
  async connect(_config: ServerConfig): Promise<void> {notImplemented();}
  async getStatus(): Promise<ServerStatus> {return notImplemented();}

  async getManga(_id: string): Promise<Manga> {return notImplemented();}
  async getMangaList(_filters: MangaFilters): Promise<PaginatedResult<Manga>> {return notImplemented();}
  async searchManga(_query: string, _sourceId?: string): Promise<Manga[]> {return notImplemented();}
  async addToLibrary(_mangaId: string): Promise<void> {notImplemented();}
  async removeFromLibrary(_mangaId: string): Promise<void> {notImplemented();}
  async updateMangaMeta(_id: string, _meta: Partial<MangaMeta>): Promise<void> {notImplemented();}

  async getChapters(_mangaId: string): Promise<Chapter[]> {return notImplemented();}
  async getChapter(_id: string): Promise<Chapter> {return notImplemented();}
  async getChapterPages(_id: string): Promise<Page[]> {return notImplemented();}
  async markChapterRead(_id: string, _read: boolean): Promise<void> {notImplemented();}
  async updateChapterProgress(_id: string, _lastPageRead: number, _read?: boolean): Promise<void> {notImplemented();}
  async markChaptersRead(_ids: string[], _read: boolean): Promise<void> {notImplemented();}

  async getDownloads(): Promise<DownloadItem[]> {return notImplemented();}
  async enqueueDownload(_chapterId: string): Promise<void> {notImplemented();}
  async dequeueDownload(_chapterId: string): Promise<void> {notImplemented();}
  async clearDownloads(): Promise<void> {notImplemented();}

  async getExtensions(): Promise<Extension[]> {return notImplemented();}
  async installExtension(_id: string): Promise<void> {notImplemented();}
  async uninstallExtension(_id: string): Promise<void> {notImplemented();}
  async updateExtension(_id: string): Promise<void> {notImplemented();}

  async getSources(): Promise<Source[]> {return notImplemented();}
  async browseSource(_sourceId: string, _page: number): Promise<PaginatedResult<Manga>> {return notImplemented();}

  async getTrackers(): Promise<Tracker[]> {return notImplemented();}
  async getTrackerRecords(): Promise<TrackRecord[]> {return notImplemented();}
  async loginTrackerOAuth(_trackerId: number, _callbackUrl: string): Promise<void> {notImplemented();}
  async loginTrackerCredentials(_trackerId: number, _username: string, _password: string): Promise<void> {notImplemented();}
  async logoutTracker(_trackerId: number): Promise<void> {notImplemented();}
  async linkTracker(_mangaId: string, _trackerId: string, _remoteId: string): Promise<void> {notImplemented();}
  async syncTracking(_mangaId: string): Promise<void> {notImplemented();}

  async checkForUpdates(_mangaIds?: string[]): Promise<UpdateResult[]> {return notImplemented();}
}