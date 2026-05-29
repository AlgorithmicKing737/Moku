import type { Manga, Chapter }                                        from "$lib/types";
import type { BookmarkEntry, MarkerEntry, MarkerColor }               from "$lib/types/history";
import type { MangaPrefs }                                            from "$lib/types/settings";
import { settingsState, updateSettings }                              from "$lib/state/settings.svelte";
import { goto }                                                       from "$app/navigation";

export type { BookmarkEntry, MarkerEntry, MarkerColor } from "$lib/types/history";
export type { MangaPrefs }                              from "$lib/types/settings";

class SeriesStore {
  current             = $state<Manga | null>(null);
  loading             = $state(false);
  error               = $state<string | null>(null);

  chapters            = $state<Chapter[]>([]);
  chaptersLoading     = $state(false);
  chaptersError       = $state<string | null>(null);

  activeMangaId       = $state<number | null>(null);
  activeManga         = $state<Manga | null>(null);
  previewManga        = $state<Manga | null>(null);
  activeChapter       = $state<Chapter | null>(null);
  activeChapterList   = $state<Chapter[]>([]);
  bookmarks           = $state<BookmarkEntry[]>([]);
  markers             = $state<MarkerEntry[]>([]);
  acknowledgedUpdates = $state<Set<number>>(new Set());

  setActiveMangaId(next: number | null) { this.activeMangaId = next; }
  setActiveManga(next: Manga | null)  { this.activeManga  = next; }
  setPreviewManga(next: Manga | null) { this.previewManga = next; }

  openReader(chapter: Chapter, chapterList: Chapter[], manga?: Manga | null) {
    this.activeChapter     = chapter;
    this.activeChapterList = chapterList;
    if (manga !== undefined) this.activeManga = manga;
    goto(`/reader/${this.activeManga!.id}/${chapter.id}`);
  }

  closeReader() {
    this.activeChapter     = null;
    this.activeChapterList = [];
  }

  acknowledgeUpdate(mangaId: number) {
    if (this.acknowledgedUpdates.has(mangaId)) return;
    this.acknowledgedUpdates = new Set([...this.acknowledgedUpdates, mangaId]);
  }

  addBookmark(entry: Omit<BookmarkEntry, "savedAt">, label?: string) {
    this.bookmarks = [
      { ...entry, savedAt: Date.now(), label },
      ...this.bookmarks.filter(b => b.chapterId !== entry.chapterId),
    ].slice(0, 200);
  }

  removeBookmark(chapterId: number)  { this.bookmarks = this.bookmarks.filter(b => b.chapterId !== chapterId); }
  clearBookmarks()                   { this.bookmarks = []; }
  getBookmark(chapterId: number)     { return this.bookmarks.find(b => b.chapterId === chapterId); }

  addMarker(entry: Omit<MarkerEntry, "id" | "createdAt">): string {
    const id = Math.random().toString(36).slice(2);
    this.markers = [...this.markers, { ...entry, id, createdAt: Date.now() }];
    return id;
  }

  updateMarker(id: string, patch: Partial<Pick<MarkerEntry, "note" | "color">>) {
    this.markers = this.markers.map(m => m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m);
  }

  removeMarker(id: string)                            { this.markers = this.markers.filter(m => m.id !== id); }
  getMarkersForPage(chapterId: number, page: number)  { return this.markers.filter(m => m.chapterId === chapterId && m.pageNumber === page); }
  getMarkersForChapter(chapterId: number)             { return this.markers.filter(m => m.chapterId === chapterId); }
  getMarkersForManga(mangaId: number)                 { return this.markers.filter(m => m.mangaId === mangaId); }
  clearMarkersForManga(mangaId: number)               { this.markers = this.markers.filter(m => m.mangaId !== mangaId); }

  getPref<K extends keyof MangaPrefs>(mangaId: number, key: K): MangaPrefs[K] {
    const prefs = settingsState.settings.mangaPrefs?.[mangaId] ?? {};
    return (prefs[key] ?? DEFAULT_MANGA_PREFS[key]) as MangaPrefs[K];
  }

  setPref<K extends keyof MangaPrefs>(mangaId: number, key: K, value: MangaPrefs[K]) {
    updateSettings({
      mangaPrefs: {
        ...settingsState.settings.mangaPrefs,
        [mangaId]: { ...(settingsState.settings.mangaPrefs?.[mangaId] ?? {}), [key]: value },
      },
    });
  }

  get settings() { return settingsState.settings; }
}

export const DEFAULT_MANGA_PREFS: MangaPrefs = {
  sortMode:           "source",
  sortDir:            "asc",
  preferredScanlator: "",
  scanlatorFilter:    [],
  scanlatorBlacklist: [],
  scanlatorForce:     false,
  autoDownload:       false,
  downloadAhead:      0,
  maxKeepChapters:    0,
  deleteOnRead:       false,
  deleteDelayHours:   0,
  pauseUpdates:       false,
  refreshInterval:    "global",
  coverUrl:           "",
};

export const seriesState = new SeriesStore();

export const seriesStore = seriesState;

export function setActiveMangaId(next: number | null)                                          { seriesState.setActiveMangaId(next); }
export function setActiveManga(next: Manga | null)                                             { seriesState.setActiveManga(next); }
export function setPreviewManga(next: Manga | null)                                            { seriesState.setPreviewManga(next); }
export function openReader(ch: Chapter, list: Chapter[], manga?: Manga | null)                 { seriesState.openReader(ch, list, manga); }
export function closeReader()                                                                   { seriesState.closeReader(); }
export function acknowledgeUpdate(mangaId: number)                                             { seriesState.acknowledgeUpdate(mangaId); }
export function addBookmark(entry: Omit<BookmarkEntry, "savedAt">, label?: string)             { seriesState.addBookmark(entry, label); }
export function removeBookmark(chapterId: number)                                              { seriesState.removeBookmark(chapterId); }
export function clearBookmarks()                                                                { seriesState.clearBookmarks(); }
export function getBookmark(chapterId: number)                                                 { return seriesState.getBookmark(chapterId); }
export function addMarker(entry: Omit<MarkerEntry, "id" | "createdAt">): string               { return seriesState.addMarker(entry); }
export function updateMarker(id: string, patch: Partial<Pick<MarkerEntry, "note" | "color">>) { seriesState.updateMarker(id, patch); }
export function removeMarker(id: string)                                                        { seriesState.removeMarker(id); }
export function getMarkersForPage(chapterId: number, page: number)                             { return seriesState.getMarkersForPage(chapterId, page); }
export function getMarkersForChapter(chapterId: number)                                        { return seriesState.getMarkersForChapter(chapterId); }
export function getMarkersForManga(mangaId: number)                                            { return seriesState.getMarkersForManga(mangaId); }
export function clearMarkersForManga(mangaId: number)                                          { seriesState.clearMarkersForManga(mangaId); }
export function getPref<K extends keyof MangaPrefs>(mangaId: number, key: K): MangaPrefs[K]   { return seriesState.getPref(mangaId, key); }
export function setPref<K extends keyof MangaPrefs>(mangaId: number, key: K, value: MangaPrefs[K]) { seriesState.setPref(mangaId, key, value); }