<script lang="ts">
  import { onMount } from 'svelte'
  import { BookOpen, BookmarkSimple, TrashSimple, MagnifyingGlass } from 'phosphor-svelte'
  import {
    clearHistory,
    historyState,
    historyStatus,
    initHistoryState,
    removeBookmark,
  } from '$lib/state/history.svelte'

  let tab = $state<'history' | 'bookmarks'>('history')
  let query = $state('')

  const filteredHistory = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return historyState.history

    return historyState.history.filter(entry =>
      entry.mangaTitle.toLowerCase().includes(q) || entry.chapterName.toLowerCase().includes(q)
    )
  })

  const filteredBookmarks = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return historyState.bookmarks

    return historyState.bookmarks.filter(entry =>
      entry.mangaTitle.toLowerCase().includes(q) || entry.chapterName.toLowerCase().includes(q)
    )
  })

  onMount(async () => {
    await initHistoryState()
  })

  function formatTimestamp(value: number): string {
    if (!value) return 'Unknown'
    return new Date(value).toLocaleString()
  }
</script>

<section class="history-page">
  <header class="toolbar">
    <div class="title-wrap">
      <h1>History</h1>
      <p>
        {historyState.history.length} reads ·
        {historyState.bookmarks.length} bookmarks ·
        {historyState.readingStats.totalChaptersRead} chapters completed
      </p>
    </div>

    <div class="controls">
      <label class="search">
        <span><MagnifyingGlass size={14} weight="light" /> Search</span>
        <input type="search" placeholder="Filter history" bind:value={query} />
      </label>

      <div class="tabs">
        <button type="button" class:active={tab === 'history'} onclick={() => (tab = 'history')}>
          <BookOpen size={14} weight="bold" /> Reads
        </button>
        <button type="button" class:active={tab === 'bookmarks'} onclick={() => (tab = 'bookmarks')}>
          <BookmarkSimple size={14} weight="bold" /> Bookmarks
        </button>
      </div>

      <button
        type="button"
        class="danger"
        onclick={() => clearHistory()}
        disabled={historyState.history.length === 0}
      >
        <TrashSimple size={14} weight="bold" /> Clear reads
      </button>
    </div>
  </header>

  {#if historyStatus.loading}
    <div class="empty-state">Loading history...</div>
  {:else if historyStatus.error}
    <div class="empty-state error-state">
      <p>Unable to load local history data.</p>
      <small>{historyStatus.error}</small>
    </div>
  {:else if tab === 'history' && filteredHistory.length === 0}
    <div class="empty-state">No reading history matches your filter.</div>
  {:else if tab === 'bookmarks' && filteredBookmarks.length === 0}
    <div class="empty-state">No bookmarks match your filter.</div>
  {:else if tab === 'history'}
    <ul class="entry-list">
      {#each filteredHistory as entry (`h-${entry.chapterId}-${entry.readAt}`)}
        <li class="entry-row">
          <div class="row-main">
            <p class="title">{entry.mangaTitle}</p>
            <p class="meta">{entry.chapterName}</p>
          </div>
          <span class="time">{formatTimestamp(entry.readAt)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <ul class="entry-list">
      {#each filteredBookmarks as entry (`b-${entry.chapterId}-${entry.savedAt}`)}
        <li class="entry-row">
          <div class="row-main">
            <p class="title">{entry.mangaTitle}</p>
            <p class="meta">{entry.chapterName} · page {entry.pageNumber}</p>
          </div>

          <div class="row-actions">
            <span class="time">{formatTimestamp(entry.savedAt)}</span>
            <button type="button" onclick={() => removeBookmark(entry.chapterId)}>Remove</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .history-page {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    height: 100%;
    padding: var(--sp-6);
    overflow: auto;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--sp-3);
  }

  .title-wrap h1 {
    margin: 0;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: var(--text-2xl);
  }

  .title-wrap p {
    margin: var(--sp-1) 0 0;
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: var(--sp-2);
  }

  .search {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .search span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }

  .search input,
  .danger,
  .tabs button,
  .row-actions button {
    height: 34px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
    color: var(--text-muted);
    padding: 0 10px;
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }

  .search input {
    min-width: 180px;
    color: var(--text-primary);
  }

  .tabs {
    display: inline-flex;
    gap: var(--sp-1);
  }

  .tabs button,
  .danger,
  .row-actions button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .tabs button.active {
    background: var(--accent-muted);
    border-color: var(--accent-dim);
    color: var(--accent-fg);
  }

  .danger {
    color: var(--color-error);
    border-color: color-mix(in srgb, var(--color-error) 32%, var(--border-dim));
  }

  .entry-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .entry-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
  }

  .row-main {
    min-width: 0;
  }

  .title,
  .meta {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title {
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .meta,
  .time {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }

  .row-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 220px;
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-xl);
    background: var(--bg-raised);
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .error-state {
    gap: 8px;
    padding: var(--sp-4);
    text-align: center;
  }

  .error-state p,
  .error-state small {
    margin: 0;
  }
</style>
