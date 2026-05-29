<script lang="ts">
  import {
    MagnifyingGlass, Books, DownloadSimple, FolderSimple,
    SortAscending, CaretUp, CaretDown, ArrowsClockwise, X,
  } from 'phosphor-svelte'
  import LibraryFilters from './LibraryFilters.svelte'
  import type { LibrarySortOption, LibraryContentFilter, LibraryStatusFilter } from '$lib/state/library.svelte'
  import type { Category } from '$lib/types'

  interface Props {
    tab:               string
    tabSortMode:       LibrarySortOption
    tabSortDir:        'asc' | 'desc'
    tabStatus:         LibraryStatusFilter
    tabFilters:        Partial<Record<LibraryContentFilter, boolean>>
    hasActiveFilters:  boolean
    visibleCategories: Category[]
    visibleTabIds:     string[]
    counts:            Record<string, number>
    query:             string
    refreshing:        boolean
    refreshProgress:   { finished: number; total: number }
    refreshDone:       boolean
    refreshingCatId:   number | null
    activeDragKind:    'tab' | null
    dragInsertIdx:     number
    dragTabId:         string | null
    dragOverTabId:     string | null
    onTabChange:        (t: string) => void
    onQuery:            (q: string) => void
    onSortChange:       (mode: LibrarySortOption) => void
    onSortDirToggle:    () => void
    onStatusChange:     (s: LibraryStatusFilter) => void
    onFilterToggle:     (f: LibraryContentFilter) => void
    onFiltersClear:     () => void
    onRefresh:          () => void
    onCancelRefresh:    () => void
    onRefreshCategory:  (catId: number) => void
    onOpenDownloadsFolder: () => void
    onTabDragStart:     (e: DragEvent, id: string) => void
    onTabDragOver:      (e: DragEvent, id: string, idx: number) => void
    onTabDragLeave:     () => void
    onTabDrop:          (e: DragEvent, id: string) => void
    onTabDragEnd:       () => void
  }

  let {
    tab, tabSortMode, tabSortDir, tabStatus, tabFilters,
    hasActiveFilters, visibleCategories, visibleTabIds, counts, query,
    refreshing, refreshProgress, refreshDone, refreshingCatId,
    activeDragKind, dragInsertIdx, dragTabId, dragOverTabId,
    onTabChange, onQuery, onSortChange, onSortDirToggle,
    onStatusChange, onFilterToggle, onFiltersClear,
    onRefresh, onCancelRefresh, onOpenDownloadsFolder,
    onTabDragStart, onTabDragOver, onTabDragLeave, onTabDrop, onTabDragEnd,
  }: Props = $props()

  let sortOpen   = $state(false)
  let filterOpen = $state(false)

  const SORT_LABELS: Record<LibrarySortOption, string> = {
    alphabetical:   'A–Z',
    unread:         'Unread chapters',
    lastRead:       'Recently read',
    dateAdded:      'Date added',
    totalChapters:  'Total chapters',
    latestFetched:  'Latest fetched',
    latestUploaded: 'Latest uploaded',
  }

  function catById(id: string): Category | undefined {
    return visibleCategories.find(c => String(c.id) === id)
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

  <div class="tabs" role="tablist">
    {#each visibleTabIds as id, idx}
      {@const isActive   = tab === id}
      {@const isDragOver = dragOverTabId === id}
      {@const showInsertBefore = activeDragKind === 'tab' && dragInsertIdx === idx}
      {@const showInsertAfter  = activeDragKind === 'tab' && dragInsertIdx === idx + 1 && idx === visibleTabIds.length - 1}

      {#if showInsertBefore}
        <div class="drop-indicator" aria-hidden="true"></div>
      {/if}

      <button
        class="tab"
        class:active={isActive}
        class:drag-over={isDragOver}
        role="tab"
        aria-selected={isActive}
        draggable="true"
        ondragstart={(e) => onTabDragStart(e, id)}
        ondragover={(e) => onTabDragOver(e, id, idx)}
        ondragleave={onTabDragLeave}
        ondrop={(e) => onTabDrop(e, id)}
        ondragend={onTabDragEnd}
        onclick={() => onTabChange(id)}
      >
        {#if id === 'library'}
          <Books size={11} weight="bold" />
          Library
        {:else if id === 'downloaded'}
          <DownloadSimple size={11} weight="bold" />
          Downloaded
        {:else}
          {@const cat = catById(id)}
          <FolderSimple size={11} weight="bold" />
          {cat?.name ?? id}
        {/if}
        <span class="count">{counts[id] ?? 0}</span>
      </button>

      {#if showInsertAfter}
        <div class="drop-indicator" aria-hidden="true"></div>
      {/if}
    {/each}
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

    {#if tab === 'downloaded'}
      <button class="icon-btn" title="Open downloads folder" onclick={onOpenDownloadsFolder}>
        <FolderSimple size={15} weight="bold" />
      </button>
    {/if}

    <button
      class="icon-btn"
      class:spinning={refreshing}
      class:done={refreshDone}
      title={refreshing ? 'Cancel update' : 'Check for updates'}
      onclick={refreshing ? onCancelRefresh : onRefresh}
    >
      {#if refreshing}
        <X size={15} weight="bold" />
      {:else}
        <ArrowsClockwise size={15} weight="bold" />
      {/if}
    </button>

    {#if refreshing && refreshProgress.total > 0}
      <span class="refresh-label">
        {refreshProgress.finished}/{refreshProgress.total}
      </span>
    {/if}

    <div class="sort-wrap">
      <button
        class="icon-btn"
        class:active={tabSortMode !== 'alphabetical' || tabSortDir !== 'asc'}
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
              class:item-active={tabSortMode === s}
              role="menuitem"
              onclick={() => { onSortChange(s as LibrarySortOption); sortOpen = false }}
            >
              {label}
              {#if tabSortMode === s}
                {#if tabSortDir === 'desc'}<CaretDown size={11} weight="bold" />
                {:else}<CaretUp size={11} weight="bold" />
                {/if}
              {/if}
            </button>
          {/each}
          <button class="item dir-toggle" role="menuitem" onclick={onSortDirToggle}>
            {tabSortDir === 'desc' ? 'Descending' : 'Ascending'}
            {#if tabSortDir === 'desc'}<CaretDown size={11} weight="bold" />
            {:else}<CaretUp size={11} weight="bold" />
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <div class="filter-wrap">
      <LibraryFilters
        status={tabStatus}
        filters={tabFilters}
        hasActive={hasActiveFilters}
        open={filterOpen}
        onToggle={() => { filterOpen = !filterOpen; sortOpen = false }}
        {onStatusChange}
        {onFilterToggle}
        onClear={onFiltersClear}
      />
    </div>
  </div>
</div>

<style>
  .toolbar {
    position: relative; z-index: 100;
    display: flex; align-items: center; gap: var(--sp-3);
    padding: var(--sp-4) var(--sp-6);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0; min-width: 0; overflow-x: auto;
    scrollbar-width: none;
  }
  .toolbar::-webkit-scrollbar { display: none; }

  .heading {
    font-family: var(--font-ui); font-size: var(--text-xs);
    color: var(--text-faint); letter-spacing: var(--tracking-wider);
    text-transform: uppercase; flex-shrink: 0;
  }

  .tabs {
    display: flex; align-items: center; gap: 2px;
    background: var(--bg-raised); border: 1px solid var(--border-dim);
    border-radius: var(--radius-md); padding: 2px;
    flex-shrink: 0;
  }

  .tab {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--font-ui); font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    padding: 4px 10px; border-radius: var(--radius-sm);
    border: 1px solid transparent; color: var(--text-faint);
    white-space: nowrap; cursor: pointer;
    transition: background var(--t-base), color var(--t-base), border-color var(--t-base);
    user-select: none;
  }
  .tab:hover        { color: var(--text-muted); }
  .tab.active       { background: var(--accent-muted); color: var(--accent-fg); border-color: var(--accent-dim); }
  .tab.drag-over    { border-color: var(--accent); }

  .count { font-size: var(--text-2xs); opacity: 0.6; }

  .drop-indicator {
    width: 2px; height: 20px; background: var(--accent);
    border-radius: 1px; flex-shrink: 0;
    animation: fadeIn 0.1s ease both;
  }

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

  .refresh-label {
    font-family: var(--font-ui); font-size: var(--text-2xs);
    color: var(--text-faint); letter-spacing: var(--tracking-wide);
    white-space: nowrap;
  }

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
  .icon-btn.done { color: var(--color-success, #4caf50); border-color: color-mix(in srgb, var(--color-success, #4caf50) 40%, transparent); }
  .icon-btn.spinning :global(svg) { animation: spin 1s linear infinite; }

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
  .item:hover       { background: var(--bg-overlay); color: var(--text-primary); }
  .item-active      { color: var(--accent-fg); background: var(--accent-muted); font-weight: var(--weight-medium, 500); }
  .item-active:hover { background: var(--accent-dim); }
  .dir-toggle {
    justify-content: flex-start; color: var(--text-secondary);
    border-top: 1px solid var(--border-dim);
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    margin-top: 2px; padding-top: 9px;
  }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
</style>