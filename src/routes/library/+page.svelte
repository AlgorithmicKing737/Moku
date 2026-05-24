<script lang="ts">
  import { goto }          from '$app/navigation'
  import { libraryState }  from '$lib/state/library.svelte'
  import { loadLibrary, refreshLibrary, removeFromLibrary, bulkRemoveFromLibrary } from '$lib/request-manager/manga'
  import LibraryToolbar    from '$lib/ui/library/LibraryToolbar.svelte'
  import LibraryGrid       from '$lib/ui/library/LibraryGrid.svelte'
  import type { Manga }    from '$lib/types'

  const saved      = $derived(libraryState.items.filter(m => m.inLibrary).length)
  const downloaded = $derived(libraryState.items.filter(m => (m.downloadCount ?? 0) > 0).length)

  $effect(() => {
    loadLibrary()
  })

  $effect(() => {
    if (libraryState.tab) libraryState.exitSelect()
  })

  function onCardClick(e: MouseEvent, m: Manga) {
    if (libraryState.selectMode) {
      libraryState.toggleSelect(m.id)
      return
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault()
      libraryState.enterSelect(m.id)
      return
    }
    goto(`/reader/${m.id}/${m.firstUnreadChapter?.id ?? m.lastReadChapter?.id ?? ''}`)
  }

  function onBulkRemove() {
    bulkRemoveFromLibrary(libraryState.selected)
  }
</script>

<div class="root">
  {#if libraryState.error}
    <div class="center">
      <p class="error">Could not load library</p>
      <p class="error-detail">{libraryState.error}</p>
      <button class="retry-btn" onclick={() => loadLibrary()}>Retry</button>
    </div>
  {:else}
    <LibraryToolbar
      tab={libraryState.tab}
      savedCount={saved}
      dlCount={downloaded}
      sort={libraryState.sort}
      sortDesc={libraryState.sortDesc}
      status={libraryState.filter.status}
      unread={libraryState.filter.unread}
      downloaded={libraryState.filter.downloaded}
      bookmarked={libraryState.filter.bookmarked}
      hasActiveFilters={libraryState.hasActiveFilters}
      refreshing={libraryState.refreshing}
      query={libraryState.filter.query}
      onTab={(t) => libraryState.tab = t}
      onQuery={(q) => libraryState.filter.query = q}
      onSort={(s) => libraryState.sort = s}
      onSortDesc={() => libraryState.sortDesc = !libraryState.sortDesc}
      onStatus={(s) => libraryState.filter.status = s}
      onUnread={() => libraryState.filter.unread = !libraryState.filter.unread}
      onDownloaded={() => libraryState.filter.downloaded = !libraryState.filter.downloaded}
      onBookmarked={() => libraryState.filter.bookmarked = !libraryState.filter.bookmarked}
      onFilterClear={() => {
        libraryState.filter.status = 'all'
        libraryState.filter.unread = false
        libraryState.filter.downloaded = false
        libraryState.filter.bookmarked = false
      }}
      onRefresh={refreshLibrary}
    />

    <LibraryGrid
      items={libraryState.filteredItems}
      loading={libraryState.loading}
      selectMode={libraryState.selectMode}
      selected={libraryState.selected}
      tab={libraryState.tab}
      {onCardClick}
      onSelectAll={() => libraryState.selectAll()}
      onExitSelect={() => libraryState.exitSelect()}
      {onBulkRemove}
    />
  {/if}
</div>

<style>
  .root {
    display: flex; flex-direction: column;
    height: 100%; overflow: hidden;
    animation: fadeIn 0.14s ease both;
  }

  .center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 60%; gap: var(--sp-2);
    color: var(--text-muted); text-align: center;
  }
  .error { color: var(--color-error); font-size: var(--text-base); }
  .error-detail { color: var(--text-faint); font-size: var(--text-sm); }
  .retry-btn {
    margin-top: var(--sp-3); padding: 6px 16px;
    border-radius: var(--radius-md); border: 1px solid var(--border-dim);
    background: var(--bg-raised); color: var(--text-muted);
    cursor: pointer; font-family: var(--font-ui);
    font-size: var(--text-xs); letter-spacing: var(--tracking-wide);
  }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>