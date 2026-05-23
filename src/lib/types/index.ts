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
export type {Settings} from './settings';

// ─── GQL client ────────────────────────────────────────────────────────────

interface GQLResponse<T> {
  data: T;
  errors?: {message: string;}[];
}

// ─── Queries ────────────────────────────────────────────────────────────────

const GET_LIBRARY = `
  query GetLibrary {
    mangas(condition: { inLibrary: true }) {
      nodes {
        id title thumbnailUrl inLibrary downloadCount unreadCount bookmarkCount
        description status author artist genre inLibraryAt lastFetchedAt
        source { id name displayName }
        chapters { totalCount }
        lastReadChapter { id chapterNumber }
        firstUnreadChapter { id chapterNumber }
      }
    }
  }
`;

const GET_MANGA = `
  query GetManga($id: Int!) {
    manga(id: $id) {
      id title description thumbnailUrl status author artist genre inLibrary realUrl
      inLibraryAt lastFetchedAt updateStrategy
      source { id name displayName }
      lastReadChapter { id chapterNumber lastPageRead }
      firstUnreadChapter { id chapterNumber }
      highestNumberedChapter { id chapterNumber }
    }
  }
`;

const GET_CHAPTERS = `
  query GetChapters($mangaId: Int!) {
    chapters(condition: { mangaId: $mangaId }) {
      nodes {
        id name chapterNumber sourceOrder isRead isDownloaded isBookmarked
        pageCount mangaId uploadDate realUrl lastPageRead lastReadAt scanlator
      }
    }
  }
`;

const GET_DOWNLOAD_STATUS = `
  query GetDownloadStatus {
    downloadStatus {
      state
      queue {
        progress state tries
        chapter {
          id name pageCount mangaId
          manga { id title thumbnailUrl }
        }
      }
    }
  }
`;

const GET_EXTENSIONS = `
  query GetExtensions {
    extensions {
      nodes {
        apkName pkgName name lang versionName
        isInstalled isObsolete hasUpdate iconUrl
      }
    }
  }
`;

const GET_SOURCES = `
  query GetSources {
    sources {
      nodes {
        id name lang displayName iconUrl isNsfw
        isConfigurable supportsLatest
      }
    }
  }
`;

const GET_TRACKERS = `
  query GetTrackers {
    trackers {
      nodes {
        id name icon isLoggedIn isTokenExpired authUrl
        supportsPrivateTracking supportsReadingDates supportsTrackDeletion
        scores
        statuses { value name }
      }
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────────────────────────

const FETCH_MANGA = `
  mutation FetchManga($id: Int!) {
    fetchManga(input: { id: $id }) {
      manga {
        id title description thumbnailUrl status author artist genre inLibrary realUrl
        source { id name displayName }
      }
    }
  }
`;

const FETCH_SOURCE_MANGA = `
  mutation FetchSourceManga($source: LongString!, $type: FetchSourceMangaType!, $page: Int!, $query: String) {
    fetchSourceManga(input: { source: $source, type: $type, page: $page, query: $query }) {
      mangas { id title thumbnailUrl inLibrary }
      hasNextPage
    }
  }
`;

const UPDATE_MANGA = `
  mutation UpdateManga($id: Int!, $inLibrary: Boolean) {
    updateManga(input: { id: $id, patch: { inLibrary: $inLibrary } }) {
      manga { id inLibrary }
    }
  }
`;

const SET_MANGA_META = `
  mutation SetMangaMeta($mangaId: Int!, $key: String!, $value: String!) {
    setMangaMeta(input: { meta: { mangaId: $mangaId, key: $key, value: $value } }) {
      meta { key value }
    }
  }
`;

const FETCH_CHAPTERS = `
  mutation FetchChapters($mangaId: Int!) {
    fetchChapters(input: { mangaId: $mangaId }) {
      chapters {
        id name chapterNumber sourceOrder isRead isDownloaded isBookmarked
        pageCount mangaId uploadDate realUrl lastPageRead lastReadAt scanlator
      }
    }
  }
`;

const FETCH_CHAPTER_PAGES = `
  mutation FetchChapterPages($chapterId: Int!) {
    fetchChapterPages(input: { chapterId: $chapterId }) { pages }
  }
