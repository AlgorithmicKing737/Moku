import { createSorter }    from '$lib/core/algorithms/sort'
import type { Manga }      from '$lib/types'
import type { LibrarySortOption, LibrarySortDir } from '$lib/state/library.svelte'

export const librarySorter = createSorter<Manga>({
  defaultField: 'alphabetical',
  defaultDir:   'asc',
  fields: [
    {
      key:        'alphabetical',
      comparator: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    },
    {
      key:        'unread',
      comparator: (a, b) => (a.unreadCount ?? 0) - (b.unreadCount ?? 0),
    },
    {
      key:        'totalChapters',
      comparator: (a, b) => (a.chapters?.totalCount ?? 0) - (b.chapters?.totalCount ?? 0),
    },
    {
      key:        'dateAdded',
      comparator: (a, b) => Number(a.inLibraryAt ?? 0) - Number(b.inLibraryAt ?? 0),
    },
    {
      key:        'lastRead',
      comparator: (a, b, ctx) => {
        const map = ctx?.recentlyReadMap as Map<number, number> | undefined
        return (map?.get(a.id) ?? 0) - (map?.get(b.id) ?? 0)
      },
    },
    {
      key:        'latestFetched',
      comparator: (a, b) =>
        Number(a.latestFetchedChapter?.uploadDate ?? 0) - Number(b.latestFetchedChapter?.uploadDate ?? 0),
    },
    {
      key:        'latestUploaded',
      comparator: (a, b) =>
        Number(a.latestUploadedChapter?.uploadDate ?? 0) - Number(b.latestUploadedChapter?.uploadDate ?? 0),
    },
  ],
})

export function sortLibrary(
  items:           Manga[],
  mode:            LibrarySortOption,
  dir:             LibrarySortDir,
  recentlyReadMap?: Map<number, number>,
): Manga[] {
  return librarySorter.sort(items, mode, dir, recentlyReadMap ? { recentlyReadMap } : undefined)
}