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
import type {Manga, Chapter, Extension, Source, Tracker} from '$lib/types/index';
import type {TrackRecord} from '$lib/types/tracking';
import {
  GET_LIBRARY,
  GET_MANGA,
  GET_CATEGORIES,
  FETCH_MANGA,
  UPDATE_MANGA,
  SET_MANGA_META,
  UPDATE_LIBRARY,
} from './manga';
import {
  GET_CHAPTERS,
  FETCH_CHAPTERS,
  FETCH_CHAPTER_PAGES,
  MARK_CHAPTER_READ,
  MARK_CHAPTERS_READ,
  UPDATE_CHAPTERS_PROGRESS,
} from './chapters';
import {
  GET_DOWNLOAD_STATUS,
  ENQUEUE_DOWNLOAD,
  DEQUEUE_DOWNLOAD,
  CLEAR_DOWNLOADER,
  FETCH_SOURCE_MANGA,
} from './downloads';
import {
  GET_EXTENSIONS,
  GET_SOURCES,
  FETCH_EXTENSIONS,
  UPDATE_EXTENSION,
} from './extensions';
import {
  GET_TRACKERS,
  BIND_TRACK,
  TRACK_PROGRESS,
  LOGIN_TRACKER_OAUTH,
  LOGIN_TRACKER_CREDENTIALS,
  LOGOUT_TRACKER,
} from './tracking';
import {
  mapManga,
  mapChapter,
  mapExtension,
  mapDownloadItem,
} from './types';
import type {GQLResponse} from './types';

const GET_CHAPTER = `
  query GetChapter($id: Int!) {
    chapter(id: $id) {
      id name chapterNumber sourceOrder isRead isDownloaded isBookmarked
      pageCount mangaId uploadDate realUrl lastPageRead lastReadAt scanlator
    }
  }
`;

export class SuwayomiAdapter implements ServerAdapter {
  private baseUrl = 'http://127.0.0.1:4567';
  private authHeader: string | null = null;

