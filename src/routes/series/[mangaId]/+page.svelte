<script lang="ts">
  import { goto } from '$app/navigation'
  import { BookOpen, DownloadSimple, Circle, CheckCircle } from 'phosphor-svelte'
  import type { Chapter } from '$lib/types/chapter'
  import { markRead } from '$lib/request-manager/chapters'
  import { filteredChapters, seriesState } from '$lib/state/series.svelte'
  import { readerState } from '$lib/state/reader.svelte'
  import Thumbnail from '$lib/ui/manga/Thumbnail.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  const totalCount = $derived(seriesState.chapters.length)
  const readCount = $derived(seriesState.chapters.filter(ch => ch.read).length)
  const downloadedCount = $derived(seriesState.chapters.filter(ch => ch.downloaded).length)
  const progressPct = $derived(totalCount > 0 ? (readCount / totalCount) * 100 : 0)

  const continueChapter = $derived.by(() => {
    if (seriesState.chapters.length === 0) return null

    const ordered = [...seriesState.chapters].sort((a, b) => a.sourceOrder - b.sourceOrder)
    const inProgress = ordered.find(ch => !ch.read && (ch.lastPageRead ?? 0) > 0)
    if (inProgress) return inProgress
    return ordered.find(ch => !ch.read) ?? ordered[0]
  })

  const statusText = $derived(
    seriesState.current?.status
      ? seriesState.current.status
          .toLowerCase()
          .replaceAll('_', ' ')
          .replace(/(^|\s)\w/g, (c: string) => c.toUpperCase())
      : 'Unknown'
  )

  $effect(() => {
    seriesState.current = data.manga
    seriesState.chapters = data.chapters
    seriesState.error = null
    seriesState.chaptersError = null

    readerState.manga = data.manga
    readerState.chapters = data.chapters
  })

  function formatChapterNumber(chapter: Chapter): string {
    const num = chapter.chapterNumber
    return Number.isInteger(num) ? String(num) : String(num)
  }

  function openChapter(chapter: Chapter) {
    if (!seriesState.current) return

    readerState.manga = seriesState.current
    readerState.chapter = chapter
    readerState.chapters = seriesState.chapters
    readerState.pages = []
    readerState.currentPage = 0

    void goto(`/reader/${seriesState.current.id}/${chapter.id}`)
  }

  async function toggleChapterRead(chapter: Chapter) {
    await markRead(String(chapter.id), !chapter.read)
  }
</script>

