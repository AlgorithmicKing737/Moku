<script lang="ts">
  import { onMount } from 'svelte'
  import { afterNavigate } from '$app/navigation'
  import { ArrowLeft, ArrowsClockwise, CaretLeft, CaretRight, CircleNotch } from 'phosphor-svelte'
  import { browseSource, loadSources } from '$lib/request-manager/extensions'
  import { extensionsState } from '$lib/state/extensions.svelte'
  import MangaCard from '$lib/ui/manga/MangaCard.svelte'
  import type { PageProps } from './$types'

  let { params }: PageProps = $props()

  let page = $state(1)
  let sourceId = $state('')

  const currentSource = $derived(
    extensionsState.sources.find(source => source.id === sourceId)
  )

  async function loadSourcePage(nextPage = 1) {
    page = nextPage
    await browseSource(sourceId, nextPage)
  }

  async function refresh() {
    await loadSourcePage(page)
  }

  onMount(async () => {
    sourceId = params.sourceId

    if (extensionsState.sources.length === 0) {
      await loadSources()
    }

    await loadSourcePage(1)

    const unsubscribe = afterNavigate(() => {
      if (params.sourceId === sourceId) return

      sourceId = params.sourceId
      void loadSourcePage(1)
    })

    return unsubscribe
  })
</script>

<section class="browse-source-page">
  <header class="toolbar">
    <div class="title-wrap">
      <a class="back-link" href="/browse">
        <ArrowLeft size={14} weight="bold" />
        All sources
      </a>
      <h1>{currentSource?.displayName ?? 'Source'}</h1>
      <p>
        {currentSource?.lang?.toUpperCase() ?? 'N/A'}
        {#if currentSource?.isNsfw}
          · NSFW
        {/if}
      </p>
    </div>

    <div class="controls">
      <button type="button" class="icon-btn" onclick={refresh} disabled={extensionsState.browseLoading}>
        {#if extensionsState.browseLoading}
          <CircleNotch size={14} weight="light" class="spin" />
        {:else}
          <ArrowsClockwise size={14} weight="bold" />
        {/if}
      </button>

      <div class="pager">
        <button
          type="button"
          aria-label="Previous page"
          onclick={() => loadSourcePage(Math.max(1, page - 1))}
          disabled={page <= 1 || extensionsState.browseLoading}
        >
          <CaretLeft size={14} weight="bold" />
        </button>

        <span>Page {page}</span>

        <button
          type="button"
          aria-label="Next page"
          onclick={() => loadSourcePage(page + 1)}
          disabled={!extensionsState.browseHasMore || extensionsState.browseLoading}
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  </header>

  {#if extensionsState.browseError}
    <div class="empty-state error-state">
      <p>Unable to browse this source.</p>
      <small>{extensionsState.browseError}</small>
      <button type="button" onclick={refresh}>Retry</button>
    </div>
  {:else if extensionsState.browseLoading && extensionsState.browseResults.length === 0}
    <div class="empty-state">Loading manga...</div>
  {:else if extensionsState.browseResults.length === 0}
    <div class="empty-state">No manga found on this page.</div>
  {:else}
    <div class="results">
      {#each extensionsState.browseResults as manga (manga.id)}
        <MangaCard manga={manga} href={`/series/${manga.id}`} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .browse-source-page {
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
    gap: var(--sp-4);
  }

  .title-wrap h1 {
    margin: var(--sp-1) 0 0;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: var(--text-2xl);
  }

  .title-wrap p {
    margin: var(--sp-1) 0 0;
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
    text-decoration: none;
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .icon-btn,
  .pager button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    min-width: 34px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
    color: var(--text-muted);
    cursor: pointer;
  }

  .icon-btn:disabled,
  .pager button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .pager {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
  }

  .pager span {
    min-width: 78px;
    text-align: center;
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
  }

  .results {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--sp-3);
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

  .error-state button {
    border: 1px solid var(--border-dim);
    background: var(--bg-overlay);
    color: var(--text-muted);
    border-radius: var(--radius-md);
    height: 30px;
    padding: 0 10px;
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .spin {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
