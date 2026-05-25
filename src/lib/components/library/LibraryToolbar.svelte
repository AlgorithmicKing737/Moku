<script lang="ts">
  import {
    MagnifyingGlass, Books, DownloadSimple,
    SortAscending, CaretUp, CaretDown, ArrowsClockwise,
  } from 'phosphor-svelte'
  import LibraryFilters from './LibraryFilters.svelte'
  import type { LibrarySortOption, LibraryTab } from '$lib/state/library.svelte'
  import type { MangaStatus } from '$lib/server-adapters/types'

  interface Props {
    tab:        LibraryTab
    savedCount: number
    dlCount:    number
    sort:       LibrarySortOption
    sortDesc:   boolean
    status:     MangaStatus | 'all'
    unread:     boolean
    downloaded: boolean
    bookmarked: boolean
    hasActiveFilters: boolean
    refreshing: boolean
    query:      string
    onTab:        (t: LibraryTab) => void
    onQuery:      (q: string) => void
    onSort:       (s: LibrarySortOption) => void
    onSortDesc:   () => void
    onStatus:     (s: MangaStatus | 'all') => void
    onUnread:     () => void
    onDownloaded: () => void
    onBookmarked: () => void
    onFilterClear: () => void
    onRefresh:    () => void
  }

  let {
    tab, savedCount, dlCount, sort, sortDesc,
    status, unread, downloaded, bookmarked, hasActiveFilters, refreshing, query,
    onTab, onQuery, onSort, onSortDesc,
    onStatus, onUnread, onDownloaded, onBookmarked, onFilterClear, onRefresh,
  }: Props = $props()

  let sortOpen   = $state(false)
  let filterOpen = $state(false)

  const SORT_LABELS: Record<LibrarySortOption, string> = {
    alphabetical: 'A–Z',
    unread:       'Unread chapters',
    lastRead:     'Recently read',
    dateAdded:    'Date added',
  }

  function onDocDown(e: MouseEvent) {
    const t = e.target as HTMLElement
    if (sortOpen   && !t.closest('.sort-wrap'))   sortOpen   = false
    if (filterOpen && !t.closest('.filter-wrap')) filterOpen = false
  }

  $effect(() => {
    document.addEventListener('mousedown', onDocDown, true)
    return () => document.removeEventListener('mousedown', onDocDown, true)
  })
</script>

