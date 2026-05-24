import type {Manga, Chapter} from '$lib/types';
import type {Page} from '$lib/server-adapters/types';

export type ReadMode = 'single' | 'strip';
export type FitMode = 'width' | 'height' | 'original';
export type ReadDirection = 'ltr' | 'rtl';

export const readerState = $state({
  manga: null as Manga | null,
  chapter: null as Chapter | null,
  chapters: [] as Chapter[],

  pages: [] as Page[],
  pagesLoading: false,
  pagesError: null as string | null,

  currentPage: 0,
  mode: 'single' as ReadMode,
  fit: 'width' as FitMode,
  direction: 'ltr' as ReadDirection,
  zoom: 1,

  /** Inspect-mode zoom for single-page view (1 = no magnification). */
  inspectScale: 1,
  /** Inspect-mode pan offset in CSS pixels. */
  inspectPanX: 0,
  inspectPanY: 0,

  /** Whether auto-scroll is currently active in longstrip mode. */
  autoScrollActive: false,

  showControls: false,
  showSettings: false,
  fullscreen: false,
});

export const currentPageData = $derived(
  readerState.pages[readerState.currentPage] ?? null
);

export const progress = $derived(
  readerState.pages.length > 0
    ? (readerState.currentPage + 1) / readerState.pages.length
    : 0
);

export const hasPrev = $derived(readerState.currentPage > 0);
export const hasNext = $derived(
  readerState.currentPage < readerState.pages.length - 1
);