  async connect(config: ServerConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.credentials) {
      const {username, password} = config.credentials;
      this.authHeader = 'Basic ' + btoa(`${username}:${password}`);
    }
  }

  async getStatus(): Promise<ServerStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/graphql`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({query: '{ aboutServer { name } }'}),
      });
      return res.ok ? 'connected' : 'error';
    } catch {
      return 'disconnected';
    }
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {'Content-Type': 'application/json'};
    if (this.authHeader) h['Authorization'] = this.authHeader;
    return h;
  }

  private async gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/graphql`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({query, variables}),
    });
    if (!res.ok) throw new Error(`Suwayomi HTTP ${res.status}`);
    const json: GQLResponse<T> = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
  }

  async getManga(id: string): Promise<Manga> {
    const data = await this.gql<{manga: Record<string, unknown>;}>(GET_MANGA, {id: Number(id)});
    return mapManga(data.manga);
  }

  async getMangaList(filters: MangaFilters): Promise<PaginatedResult<Manga>> {
    const data = await this.gql<{mangas: {nodes: Record<string, unknown>[];};}>(GET_LIBRARY);
    let items = data.mangas.nodes.map(mapManga);
    if (filters.status) items = items.filter(m => m.status === filters.status);
    if (filters.tags?.length) items = items.filter(m => filters.tags!.every(t => m.tags?.includes(t)));
    if (filters.unread) items = items.filter(m => (m.unreadCount ?? 0) > 0);
    if (filters.sourceId) items = items.filter(m => String(m.source?.id) === filters.sourceId);
    return {items, hasNextPage: false};
  }

  async searchManga(query: string, sourceId?: string): Promise<Manga[]> {
    if (!sourceId) return [];
    const data = await this.gql<{
      fetchSourceManga: {mangas: Record<string, unknown>[];};
    }>(FETCH_SOURCE_MANGA, {source: sourceId, type: 'SEARCH', page: 1, query});
    return data.fetchSourceManga.mangas.map(mapManga);
  }

  async addToLibrary(mangaId: string) {
    await this.gql(UPDATE_MANGA, {id: Number(mangaId), inLibrary: true});
  }

  async removeFromLibrary(mangaId: string) {
    await this.gql(UPDATE_MANGA, {id: Number(mangaId), inLibrary: false});
  }

  async updateMangaMeta(id: string, meta: Partial<MangaMeta>) {
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined) continue;
      await this.gql(SET_MANGA_META, {mangaId: Number(id), key, value: String(value)});
    }
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const data = await this.gql<{chapters: {nodes: Record<string, unknown>[];};}>(
      GET_CHAPTERS, {mangaId: Number(mangaId)}
    );
    return data.chapters.nodes.map(mapChapter);
  }

  async getChapter(id: string): Promise<Chapter> {
    const data = await this.gql<{chapter: Record<string, unknown>;}>(
      GET_CHAPTER, {id: Number(id)}
    );
    return mapChapter(data.chapter);
  }

  async getChapterPages(id: string): Promise<Page[]> {
    const data = await this.gql<{fetchChapterPages: {pages: string[];};}>(
      FETCH_CHAPTER_PAGES, {chapterId: Number(id)}
    );
    return data.fetchChapterPages.pages.map((url, index) => ({index, url}));
  }

  async markChapterRead(id: string, read: boolean) {
    await this.gql(MARK_CHAPTER_READ, {id: Number(id), isRead: read});
  }

  async updateChapterProgress(id: string, lastPageRead: number, read?: boolean) {
    await this.gql(UPDATE_CHAPTERS_PROGRESS, {
      ids: [Number(id)],
      lastPageRead,
      isRead: read,
    });
  }

  async markChaptersRead(ids: string[], read: boolean) {
    await this.gql(MARK_CHAPTERS_READ, {ids: ids.map(Number), isRead: read});
  }

  async getDownloads(): Promise<DownloadItem[]> {
    const data = await this.gql<{downloadStatus: {queue: Record<string, unknown>[];};}>(
      GET_DOWNLOAD_STATUS
    );
    return data.downloadStatus.queue.map(mapDownloadItem);
  }

  async enqueueDownload(chapterId: string) {
    await this.gql(ENQUEUE_DOWNLOAD, {chapterId: Number(chapterId)});
  }

  async dequeueDownload(chapterId: string) {
    await this.gql(DEQUEUE_DOWNLOAD, {chapterId: Number(chapterId)});
  }

  async clearDownloads() {
    await this.gql(CLEAR_DOWNLOADER);
  }

  async getExtensions(): Promise<Extension[]> {
    await this.gql(FETCH_EXTENSIONS);
    const data = await this.gql<{extensions: {nodes: Record<string, unknown>[];};}>(GET_EXTENSIONS);
    return data.extensions.nodes.map(mapExtension);
  }

  async installExtension(id: string) {
    await this.gql(UPDATE_EXTENSION, {id, install: true});
  }

  async uninstallExtension(id: string) {
    await this.gql(UPDATE_EXTENSION, {id, uninstall: true});
  }

  async updateExtension(id: string) {
    await this.gql(UPDATE_EXTENSION, {id, update: true});
  }

  async getSources(): Promise<Source[]> {
    const data = await this.gql<{sources: {nodes: Source[];};}>(GET_SOURCES);
    return data.sources.nodes;
  }

  async browseSource(sourceId: string, page: number): Promise<PaginatedResult<Manga>> {
    const data = await this.gql<{
      fetchSourceManga: {mangas: Record<string, unknown>[]; hasNextPage: boolean;};
    }>(FETCH_SOURCE_MANGA, {source: sourceId, type: 'LATEST', page});
    return {
      items: data.fetchSourceManga.mangas.map(mapManga),
      hasNextPage: data.fetchSourceManga.hasNextPage,
    };
  }

  async getTrackers(): Promise<Tracker[]> {
    const data = await this.gql<{trackers: {nodes: Tracker[];};}>(GET_TRACKERS);
    return data.trackers.nodes;
  }

  async getTrackerRecords(): Promise<TrackRecord[]> {
    const trackers = await this.getTrackers();
    const records: TrackRecord[] = [];

    for (const tracker of trackers) {
      for (const record of tracker.trackRecords?.nodes ?? []) {
        records.push(record);
      }
    }

    return records;
  }

  async loginTrackerOAuth(trackerId: number, callbackUrl: string) {
    await this.gql(LOGIN_TRACKER_OAUTH, {trackerId, callbackUrl});
  }

  async loginTrackerCredentials(trackerId: number, username: string, password: string) {
    await this.gql(LOGIN_TRACKER_CREDENTIALS, {trackerId, username, password});
  }

  async logoutTracker(trackerId: number) {
    await this.gql(LOGOUT_TRACKER, {trackerId});
  }

  async linkTracker(mangaId: string, trackerId: string, remoteId: string) {
    await this.gql(BIND_TRACK, {
      mangaId: Number(mangaId),
      trackerId: Number(trackerId),
      remoteId,
    });
  }

  async syncTracking(mangaId: string) {
    await this.gql(TRACK_PROGRESS, {mangaId: Number(mangaId)});
  }

  async checkForUpdates(mangaIds?: string[]): Promise<UpdateResult[]> {
    if (mangaIds?.length) {
      const results: UpdateResult[] = [];
      for (const id of mangaIds) {
        const before = await this.getChapters(id);
        await this.gql(FETCH_CHAPTERS, {mangaId: Number(id)});
        const after = await this.getChapters(id);
        results.push({mangaId: id, newChapters: after.length - before.length});
      }
      return results;
    }
    await this.gql(UPDATE_LIBRARY);
    return [];
  }
}