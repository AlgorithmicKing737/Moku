<script lang="ts">
  import { BookmarkSimple, BookOpen, DownloadSimple } from 'phosphor-svelte'
  import type { Manga } from '$lib/types/manga'
  import Thumbnail from '$lib/ui/manga/Thumbnail.svelte'

  interface Props {
    manga: Manga
    href?: string
    compact?: boolean
    showMeta?: boolean
  }

  let {
    manga,
    href,
    compact = false,
    showMeta = true,
  }: Props = $props()

  const unreadCount = $derived(manga.unreadCount ?? 0)
  const downloadCount = $derived(manga.downloadCount ?? 0)
  const bookmarkCount = $derived(manga.bookmarkCount ?? 0)
</script>

{#if href}
  <a class:compact class="card" {href} aria-label={manga.title}>
    <Thumbnail class="manga-card-cover" src={manga.thumbnailUrl} alt={manga.title} />
    <div class="body">
      <p class="title">{manga.title}</p>
      {#if showMeta}
        <div class="meta">
          <span><BookOpen size={12} weight="light" /> {unreadCount}</span>
          <span><DownloadSimple size={12} weight="light" /> {downloadCount}</span>
          <span><BookmarkSimple size={12} weight="light" /> {bookmarkCount}</span>
        </div>
      {/if}
      {#if manga.source?.displayName}
        <p class="source">{manga.source.displayName}</p>
      {/if}
    </div>
  </a>
{:else}
  <div class:compact class="card">
    <Thumbnail class="manga-card-cover" src={manga.thumbnailUrl} alt={manga.title} />
    <div class="body">
      <p class="title">{manga.title}</p>
      {#if showMeta}
        <div class="meta">
          <span><BookOpen size={12} weight="light" /> {unreadCount}</span>
          <span><DownloadSimple size={12} weight="light" /> {downloadCount}</span>
          <span><BookmarkSimple size={12} weight="light" /> {bookmarkCount}</span>
        </div>
      {/if}
      {#if manga.source?.displayName}
        <p class="source">{manga.source.displayName}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-width: 0;
    padding: var(--sp-3);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--bg-overlay) 75%, transparent), transparent),
      var(--bg-raised);
    transition: border-color var(--t-base), transform var(--t-base), background var(--t-base);
  }

  .card:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
  }

  .card.compact {
    gap: var(--sp-2);
    padding: var(--sp-2);
  }

  :global(.manga-card-cover) {
    aspect-ratio: 3 / 4;
    width: 100%;
    border-radius: var(--radius-lg);
    object-fit: cover;
    background: var(--bg-overlay);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    min-width: 0;
  }

  .title {
    overflow: hidden;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    line-height: var(--leading-snug);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
  }

  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .source {
    color: var(--text-faint);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>