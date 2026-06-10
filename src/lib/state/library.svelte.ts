import type { Manga }       from "$lib/types";
import type { MangaStatus } from "$lib/server-adapters/types";
import type { Category }    from "$lib/types";
import { settingsState, updateSettings } from "$lib/state/settings.svelte";

export type LibrarySortOption =
  | "alphabetical"
  | "unread"
  | "lastRead"
  | "dateAdded"
  | "totalChapters"
  | "latestFetched"
  | "latestUploaded";

export type LibrarySortDir = "asc" | "desc";

export type LibraryContentFilter = "unread" | "started" | "downloaded" | "bookmarked";

export type LibraryStatusFilter =
  | "ALL"
  | "ONGOING"
  | "COMPLETED"
  | "ON_HIATUS"
  | "CANCELLED"
  | "PUBLISHING_FINISHED";

class LibraryState {
  items      = $state<Manga[]>([]);
  categories = $state<Category[]>([]);
  loading    = $state(false);
  error      = $state<string | null>(null);
  refreshing = $state(false);

  tab = $state<string>("library");

  tabSort    = $state<Record<string, { mode: LibrarySortOption; dir: LibrarySortDir }>>({});
  tabStatus  = $state<Record<string, LibraryStatusFilter>>({});
  tabFilters = $state<Record<string, Partial<Record<LibraryContentFilter, boolean>>>>({});

  hiddenTabs            = $state<Set<string>>(new Set());
  pinnedTabOrder        = $state<string[]>([]);
  defaultCategoryId     = $state<number | null>(null);
  showAllInSaved        = $state(true);
  hideCompletedInSaved  = $state(false);
  categoryFrecency      = $state<Record<number, number>>({});

  filter = $state({ query: "" });

  selected   = $state(new Set<number>());
  selectMode = $state(false);

  refreshProgress   = $state({ finished: 0, total: 0 });
  refreshDone       = $state(false);

  refreshingMangaId = $state<number | null>(null);
  refreshingCatId   = $state<number | null>(null);

  readonly COMPLETED_NAME = "Completed";

  get completedCatId(): number | null {
    return this.categories.find(c => c.name === this.COMPLETED_NAME && c.id !== 0)?.id ?? null;
  }

  get categoryMangaMap(): Map<number, Manga[]> {
    const map = new Map<number, Manga[]>();
    for (const cat of this.categories) {
      map.set(cat.id, (cat as any).mangas?.nodes ?? []);
    }
    return map;
  }

  get allTabIds(): string[] {
    const catIds  = this.categories.filter(c => c.id !== 0).map(c => String(c.id));
    const BUILTIN = ["library", "downloaded"];
    const known   = new Set([...BUILTIN, ...catIds]);
    const ordered: string[] = [];
    const inOrder = new Set<string>();
    for (const id of this.pinnedTabOrder) {
      if (known.has(id) && !inOrder.has(id)) { ordered.push(id); inOrder.add(id); }
    }
    for (const id of [...BUILTIN, ...catIds]) {
      if (!inOrder.has(id)) { ordered.push(id); inOrder.add(id); }
    }
    return ordered;
  }

  get visibleTabIds(): string[] {
    return this.allTabIds.filter(id => !this.hiddenTabs.has(id));
  }

  get visibleCategories(): Category[] {
    const pinned   = this.pinnedTabOrder;
    const defId    = this.defaultCategoryId;
    const cats     = this.categories.filter(c => c.id !== 0 && !this.hiddenTabs.has(String(c.id)));
    const pinOrder = (id: number) => { const i = pinned.indexOf(String(id)); return i === -1 ? Infinity : i; };
    return [...cats].sort((a, b) => {
      if (a.id === defId) return -1;
      if (b.id === defId) return  1;
      const pd = pinOrder(a.id) - pinOrder(b.id);
      return pd !== 0 ? pd : (a as any).order - (b as any).order;
    });
  }

  get counts(): Record<string, number> {
    const m: Record<string, number> = {
      library:    this.showAllInSaved
        ? this.items.filter(x => x.inLibrary).length
        : (this.categoryMangaMap.get(0) ?? []).length,
      downloaded: this.items.filter(x => (x.downloadCount ?? 0) > 0).length,
    };
    for (const cat of this.visibleCategories) {
      m[String(cat.id)] = (this.categoryMangaMap.get(cat.id) ?? []).length;
    }
    return m;
  }

