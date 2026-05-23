import type {
  Manga,
  Chapter,
  Extension,
  Source,
  Tracker,
} from '$lib/types';

export interface ServerConfig {
  baseUrl: string;
  credentials?: {username: string; password: string;};
}

export type ServerStatus = 'connected' | 'disconnected' | 'error';

export interface MangaFilters {
  inLibrary?: boolean;
  status?: MangaStatus;
  tags?: string[];
  unread?: boolean;
  sourceId?: string;
}

export type MangaStatus = 'ONGOING' | 'COMPLETED' | 'LICENSED' | 'PUBLISHING_FINISHED' | 'CANCELLED' | 'ON_HIATUS';

export interface PaginatedResult<T> {
  items: T[];
  hasNextPage: boolean;
  total?: number;
}

export interface MangaMeta {
  customTitle?: string;
  customCover?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface Page {
  index: number;
  url: string;
  imageData?: string;
}

export interface DownloadItem {
  chapterId: string;
  mangaId: string;
  chapterName: string;
  mangaTitle: string;
  progress: number;
  state: 'queued' | 'downloading' | 'finished' | 'error';
}

export interface UpdateResult {
  mangaId: string;
  newChapters: number;
}

export interface ServerAdapter {
  connect(config: ServerConfig): Promise<void>;
  getStatus(): Promise<ServerStatus>;

  getManga(id: string): Promise<Manga>;
  getMangaList(filters: MangaFilters): Promise<PaginatedResult<Manga>>;
  searchManga(query: string, sourceId?: string): Promise<Manga[]>;
  addToLibrary(mangaId: string): Promise<void>;
  removeFromLibrary(mangaId: string): Promise<void>;
  updateMangaMeta(id: string, meta: Partial<MangaMeta>): Promise<void>;

  getChapters(mangaId: string): Promise<Chapter[]>;
  getChapter(id: string): Promise<Chapter>;
  getChapterPages(id: string): Promise<Page[]>;
  markChapterRead(id: string, read: boolean): Promise<void>;
  updateChapterProgress(id: string, lastPageRead: number, read?: boolean): Promise<void>;
  markChaptersRead(ids: string[], read: boolean): Promise<void>;

  getDownloads(): Promise<DownloadItem[]>;
  enqueueDownload(chapterId: string): Promise<void>;
  dequeueDownload(chapterId: string): Promise<void>;
  clearDownloads(): Promise<void>;

  getExtensions(): Promise<Extension[]>;
  installExtension(id: string): Promise<void>;
  uninstallExtension(id: string): Promise<void>;
  updateExtension(id: string): Promise<void>;

  getSources(): Promise<Source[]>;
  browseSource(sourceId: string, page: number): Promise<PaginatedResult<Manga>>;

  getTrackers(): Promise<Tracker[]>;
  linkTracker(mangaId: string, trackerId: string, remoteId: string): Promise<void>;
  syncTracking(mangaId: string): Promise<void>;

  checkForUpdates(mangaIds?: string[]): Promise<UpdateResult[]>;
}