`;

const MARK_CHAPTER_READ = `
  mutation MarkChapterRead($id: Int!, $isRead: Boolean!) {
    updateChapter(input: { id: $id, patch: { isRead: $isRead } }) {
      chapter { id isRead }
    }
  }
`;

const MARK_CHAPTERS_READ = `
  mutation MarkChaptersRead($ids: [Int!]!, $isRead: Boolean!) {
    updateChapters(input: { ids: $ids, patch: { isRead: $isRead } }) {
      chapters { id isRead }
    }
  }
`;

const ENQUEUE_DOWNLOAD = `
  mutation EnqueueDownload($chapterId: Int!) {
    enqueueChapterDownload(input: { id: $chapterId }) {
      downloadStatus { state }
    }
  }
`;

const DEQUEUE_DOWNLOAD = `
  mutation DequeueDownload($chapterId: Int!) {
    dequeueChapterDownload(input: { id: $chapterId }) {
      downloadStatus { state }
    }
  }
`;

const CLEAR_DOWNLOADER = `
  mutation ClearDownloader {
    clearDownloader(input: {}) {
      downloadStatus { state }
    }
  }
`;

const FETCH_EXTENSIONS = `
  mutation FetchExtensions {
    fetchExtensions(input: {}) {
      extensions {
        apkName pkgName name lang versionName
        isInstalled isObsolete hasUpdate iconUrl
      }
    }
  }
`;

const UPDATE_EXTENSION = `
  mutation UpdateExtension($id: String!, $install: Boolean, $uninstall: Boolean, $update: Boolean) {
    updateExtension(input: { id: $id, patch: { install: $install, uninstall: $uninstall, update: $update } }) {
      extension { apkName pkgName name isInstalled hasUpdate }
    }
  }
`;

const BIND_TRACK = `
  mutation BindTrack($mangaId: Int!, $trackerId: Int!, $remoteId: LongString!) {
    bindTrack(input: { mangaId: $mangaId, trackerId: $trackerId, remoteId: $remoteId }) {
      trackRecord { id trackerId remoteId }
    }
  }
`;

const TRACK_PROGRESS = `
  mutation TrackProgress($mangaId: Int!) {
    trackProgress(input: { mangaId: $mangaId }) {
      trackRecords { id trackerId lastChapterRead status }
    }
  }
`;

const UPDATE_LIBRARY = `
  mutation UpdateLibrary {
    updateLibrary(input: {}) {
      updateStatus { jobsInfo { isRunning finishedJobs totalJobs } }
    }
  }
