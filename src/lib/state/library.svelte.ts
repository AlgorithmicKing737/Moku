import type {Manga} from '$lib/types';
import type {MangaStatus} from '$lib/server-adapters/types';
import {shouldHideNsfw} from '$lib/core/util';
import {settingsState} from '$lib/state/settings.svelte';

export type LibrarySortOption = 'alphabetical' | 'unread' | 'lastRead' | 'dateAdded';

export const libraryState = $state({
  items: [] as Manga[],
  searchResults: [] as Manga[],
  loading: false,
  error: null as string | null,
  filter: {
    status: 'all' as MangaStatus | 'all',
    tags: [] as string[],
    unread: false,
    query: '',
  },
  sort: 'alphabetical' as LibrarySortOption,
  sortDesc: false,
  view: 'grid' as 'grid' | 'list',
  selected: new Set<string>(),
});

export const filteredItems = $derived.by(() => {
  let result = libraryState.items;

  result = result.filter(m => !shouldHideNsfw(m, settingsState));

  if (libraryState.filter.unread) {
    result = result.filter(m => m.unreadCount > 0);
  }
  if (libraryState.filter.status !== 'all') {
    result = result.filter(m => m.status === libraryState.filter.status);
  }
  if (libraryState.filter.tags.length > 0) {
    result = result.filter(m =>
      libraryState.filter.tags.every(tag => m.tags?.includes(tag))
    );
  }
  if (libraryState.filter.query) {
    const q = libraryState.filter.query.toLowerCase();
    result = result.filter(m => m.title.toLowerCase().includes(q));
  }

  const sorted = [...result].sort((a, b) => {
    switch (libraryState.sort) {
      case 'unread': return (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
      case 'lastRead': return (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0);
      case 'dateAdded': return (b.addedAt ?? 0) - (a.addedAt ?? 0);
      case 'alphabetical':
      default: return a.title.localeCompare(b.title);
    }
  });

  return libraryState.sortDesc ? sorted.reverse() : sorted;
});
