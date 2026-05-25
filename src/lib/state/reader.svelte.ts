import type { Manga, Chapter } from '$lib/types'
import type { Page } from '$lib/server-adapters/types'

export type ReadMode = 'single' | 'strip'
export type FitMode = 'width' | 'height' | 'original'
export type ReadDirection = 'ltr' | 'rtl'

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

  showControls: false,
  showSettings: false,
  fullscreen: false,
})

export function currentPageData() {
  return readerState.pages[readerState.currentPage] ?? null
}

export function progress() {
  return readerState.pages.length > 0
    ? (readerState.currentPage + 1) / readerState.pages.length
    : 0
}

export function hasPrev() {
  return readerState.currentPage > 0
}

export function hasNext() {
  return readerState.currentPage < readerState.pages.length - 1
}