`;

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapChapter(raw: Record<string, unknown>): Chapter {
  return {
    id: raw.id as number,
    name: raw.name as string,
    chapterNumber: raw.chapterNumber as number,
    sourceOrder: raw.sourceOrder as number,
    read: (raw.isRead as boolean) ?? false,
    downloaded: (raw.isDownloaded as boolean) ?? false,
    bookmarked: (raw.isBookmarked as boolean) ?? false,
    pageCount: (raw.pageCount as number) ?? 0,
    mangaId: raw.mangaId as number,
    fetchedAt: raw.fetchedAt as string | undefined,
    uploadDate: raw.uploadDate as string | null | undefined,
    realUrl: raw.realUrl as string | null | undefined,
    lastPageRead: raw.lastPageRead as number | undefined,
    lastReadAt: raw.lastReadAt as string | undefined,
    scanlator: raw.scanlator as string | null | undefined,
    manga: raw.manga as Chapter['manga'],
  };
}

function mapManga(raw: Record<string, unknown>): Manga {
  const inLibraryAt = raw.inLibraryAt as string | null | undefined;
  return {
    ...(raw as unknown as Manga),
    tags: raw.genre as string[] | undefined,
    addedAt: inLibraryAt ? new Date(inLibraryAt).getTime() : undefined,
    lastReadAt: raw.lastReadChapter
      ? Date.now()
      : undefined,
  };
}

function mapExtension(raw: Record<string, unknown>): Extension {
  return {
    ...(raw as unknown as Extension),
    id: raw.pkgName as string,
  };
}

function mapDownloadItem(raw: Record<string, unknown>): DownloadItem {
  const chapter = raw.chapter as Record<string, unknown>;
  const manga = chapter?.manga as Record<string, unknown>;
  return {
    chapterId: String(chapter?.id),
    mangaId: String(chapter?.mangaId ?? manga?.id),
    chapterName: chapter?.name as string,
    mangaTitle: manga?.title as string,
    progress: (raw.progress as number) ?? 0,
    state: mapDownloadState(raw.state as string),
  };
}

function mapDownloadState(state: string): DownloadItem['state'] {
  switch (state) {
    case 'DOWNLOADING': return 'downloading';
    case 'FINISHED': return 'finished';
    case 'ERROR': return 'error';
    default: return 'queued';
  }
}

// ─── Adapter ────────────────────────────────────────────────────────────────

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

  // ── Manga ──────────────────────────────────────────────────────────────

  async getManga(id: string): Promise<Manga> {
    const data = await this.gql<{manga: Record<string, unknown>;}>(
      GET_MANGA, {id: Number(id)}
    );
    return mapManga(data.manga);
  }

  async getMangaList(filters: MangaFilters): Promise<PaginatedResult<Manga>> {
    if (filters.inLibrary) {
      const data = await this.gql<{mangas: {nodes: Record<string, unknown>[];};}>(GET_LIBRARY);
      return {items: data.mangas.nodes.map(mapManga), hasNextPage: false};
    }
    const data = await this.gql<{mangas: {nodes: Record<string, unknown>[];};}>(GET_LIBRARY);
    return {items: data.mangas.nodes.map(mapManga), hasNextPage: false};
  }

  async searchManga(query: string, sourceId?: string): Promise<Manga[]> {
    if (!sourceId) return [];
    const data = await this.gql<{
      fetchSourceManga: {mangas: Record<string, unknown>[];};
    }>(FETCH_SOURCE_MANGA, {
      source: sourceId,
      type: 'SEARCH',
      page: 1,
      query,
    });
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
      await this.gql(SET_MANGA_META, {
        mangaId: Number(id),
        key,
        value: String(value),
      });
    }
  }

  // ── Chapters ───────────────────────────────────────────────────────────

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const data = await this.gql<{chapters: {nodes: Record<string, unknown>[];};}>(
      GET_CHAPTERS, {mangaId: Number(mangaId)}
    );
    return data.chapters.nodes.map(mapChapter);
  }

  async getChapter(id: string): Promise<Chapter> {
    const chapters = await this.gql<{chapters: {nodes: Record<string, unknown>[];};}>(
      GET_CHAPTERS, {mangaId: 0}
    );
    const found = chapters.chapters.nodes.find(c => String(c.id) === id);
    if (!found) throw new Error(`Chapter ${id} not found`);
    return mapChapter(found);
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

  async markChaptersRead(ids: string[], read: boolean) {
    await this.gql(MARK_CHAPTERS_READ, {ids: ids.map(Number), isRead: read});
  }

  // ── Downloads ──────────────────────────────────────────────────────────

  async getDownloads(): Promise<DownloadItem[]> {
    const data = await this.gql<{
      downloadStatus: {queue: Record<string, unknown>[];};
    }>(GET_DOWNLOAD_STATUS);
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

  // ── Extensions ─────────────────────────────────────────────────────────

  async getExtensions(): Promise<Extension[]> {
    await this.gql(FETCH_EXTENSIONS);
    const data = await this.gql<{extensions: {nodes: Record<string, unknown>[];};}>(
      GET_EXTENSIONS
    );
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
    }>(FETCH_SOURCE_MANGA, {
      source: sourceId,
      type: 'LATEST',
      page,
    });
    return {
      items: data.fetchSourceManga.mangas.map(mapManga),
      hasNextPage: data.fetchSourceManga.hasNextPage,
    };
  }

  // ── Tracking ───────────────────────────────────────────────────────────

  async getTrackers(): Promise<Tracker[]> {
    const data = await this.gql<{trackers: {nodes: Tracker[];};}>(GET_TRACKERS);
    return data.trackers.nodes;
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

  // ── Updates ────────────────────────────────────────────────────────────

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
