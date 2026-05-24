import type { Manga, Chapter } from '$lib/types'

class SeriesState {
  current         = $state<Manga | null>(null)
  loading         = $state(false)
  error           = $state<string | null>(null)

  chapters        = $state<Chapter[]>([])
  chaptersLoading = $state(false)
  chaptersError   = $state<string | null>(null)

  chapterSortDesc = $state(true)
  chapterFilter   = $state({ unread: false, downloaded: false, query: '' })

  filteredChapters = $derived.by(() => {
    let result = this.chapters
    if (this.chapterFilter.unread)     result = result.filter(c => !c.read)
    if (this.chapterFilter.downloaded) result = result.filter(c => c.downloaded)
    if (this.chapterFilter.query) {
      const q = this.chapterFilter.query.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q))
    }
    const sorted = [...result].sort((a, b) => a.chapterNumber - b.chapterNumber)
    return this.chapterSortDesc ? sorted.reverse() : sorted
  })
}

export const seriesState = new SeriesState()