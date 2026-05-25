import type { Extension, Source, Manga } from '$lib/types'

export const extensionsState = $state({
  items: [] as Extension[],
  sources: [] as Source[],
  loading: false,
  error: null as string | null,

  filter: {
    query: '',
    installed: false,
    language: 'all',
  },

  browseResults: [] as Manga[],
  browseLoading: false,
  browseError: null as string | null,
  browseHasMore: false,
})

export function filteredExtensions() {
  let result = extensionsState.items

  if (extensionsState.filter.installed) {
    result = result.filter(e => e.installed)
  }
  if (extensionsState.filter.language !== 'all') {
    result = result.filter(e => e.lang === extensionsState.filter.language)
  }
  if (extensionsState.filter.query) {
    const q = extensionsState.filter.query.toLowerCase()
    result = result.filter(e => e.name.toLowerCase().includes(q))
  }

  return result
}