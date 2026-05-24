import type { Manga } from '$lib/types'
import type { MangaStatus } from '$lib/server-adapters/types'

export type LibrarySortOption = 'alphabetical' | 'unread' | 'lastRead' | 'dateAdded'
export type LibraryTab = 'saved' | 'downloaded'

class LibraryState {
  items      = $state<Manga[]>([])
  loading    = $state(false)
  error      = $state<string | null>(null)
  refreshing = $state(false)

  tab      = $state<LibraryTab>('saved')
  sort     = $state<LibrarySortOption>('alphabetical')
  sortDesc = $state(false)

  filter = $state({
    status:     'all' as MangaStatus | 'all',
    unread:     false,
    downloaded: false,
    bookmarked: false,
    query:      '',
  })

  selected   = $state(new Set<number>())
  selectMode = $state(false)

  filteredItems = $derived.by(() => {
    let result = this.tab === 'downloaded'
      ? this.items.filter(m => (m.downloadCount ?? 0) > 0)
      : this.items.filter(m => m.inLibrary)

    if (this.filter.unread)     result = result.filter(m => (m.unreadCount ?? 0) > 0)
    if (this.filter.downloaded) result = result.filter(m => (m.downloadCount ?? 0) > 0)
    if (this.filter.bookmarked) result = result.filter(m => (m.bookmarkCount ?? 0) > 0)

    if (this.filter.status !== 'all') {
      result = result.filter(
        m => m.status?.toUpperCase().replace(/\s+/g, '_') === this.filter.status
      )
    }

    if (this.filter.query) {
      const q = this.filter.query.toLowerCase()
      result = result.filter(m => m.title.toLowerCase().includes(q))
    }

    const sorted = [...result].sort((a, b) => {
      switch (this.sort) {
        case 'unread':    return (b.unreadCount ?? 0) - (a.unreadCount ?? 0)
        case 'lastRead':  return (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0)
        case 'dateAdded': return (b.addedAt ?? 0) - (a.addedAt ?? 0)
        default:          return a.title.localeCompare(b.title)
      }
    })

    return this.sortDesc ? sorted.reverse() : sorted
  })

  get hasActiveFilters() {
    return this.filter.status !== 'all'
      || this.filter.unread
      || this.filter.downloaded
      || this.filter.bookmarked
  }

  enterSelect(id?: number) {
    this.selectMode = true
    if (id !== undefined) this.selected = new Set([id])
  }

  exitSelect() {
    this.selectMode = false
    this.selected   = new Set()
  }

  toggleSelect(id: number) {
    const next = new Set(this.selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    this.selected = next
    if (next.size === 0) this.exitSelect()
  }

  selectAll() {
    this.selected = new Set(this.filteredItems.map(m => m.id))
  }
}

export const libraryState = new LibraryState()