<section class="series-page">
  {#if seriesState.current}
    <aside class="series-meta">
      <Thumbnail
        class="series-cover"
        src={seriesState.current.thumbnailUrl}
        alt={seriesState.current.title}
        loading="eager"
      />

      <div class="meta-body">
        <h1>{seriesState.current.title}</h1>
        <p class="meta-line">{statusText} · {seriesState.current.source?.displayName ?? 'Unknown source'}</p>
        {#if seriesState.current.author || seriesState.current.artist}
          <p class="meta-line">
            {[seriesState.current.author, seriesState.current.artist]
              .filter(Boolean)
              .filter((value, idx, list) => list.indexOf(value) === idx)
              .join(' · ')}
          </p>
        {/if}
      </div>

      <div class="series-progress">
        <div class="progress-row">
          <span>{readCount} / {totalCount} read</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style={`width: ${progressPct}%`}></div>
        </div>
        <div class="counts">
          <span><BookOpen size={13} weight="light" /> {totalCount}</span>
          <span><DownloadSimple size={13} weight="light" /> {downloadedCount}</span>
        </div>
      </div>

      {#if continueChapter}
        <button class="continue" type="button" onclick={() => openChapter(continueChapter)}>
          Continue · Ch. {formatChapterNumber(continueChapter)}
        </button>
      {/if}
    </aside>

    <div class="series-content">
      <header class="toolbar">
        <div class="toolbar-title">
          <h2>Chapters</h2>
          <p>{filteredChapters.length} visible</p>
        </div>

        <div class="toolbar-controls">
          <label class="search">
            <span>Search</span>
            <input
              type="search"
              placeholder="Filter chapter name"
              bind:value={seriesState.chapterFilter.query}
            />
          </label>

          <label class="toggle">
            <input type="checkbox" bind:checked={seriesState.chapterFilter.unread} />
            <span>Unread only</span>
          </label>

          <label class="toggle">
            <input type="checkbox" bind:checked={seriesState.chapterFilter.downloaded} />
            <span>Downloaded only</span>
          </label>

          <button
            class="sort-btn"
            type="button"
            onclick={() => (seriesState.chapterSortDesc = !seriesState.chapterSortDesc)}
          >
            Sort: {seriesState.chapterSortDesc ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </header>

      {#if seriesState.chaptersLoading}
        <div class="empty">Loading chapters...</div>
      {:else if filteredChapters.length === 0}
        <div class="empty">No chapters match the current filters.</div>
      {:else}
        <ul class="chapter-list">
          {#each filteredChapters as chapter (chapter.id)}
            <li class="chapter-row" class:read={chapter.read}>
              <button class="chapter-open" type="button" onclick={() => openChapter(chapter)}>
                <span class="chapter-name">{chapter.name}</span>
                <span class="chapter-meta">Ch. {formatChapterNumber(chapter)}</span>
              </button>

              <div class="chapter-actions">
                {#if chapter.downloaded}
                  <span class="downloaded-pill">Downloaded</span>
                {/if}
                <button
                  class="mark-read"
                  type="button"
                  onclick={() => toggleChapterRead(chapter)}
                  aria-label={chapter.read ? 'Mark chapter unread' : 'Mark chapter read'}
                >
                  {#if chapter.read}
                    <CheckCircle size={16} weight="fill" />
                  {:else}
                    <Circle size={16} weight="light" />
                  {/if}
                </button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <div class="empty">Could not load this series.</div>
  {/if}
</section>

<style>
  .series-page {
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
    gap: var(--sp-4);
    height: 100%;
    padding: var(--sp-6);
    overflow: hidden;
  }

  .series-meta,
  .series-content {
    min-height: 0;
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-xl);
    background: var(--bg-raised);
  }

  .series-meta {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
    overflow: auto;
  }

  :global(.series-cover) {
    width: 100%;
    aspect-ratio: 3 / 4;
    border-radius: var(--radius-lg);
    object-fit: cover;
    border: 1px solid var(--border-dim);
  }

  .meta-body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .meta-body h1 {
    margin: 0;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    line-height: var(--leading-tight);
  }

  .meta-line {
    margin: 0;
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }

  .series-progress {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .progress-row {
    display: flex;
    justify-content: space-between;
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .progress-track {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: var(--bg-overlay);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
  }

  .counts {
    display: flex;
    gap: var(--sp-2);
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
  }

  .counts span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .continue {
    height: 36px;
    border-radius: var(--radius-md);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--accent-fg);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    cursor: pointer;
  }

  .series-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-4);
    border-bottom: 1px solid var(--border-dim);
  }

  .toolbar-title h2 {
    margin: 0;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: var(--text-xl);
  }

  .toolbar-title p {
    margin: var(--sp-1) 0 0;
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .toolbar-controls {
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
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }

  .search input {
    height: 34px;
    min-width: 180px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-base);
    color: var(--text-primary);
    padding: 0 10px;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    background: var(--bg-base);
  }

  .sort-btn {
    height: 34px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-base);
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .chapter-list {
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: auto;
  }

  .chapter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    padding: 10px var(--sp-4);
    border-bottom: 1px solid var(--border-dim);
  }

  .chapter-row.read {
    opacity: 0.56;
  }

  .chapter-open {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    background: transparent;
    border: 0;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }

  .chapter-name {
    max-width: 100%;
    color: var(--text-primary);
    font-size: var(--text-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chapter-meta {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .chapter-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .downloaded-pill {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid var(--accent-dim);
    background: var(--accent-muted);
    color: var(--accent-fg);
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .mark-read {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-dim);
    background: var(--bg-base);
    color: var(--text-faint);
    cursor: pointer;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    padding: var(--sp-4);
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  @media (max-width: 960px) {
    .series-page {
      grid-template-columns: 1fr;
      overflow: auto;
    }

    .series-meta,
    .series-content {
      overflow: visible;
    }

    .chapter-list {
      overflow: visible;
    }
  }
</style>
