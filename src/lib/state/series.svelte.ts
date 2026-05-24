import type { Manga, Chapter } from '$lib/types/index'

export const seriesState = $state({
  current: null as Manga | null,
  loading: false,
  error: null as string | null,

  chapters: [] as Chapter[],
  chaptersLoading: false,
  chaptersError: null as string | null,

  chapterFilter: {
    unread: false,
    downloaded: false,
    query: '',
  },
  chapterSortDesc: true,
})

export const filteredChapters = $derived.by(() => {
  let result = seriesState.chapters

  if (seriesState.chapterFilter.unread) {
    result = result.filter(c => !c.read)
  }
  if (seriesState.chapterFilter.downloaded) {
    result = result.filter(c => c.downloaded)
  }
  if (seriesState.chapterFilter.query) {
    const q = seriesState.chapterFilter.query.toLowerCase()
    result = result.filter(c => c.name.toLowerCase().includes(q))
  }

  const sorted = [...result].sort((a, b) => a.chapterNumber - b.chapterNumber)
  return seriesState.chapterSortDesc ? sorted.reverse() : sorted
})