  filteredItems = $derived.by(() => {
    const tab = this.tab;

    let items: Manga[];
    if (tab === "library") {
      items = this.showAllInSaved
        ? this.items.filter(m => m.inLibrary)
        : (this.categoryMangaMap.get(0) ?? []);

      if (this.showAllInSaved && this.hideCompletedInSaved) {
        const completedCat = this.categories.find(c => c.name === this.COMPLETED_NAME);
        if (completedCat) {
          const completedIds = new Set((this.categoryMangaMap.get(completedCat.id) ?? []).map(m => m.id));
          items = items.filter(m => !completedIds.has(m.id));
        }
      }
    } else if (tab === "downloaded") {
      items = this.items.filter(m => (m.downloadCount ?? 0) > 0);
    } else {
      items = this.categoryMangaMap.get(Number(tab)) ?? [];
    }

    const q = this.filter.query.trim().toLowerCase();
    if (q) items = items.filter(m => m.title.toLowerCase().includes(q));

    const status = this.tabStatus[tab] ?? "ALL";
    if (status !== "ALL") {
      items = items.filter(m => {
        const s = m.status?.toUpperCase().replace(/\s+/g, "_") ?? "UNKNOWN";
        return s === status;
      });
    }

    const f = this.tabFilters[tab] ?? {};
    if (f.unread)     items = items.filter(m => (m.unreadCount ?? 0) > 0);
    if (f.started)    items = items.filter(m => (m.unreadCount ?? 0) > 0 && (m.totalChapters ?? 0) > (m.unreadCount ?? 0));
    if (f.downloaded) items = items.filter(m => (m.downloadCount ?? 0) > 0);
    if (f.bookmarked) items = items.filter(m => (m.bookmarkCount ?? 0) > 0);

    const { mode, dir } = this.tabSort[tab] ?? { mode: "alphabetical" as LibrarySortOption, dir: "asc" as LibrarySortDir };

    const sorted = [...items].sort((a, b) => {
      switch (mode) {
        case "unread":         return (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
        case "lastRead":       return (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0);
        case "dateAdded":      return (b.addedAt ?? 0) - (a.addedAt ?? 0);
        case "totalChapters":  return (b.chapters?.totalCount ?? 0) - (a.chapters?.totalCount ?? 0);
        case "latestFetched":  return Number(b.latestFetchedChapter?.uploadDate ?? 0) - Number(a.latestFetchedChapter?.uploadDate ?? 0);
        case "latestUploaded": return Number(b.latestUploadedChapter?.uploadDate ?? 0) - Number(a.latestUploadedChapter?.uploadDate ?? 0);
        default:               return a.title.localeCompare(b.title);
      }
    });

    return dir === "desc" ? sorted.reverse() : sorted;
  });

  get hasActiveFilters(): boolean {
    const tab     = this.tab;
    const status  = this.tabStatus[tab]  ?? "ALL";
    const filters = this.tabFilters[tab] ?? {};
    return status !== "ALL" || Object.values(filters).some(Boolean);
  }

  setTabSort(tab: string, mode: LibrarySortOption, dir?: LibrarySortDir) {
    const prev   = this.tabSort[tab];
    const newDir = dir ?? prev?.dir ?? "asc";
    this.tabSort = { ...this.tabSort, [tab]: { mode, dir: newDir } };
  }

  toggleTabSortDir(tab: string) {
    const prev = this.tabSort[tab];
    const mode = prev?.mode ?? "alphabetical";
    const dir  = prev?.dir  === "asc" ? "desc" : "asc";
    this.setTabSort(tab, mode, dir);
  }

  setTabStatus(tab: string, status: LibraryStatusFilter) {
    this.tabStatus = { ...this.tabStatus, [tab]: status };
  }

  toggleTabFilter(tab: string, filter: LibraryContentFilter) {
    const current = this.tabFilters[tab] ?? {};
    this.tabFilters = { ...this.tabFilters, [tab]: { ...current, [filter]: !current[filter] } };
  }

  clearTabFilters(tab: string) {
    this.tabStatus  = { ...this.tabStatus,  [tab]: "ALL" };
    this.tabFilters = { ...this.tabFilters, [tab]: {} };
  }

  syncFromSettings(s: {
    hiddenLibraryTabs?:          string[];
    libraryPinnedTabOrder?:      string[];
    defaultLibraryCategoryId?:   number | null;
    libraryShowAllInSaved?:      boolean;
    libraryHideCompletedInSaved?: boolean;
  }) {
    if (s.hiddenLibraryTabs)                        this.hiddenTabs          = new Set(s.hiddenLibraryTabs);
    if (s.libraryPinnedTabOrder)                    this.pinnedTabOrder      = s.libraryPinnedTabOrder;
    if (s.defaultLibraryCategoryId !== undefined)   this.defaultCategoryId   = s.defaultLibraryCategoryId ?? null;
    if (s.libraryShowAllInSaved !== undefined)       this.showAllInSaved      = s.libraryShowAllInSaved;
    if (s.libraryHideCompletedInSaved !== undefined) this.hideCompletedInSaved = s.libraryHideCompletedInSaved;
  }

  setCategories(cats: Category[]) {
    this.categories = cats;
  }

  bumpCategoryFrecency(catId: number) {
    this.categoryFrecency = { ...this.categoryFrecency, [catId]: (this.categoryFrecency[catId] ?? 0) + 1 };
  }

  enterSelect(id?: number) {
    this.selectMode = true;
    if (id !== undefined) this.selected = new Set([id]);
  }

  exitSelect() {
    this.selectMode = false;
    this.selected   = new Set();
  }

  toggleSelect(id: number) {
    const next = new Set(this.selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selected = next;
    if (next.size === 0) this.exitSelect();
  }

  selectAll(ids: number[]) {
    this.selected = new Set(ids);
  }

  guardTab() {
    if (this.tab === "library" || this.tab === "downloaded") return;
    const id = Number(this.tab);
    if (!this.categories.some(c => c.id === id)) this.tab = "library";
  }
}

export const libraryState = new LibraryState();