<div class="toolbar">
  <span class="heading">Library</span>

  <div class="tabs">
    <button class="tab" class:active={tab === 'saved'} onclick={() => onTab('saved')}>
      <Books size={11} weight="bold" />
      Saved
      <span class="count">{savedCount}</span>
    </button>
    <button class="tab" class:active={tab === 'downloaded'} onclick={() => onTab('downloaded')}>
      <DownloadSimple size={11} weight="bold" />
      Downloaded
      <span class="count">{dlCount}</span>
    </button>
  </div>

  <div class="right">
    <div class="search-wrap">
      <MagnifyingGlass size={13} class="search-icon" weight="light" />
      <input
        class="search"
        placeholder="Search"
        value={query}
        oninput={(e) => onQuery((e.target as HTMLInputElement).value)}
      />
    </div>

    <button
      class="icon-btn"
      class:spinning={refreshing}
      title={refreshing ? 'Checking for updates…' : 'Check for updates'}
      onclick={onRefresh}
      disabled={refreshing}
    >
      <ArrowsClockwise size={15} weight="bold" />
    </button>

    <div class="sort-wrap">
      <button
        class="icon-btn"
        class:active={sort !== 'alphabetical' || sortDesc}
        title="Sort"
        onclick={() => { sortOpen = !sortOpen; filterOpen = false }}
      >
        <SortAscending size={15} weight="bold" />
      </button>

      {#if sortOpen}
        <div class="panel sort-panel" role="menu">
          <div class="panel-head">
            <span class="panel-title">Sort</span>
          </div>
          <div class="divider"></div>
          <p class="section-label">Order by</p>
          {#each Object.entries(SORT_LABELS) as [s, label]}
            <button
              class="item"
              class:item-active={sort === s}
              role="menuitem"
              onclick={() => { onSort(s as LibrarySortOption); sortOpen = false }}
            >
              {label}
              {#if sort === s}
                {#if sortDesc}<CaretDown size={11} weight="bold" />
                {:else}<CaretUp size={11} weight="bold" />
                {/if}
              {/if}
            </button>
          {/each}
          <button class="item dir-toggle" role="menuitem" onclick={onSortDesc}>
            {sortDesc ? 'Descending' : 'Ascending'}
            {#if sortDesc}<CaretDown size={11} weight="bold" />
            {:else}<CaretUp size={11} weight="bold" />
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <div class="filter-wrap">
      <LibraryFilters
        {status} {unread} {downloaded} {bookmarked}
        hasActive={hasActiveFilters}
        open={filterOpen}
        onToggle={() => { filterOpen = !filterOpen; sortOpen = false }}
        {onStatus} {onUnread} {onDownloaded} {onBookmarked}
        onClear={onFilterClear}
      />
    </div>
  </div>
</div>

<style>
  .toolbar {
    position: relative; z-index: 100;
    display: flex; align-items: center; gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-6);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0; min-width: 0;
  }

  .heading {
    font-family: var(--font-ui); font-size: var(--text-xs);
    color: var(--text-faint); letter-spacing: var(--tracking-wider);
    text-transform: uppercase; flex-shrink: 0;
  }

  .tabs {
    display: flex; align-items: center; gap: 2px;
    background: var(--bg-raised); border: 1px solid var(--border-dim);
    border-radius: var(--radius-md); padding: 2px;
  }

  .tab {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--font-ui); font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    padding: 4px 10px; border-radius: var(--radius-sm);
    border: 1px solid transparent; color: var(--text-faint);
    white-space: nowrap;
    transition: background var(--t-base), color var(--t-base), border-color var(--t-base);
    cursor: pointer;
  }
  .tab:hover { color: var(--text-muted); }
  .tab.active { background: var(--accent-muted); color: var(--accent-fg); border-color: var(--accent-dim); }

  .count { font-size: var(--text-2xs); opacity: 0.6; }

  .right {
    display: flex; align-items: center; gap: var(--sp-2);
    margin-left: auto; flex-shrink: 0;
  }

  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-wrap :global(.search-icon) { position: absolute; left: 10px; color: var(--text-faint); pointer-events: none; }
  .search {
    background: var(--bg-raised); border: 1px solid var(--border-dim);
    border-radius: var(--radius-md); padding: 5px 10px 5px 28px;
    color: var(--text-primary); font-size: var(--text-sm); width: 180px;
    outline: none; transition: border-color var(--t-base);
  }
  .search::placeholder { color: var(--text-faint); }
  .search:focus { border-color: var(--border-strong); }

  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px;
    border-radius: var(--radius-md); border: 1px solid var(--border-dim);
    background: var(--bg-raised); color: var(--text-faint);
    cursor: pointer; flex-shrink: 0;
    transition: color var(--t-base), border-color var(--t-base), background var(--t-base);
  }
  .icon-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); }
  .icon-btn.active { color: var(--accent-fg); border-color: var(--accent-dim); background: var(--accent-muted); }
  .icon-btn:disabled { opacity: 0.5; cursor: default; }
  .icon-btn.spinning :global(svg) { animation: spin 1s linear infinite; }

  @keyframes spin { to { transform: rotate(360deg); } }

  .sort-wrap, .filter-wrap { position: relative; }

  .panel {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 9999;
    min-width: 220px; background: var(--bg-raised);
    border: 1px solid var(--border-base); border-radius: var(--radius-lg);
    padding: var(--sp-1); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: fadeIn 0.1s ease both;
  }
  .panel-head { display: flex; align-items: center; padding: 6px 10px 4px; }
  .panel-title {
    font-family: var(--font-ui); font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide); color: var(--text-secondary);
    font-weight: var(--weight-medium, 500);
  }
  .divider { height: 1px; background: var(--border-dim); margin: 4px 2px; }
  .section-label {
    font-family: var(--font-ui); font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider); text-transform: uppercase;
    color: var(--text-faint); padding: 4px 8px 8px;
  }
  .item {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 7px 10px; border-radius: var(--radius-sm);
    border: none; background: transparent; color: var(--text-muted);
    font-family: var(--font-ui); font-size: var(--text-xs);
    cursor: pointer; text-align: left; gap: var(--sp-2);
    transition: background var(--t-base), color var(--t-base);
  }
  .item:hover { background: var(--bg-overlay); color: var(--text-primary); }
  .item-active { color: var(--accent-fg); background: var(--accent-muted); font-weight: var(--weight-medium, 500); }
  .item-active:hover { background: var(--accent-dim); }
  .dir-toggle {
    justify-content: flex-start; color: var(--text-secondary);
    border-top: 1px solid var(--border-dim);
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    margin-top: 2px; padding-top: 9px;
  }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>