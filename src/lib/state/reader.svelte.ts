import type { Manga, Chapter }      from "$lib/types";
import type { MarkerEntry, MarkerColor } from "$lib/types/history";
import type { MangaPrefs, ReaderSettings, ReaderPreset } from "$lib/types/settings";
import { settingsState, updateSettings }                 from "$lib/state/settings.svelte";
import { seriesState }                                   from "$lib/state/series.svelte";
import { goto }                                          from "$app/navigation";

export const PAGE_STYLES   = ["single", "fade", "double", "longstrip"] as const;
export type  PageStyle     = typeof PAGE_STYLES[number];

export const MARKER_COLORS: MarkerColor[] = ["yellow", "red", "blue", "green", "purple"];
export const MARKER_COLOR_HEX: Record<MarkerColor, string> = {
  yellow: "#c4a94a",
  red:    "#c47a7a",
  blue:   "#7a9ec4",
  green:  "#7aab7a",
  purple: "#a07ac4",
};

export const ZOOM_STEP = 0.05;
export const ZOOM_MIN  = 0.1;
export const ZOOM_MAX  = 1.0;

export type { BookmarkEntry, MarkerEntry, MarkerColor } from "$lib/types/history";
export type { MangaPrefs, ReaderSettings, ReaderPreset } from "$lib/types/settings";

export interface StripChapter {
  chapterId:   number;
  chapterName: string;
  urls:        string[];
}

class ReaderState {
  get activeManga()                   { return seriesState.activeManga; }
  set activeManga(v: Manga | null)    { seriesState.activeManga = v; }

  get activeChapter()                 { return seriesState.activeChapter; }
  set activeChapter(v: Chapter | null){ seriesState.activeChapter = v; }

  pageUrls          = $state<string[]>([]);
  pageNumber        = $state(1);
  markers           = $state<MarkerEntry[]>([]);

  loading          = $state(true);
  error            = $state<string | null>(null);
  pageReady        = $state(false);
  pageGroups       = $state<number[][]>([]);
  stripChapters    = $state<StripChapter[]>([]);
  visibleChapterId = $state<number | null>(null);

  uiVisible        = $state(true);
  isFullscreen     = $state(false);

  dlOpen           = $state(false);
  zoomOpen         = $state(false);
  winOpen          = $state(false);
  presetOpen       = $state(false);
  actionsOpen      = $state(false);
  nextN            = $state(5);
  dlBusy           = $state(false);

  fadingOut        = $state(false);
  sliderDragging   = $state(false);
  sliderHover      = $state(false);

  resumePage       = $state(0);
  resumeDismissed  = $state(false);
  resumeFading     = $state(false);
  resumeVisible    = $state(false);
  stripResumeReady = $state(false);

  markerOpen       = $state(false);
  markerNote       = $state("");
  markerColor      = $state<MarkerColor>("yellow");
  markerEditId     = $state("");

  inspectScale     = $state(1);
  inspectPanX      = $state(0);
  inspectPanY      = $state(0);

  containerWidth   = $state(0);

  readonly activeChapterList = $derived(seriesState.readerChapterList);

  get settings() { return settingsState.settings; }

  openReader(chapter: Chapter, manga?: Manga | null) {
    const isChapterNav = this.activeChapter !== null;
    this.activeChapter = chapter;
    if (manga !== undefined) this.activeManga = manga;
    goto(`/reader/${this.activeManga!.id}/${chapter.id}`, { replaceState: isChapterNav });
  }

  closeReader() {
    this.activeChapter = null;
    history.back();
  }

  resetForChapter() {
    this.loading          = true;
    this.error            = null;
    this.pageReady        = false;
    this.pageGroups       = [];
    this.stripChapters    = [];
    this.visibleChapterId = null;
    this.fadingOut        = false;
    this.markerOpen       = false;
  }

  resetResume() {
    this.resumePage       = 0;
    this.resumeDismissed  = false;
    this.resumeVisible    = false;
    this.stripResumeReady = false;
  }

  resetInspect() {
    this.inspectScale = 1;
    this.inspectPanX  = 0;
    this.inspectPanY  = 0;
  }

