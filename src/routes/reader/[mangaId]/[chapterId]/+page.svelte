<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { ArrowArcLeft, CaretLeft, CaretRight, Columns, List, MagnifyingGlass, SpinnerGap, TextAlignRight } from 'phosphor-svelte'
  import { currentPageData, progress, readerState } from '$lib/state/reader.svelte'
  import { ensureReaderSession } from '$lib/core/reader/chapterLoader'
  import { getAdjacentChapters, goToNextReaderPage, goToPreviousReaderPage, setCurrentReaderPage } from '$lib/core/reader/navigation'
  import { createReaderKeyHandler } from '$lib/core/reader/readerKeybinds'
  import { adjustZoom, ZOOM_STEP } from '$lib/core/reader/zoomHelpers'
  import { preloadPages } from '$lib/core/reader/pageLoader'
  import { settingsState } from '$lib/state/settings.svelte'
  import { addBookmark, getBookmark, removeBookmark } from '$lib/state/history.svelte'
  import Button from '$lib/ui/primitives/Button.svelte'

  let initializing = $state(true)
  let routeError = $state<string | null>(null)
  let requestVersion = 0

  const mangaId = $derived($page.params.mangaId ?? '')
  const chapterId = $derived($page.params.chapterId ?? '')
  const chapterNeighbors = $derived.by(() => getAdjacentChapters())
  const currentPageNumber = $derived(readerState.currentPage + 1)
  const totalPages = $derived(readerState.pages.length)
  const progressPercent = $derived(Math.round(progress * 100))
  const pageLabel = $derived(totalPages > 0 ? `${currentPageNumber} / ${totalPages}` : '0 / 0')
  const chapterLabel = $derived(readerState.chapter ? `Ch. ${readerState.chapter.chapterNumber}` : 'Chapter')
  const zoomPct = $derived(Math.round(readerState.zoom * 100))

  $effect(() => {
    const activeMangaId = mangaId
    const activeChapterId = chapterId

    if (!activeMangaId || !activeChapterId) return

    const version = ++requestVersion
    initializing = true
    routeError = null

    void ensureReaderSession(activeMangaId, activeChapterId)
      .catch((error) => {
        if (version !== requestVersion) return
        routeError = error instanceof Error ? error.message : String(error)
      })
      .finally(() => {
        if (version !== requestVersion) return
        initializing = false
      })
  })

  $effect(() => {
    preloadPages(readerState.pages, readerState.currentPage, settingsState.preloadPages ?? 3)
  })

  async function stepForward() {
    const advanced = await goToNextReaderPage()
    if (advanced) return

    if (chapterNeighbors.next && readerState.manga) {
      await goto(`/reader/${readerState.manga.id}/${chapterNeighbors.next.id}`)
    }
  }

  async function stepBackward() {
    const moved = await goToPreviousReaderPage()
    if (moved) return

    if (chapterNeighbors.previous && readerState.manga) {
      await goto(`/reader/${readerState.manga.id}/${chapterNeighbors.previous.id}`)
    }
  }

  async function handleRangeInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    await setCurrentReaderPage(Number(target.value) - 1)
  }

  function retryLoad() {
    requestVersion += 1
    initializing = true
    routeError = null
    void ensureReaderSession(mangaId, chapterId)
      .catch((error) => {
        routeError = error instanceof Error ? error.message : String(error)
      })
      .finally(() => {
        initializing = false
      })
  }

  async function returnToSeries() {
    if (!readerState.manga) return
    await goto(`/series/${readerState.manga.id}`)
  }

  function cycleMode() {
    readerState.mode = readerState.mode === 'single' ? 'strip' : 'single'
  }

  function toggleBookmarkAction() {
    if (!readerState.chapter || !readerState.manga) return
    const currentChapterId = readerState.chapter.id

    if (getBookmark(currentChapterId)) {
      removeBookmark(currentChapterId)
      return
    }

    addBookmark({
      mangaId: readerState.manga.id,
      chapterId: currentChapterId,
      pageNumber: readerState.currentPage,
      mangaTitle: readerState.manga.title,
      chapterName: readerState.chapter.name,
      thumbnailUrl: readerState.manga.thumbnailUrl,
    })
  }

  const handleKeydown = createReaderKeyHandler({
    goNext: () => void (readerState.direction === 'rtl' ? stepBackward() : stepForward()),
    goPrev: () => void (readerState.direction === 'rtl' ? stepForward() : stepBackward()),
    goToPage: (idx) => void setCurrentReaderPage(idx),
    lastPage: () => readerState.pages.length - 1,
    exitReader: () => void returnToSeries(),
    chapterNext: () => {
      const neighbors = getAdjacentChapters()
      if (readerState.manga && neighbors.next) {
        void goto(`/reader/${readerState.manga.id}/${neighbors.next.id}`)
      }
    },
    chapterPrev: () => {
      const neighbors = getAdjacentChapters()
      if (readerState.manga && neighbors.previous) {
        void goto(`/reader/${readerState.manga.id}/${neighbors.previous.id}`)
      }
    },
    adjustZoom: (delta) => {
      readerState.zoom = adjustZoom(readerState.zoom, delta)
    },
    resetZoom: () => {
      readerState.zoom = 1
      readerState.inspectScale = 1
      readerState.inspectPanX = 0
      readerState.inspectPanY = 0
    },
    cycleMode,
    toggleDirection: () => {
      readerState.direction = readerState.direction === 'ltr' ? 'rtl' : 'ltr'
    },
    openSettings: () => void goto('/settings/general'),
    toggleBookmark: toggleBookmarkAction,
    toggleAutoScroll: () => {
      readerState.autoScrollActive = !readerState.autoScrollActive
    },
    getKeybinds: () => settingsState.keybinds,
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="reader-page">
  <header class="reader-toolbar">
    <div class="reader-meta">
      <Button variant="ghost" size="sm" onclick={returnToSeries}>
        <ArrowArcLeft size={16} weight="bold" />
        Back
      </Button>

      <div class="reader-titles">
        <p class="eyebrow">{readerState.manga?.title ?? 'Reader'}</p>
        <h1>{readerState.chapter?.name ?? 'Loading chapter'}</h1>
        <p class="subcopy">{chapterLabel} · {pageLabel}</p>
      </div>
    </div>

    <div class="reader-actions">
      <div class="toggle-group">
        <button class:active={readerState.mode === 'single'} type="button" onclick={() => (readerState.mode = 'single')}>
          <Columns size={16} weight="bold" />
          Single
        </button>
        <button class:active={readerState.mode === 'strip'} type="button" onclick={() => (readerState.mode = 'strip')}>
          <List size={16} weight="bold" />
          Strip
        </button>
      </div>

      <button class="direction-toggle" type="button" onclick={() => (readerState.direction = readerState.direction === 'ltr' ? 'rtl' : 'ltr')}>
        <TextAlignRight size={16} weight="bold" />
        {readerState.direction.toUpperCase()}
      </button>

      <div class="zoom-controls">
        <button class="zoom-btn" type="button" onclick={() => { readerState.zoom = adjustZoom(readerState.zoom, -ZOOM_STEP) }}>−</button>
        <button class="zoom-label" type="button" onclick={() => { readerState.zoom = 1; readerState.inspectScale = 1 }}>
          <MagnifyingGlass size={12} weight="bold" />
          {zoomPct}%
        </button>
        <button class="zoom-btn" type="button" onclick={() => { readerState.zoom = adjustZoom(readerState.zoom, ZOOM_STEP) }}>+</button>
      </div>
    </div>
  </header>

  <div class="reader-progress">
    <div class="progress-copy">
      <span>{progressPercent}% read</span>
      <span>{pageLabel}</span>
    </div>
    <input
      type="range"
      min="1"
      max={Math.max(totalPages, 1)}
      value={Math.min(Math.max(currentPageNumber, 1), Math.max(totalPages, 1))}
      oninput={handleRangeInput}
      disabled={totalPages === 0}
      aria-label="Reader progress"
    />
  </div>

  <div class="reader-stage">
    {#if initializing && readerState.pages.length === 0}
      <div class="reader-status">
        <span class="spin"><SpinnerGap size={22} weight="bold" /></span>
        <p>Loading chapter pages...</p>
      </div>
    {:else if routeError || readerState.pagesError}
      <div class="reader-status error">
        <p>{routeError ?? readerState.pagesError}</p>
        <Button onclick={retryLoad}>Retry</Button>
      </div>
    {:else if totalPages === 0}
      <div class="reader-status">
        <p>No pages were returned for this chapter.</p>
      </div>
    {:else if readerState.mode === 'strip'}
      <div class="strip-view" style="zoom: {readerState.zoom}">
        {#each readerState.pages as pageData, index (pageData.index)}
          <button class="strip-page" class:current={index === readerState.currentPage} type="button" onclick={() => void setCurrentReaderPage(index)}>
            <img src={pageData.imageData ?? pageData.url} alt={`Page ${index + 1}`} loading="lazy" data-page-index={index} />
            <span>Page {index + 1}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="single-view">
        <button class="edge-nav left" type="button" onclick={() => void stepBackward()} aria-label="Previous page">
          <CaretLeft size={28} weight="bold" />
        </button>

        {#if currentPageData}
          <img class="single-page" src={currentPageData.imageData ?? currentPageData.url} alt={`Page ${currentPageNumber}`} />
        {/if}

        <button class="edge-nav right" type="button" onclick={() => void stepForward()} aria-label="Next page">
          <CaretRight size={28} weight="bold" />
        </button>
      </div>
    {/if}
  </div>

  <footer class="reader-footer">
    <Button variant="ghost" onclick={() => void stepBackward()}>
      <CaretLeft size={16} weight="bold" />
      {chapterNeighbors.previous && readerState.currentPage === 0 ? 'Prev chapter' : 'Prev page'}
    </Button>

    <Button onclick={() => void stepForward()}>
      {readerState.currentPage >= totalPages - 1 && chapterNeighbors.next ? 'Next chapter' : 'Next page'}
      <CaretRight size={16} weight="bold" />
    </Button>
  </footer>
</section>

<style>
  .reader-page {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    gap: var(--sp-3);
    height: 100%;
    padding: var(--sp-4);
    color: var(--text-primary);
  }

  .reader-toolbar,
  .reader-progress,
  .reader-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--bg-raised) 88%, transparent);
  }

  .reader-meta,
  .reader-actions,
  .reader-footer {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .reader-titles h1 {
    margin: 2px 0;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    line-height: var(--leading-tight);
  }

  .eyebrow,
  .subcopy,
  .progress-copy,
  .strip-page span {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .reader-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .toggle-group,
  .direction-toggle,
  .zoom-controls {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-lg);
    background: var(--bg-base);
  }

  .toggle-group button,
  .direction-toggle,
  .zoom-btn,
  .zoom-label {
    height: 34px;
    padding: 0 10px;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .toggle-group button.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .reader-progress {
    flex-direction: column;
    align-items: stretch;
  }

  .progress-copy {
    display: flex;
    justify-content: space-between;
    gap: var(--sp-2);
  }

  .reader-progress input {
    width: 100%;
  }

  .reader-stage {
    min-height: 0;
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-2xl);
    background: color-mix(in srgb, var(--bg-base) 92%, black 8%);
    overflow: auto;
  }

  .reader-status,
  .single-view,
  .strip-view {
    min-height: 100%;
  }

  .reader-status {
    display: grid;
    place-items: center;
    gap: var(--sp-3);
    padding: var(--sp-6);
    text-align: center;
    color: var(--text-muted);
  }

  .reader-status.error {
    color: var(--color-error);
  }

  .spin {
    animation: spin 0.8s linear infinite;
  }

  .single-view {
    display: grid;
    grid-template-columns: minmax(56px, 96px) 1fr minmax(56px, 96px);
    align-items: center;
    height: 100%;
  }

  .single-page {
    width: 100%;
    max-height: 100%;
    object-fit: contain;
    justify-self: center;
  }

  .edge-nav {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    border: 0;
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
  }

  .strip-view {
    display: grid;
    gap: var(--sp-3);
    padding: var(--sp-4);
  }

  .strip-page {
    display: grid;
    gap: var(--sp-2);
    justify-items: center;
    padding: var(--sp-3);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-xl);
    background: var(--bg-raised);
    cursor: pointer;
  }

  .strip-page.current {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .strip-page img {
    width: min(100%, 1100px);
    object-fit: contain;
  }
</style>