  closeAllPopovers(): boolean {
    if (this.markerOpen)  { this.markerOpen  = false; return true; }
    if (this.zoomOpen)    { this.zoomOpen    = false; return true; }
    if (this.dlOpen)      { this.dlOpen      = false; return true; }
    if (this.winOpen)     { this.winOpen     = false; return true; }
    if (this.presetOpen)  { this.presetOpen  = false; return true; }
    if (this.actionsOpen) { this.actionsOpen = false; return true; }
    return false;
  }

  openMarker(editId: string, note: string, color: MarkerColor) {
    this.markerEditId = editId;
    this.markerNote   = note;
    this.markerColor  = color;
    this.markerOpen   = true;
    this.zoomOpen     = false;
    this.dlOpen       = false;
    this.winOpen      = false;
  }

  clearMarkerPopover() {
    this.markerOpen   = false;
    this.markerNote   = "";
    this.markerEditId = "";
  }

  addMarker(entry: Omit<MarkerEntry, "id" | "createdAt">): string {
    const id = Math.random().toString(36).slice(2);
    this.markers = [...this.markers, { ...entry, id, createdAt: Date.now() }];
    return id;
  }

  updateMarker(id: string, patch: Partial<Pick<MarkerEntry, "note" | "color">>) {
    this.markers = this.markers.map(m => m.id === id ? { ...m, ...patch } : m);
  }

  removeMarker(id: string) {
    this.markers = this.markers.filter(m => m.id !== id);
  }

  getMarkersForPage(chapterId: number, page: number) {
    return this.markers.filter(m => m.chapterId === chapterId && m.pageNumber === page);
  }

  getMarkersForChapter(chapterId: number) {
    return this.markers.filter(m => m.chapterId === chapterId);
  }

  getMangaPrefs(mangaId: number): MangaPrefs {
    const prefs = settingsState.settings.mangaPrefs?.[mangaId] ?? {};
    return { ...DEFAULT_MANGA_PREFS, ...prefs };
  }

  setMangaReaderSettings(mangaId: number, patch: Partial<ReaderSettings>) {
    updateSettings({
      mangaReaderSettings: {
        ...settingsState.settings.mangaReaderSettings,
        [mangaId]: { ...(settingsState.settings.mangaReaderSettings?.[mangaId] ?? {}), ...patch } as ReaderSettings,
      },
    });
  }

  clearMangaReaderSettings(mangaId: number) {
    const next = { ...settingsState.settings.mangaReaderSettings };
    delete next[mangaId];
    updateSettings({ mangaReaderSettings: next });
  }

  saveReaderPreset(name: string, settings: ReaderSettings) {
    const preset: ReaderPreset = { id: Math.random().toString(36).slice(2), name, settings };
    updateSettings({ readerPresets: [...(settingsState.settings.readerPresets ?? []), preset] });
  }

  updateReaderPreset(id: string, patch: Partial<Pick<ReaderPreset, "name" | "settings">>) {
    updateSettings({
      readerPresets: (settingsState.settings.readerPresets ?? []).map(p =>
        p.id === id ? { ...p, ...patch } : p
      ),
    });
  }

  deleteReaderPreset(id: string) {
    updateSettings({ readerPresets: (settingsState.settings.readerPresets ?? []).filter(p => p.id !== id) });
  }
}

export const DEFAULT_MANGA_PREFS: MangaPrefs = {
  autoDownload: false, downloadAhead: 0, deleteOnRead: false,
  deleteDelayHours: 0, maxKeepChapters: 0, pauseUpdates: false,
  refreshInterval: "global", preferredScanlator: "", scanlatorFilter: [],
  scanlatorBlacklist: [], scanlatorForce: false, autoDownloadScanlators: [],
  sortMode: "source", sortDir: "asc", coverUrl: "",
};

export const readerState = new ReaderState();

export function openReader(ch: Chapter, manga?: Manga | null)  { readerState.openReader(ch, manga); }
export function closeReader()                                   { readerState.closeReader(); }