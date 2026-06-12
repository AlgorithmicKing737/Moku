<script lang="ts">
  import { BookOpen, CircleNotch, Download, Trash } from 'phosphor-svelte'
  import Thumbnail from '$lib/components/shared/manga/Thumbnail.svelte'
  import type { RecentUpdate, UpdateGroup } from './lib/recentUpdates'

  interface Props {
    loading:              boolean
    error:                string | null
    groups:               UpdateGroup[]
    updatesSearch:        string
    totalCount:           number
    openingId:            number | null
    enqueueing:           Set<number>
    updaterRunning:       boolean
    lastUpdatedLabel:     string | null
    updaterProgressLabel: string | null
    onOpenUpdate:         (item: RecentUpdate) => void
    onOpenSeries:         (item: RecentUpdate) => void
    onEnqueue:            (item: RecentUpdate) => void
    onDeleteDownload:     (item: RecentUpdate) => void
  }

  let {
    loading, error, groups, updatesSearch, totalCount, openingId, enqueueing,
    updaterRunning, lastUpdatedLabel, updaterProgressLabel,
    onOpenUpdate, onOpenSeries, onEnqueue, onDeleteDownload,
  }: Props = $props()

  const filteredGroups = $derived(updatesSearch.trim()
    ? groups
        .map(g => ({
          ...g,
          items: g.items.filter(item =>
            (item.manga?.title ?? '').toLowerCase().includes(updatesSearch.toLowerCase()) ||
            (item.name ?? '').toLowerCase().includes(updatesSearch.toLowerCase())
          ),
        }))
        .filter(g => g.items.length > 0)
    : groups)

  function chapterLabel(item: RecentUpdate): string {
    if (item.name?.trim()) return item.name
    if (Number.isFinite(item.chapterNumber)) return `Chapter ${item.chapterNumber}`
    return 'Chapter'
  }
</script>

<div class="root">
  <div class="bar-wrap">
    <div class="status-bar">
      <div class="status-dot" class:active={loading || updaterRunning}></div>
      <span class="status-text">
        {#if loading}
          Checking for updates…
        {:else if error}
          Update check failed
        {:else if updaterRunning}
          Library update in progress{#if updaterProgressLabel}&thinsp;({updaterProgressLabel}){/if}
        {:else}
          Up to date
        {/if}
      </span>
      <div class="status-right">
        {#if !loading && lastUpdatedLabel}
          <span class="status-detail">Last updated: {lastUpdatedLabel}</span>
          <div class="bar-sep"></div>
        {/if}
        {#if !loading && totalCount > 0}
          <span class="status-count">{totalCount} unread</span>
        {/if}
      </div>
    </div>
  </div>

  {#if loading && groups.length === 0}
    <div class="timeline" aria-hidden="true">
      <section class="day-group">
        <div class="day-header">
          <span class="day-label skeleton sk-day-label"></span>
          <div class="day-rule skeleton sk-day-rule"></div>
        </div>
        <div class="updates-list">
          {#each Array(8) as _, i (i)}
            <div class="update-row skeleton-row">
              <div class="thumb-skeleton skeleton"></div>
              <div class="info-skeleton">
                <div class="skeleton sk-title"></div>
                <div class="skeleton sk-chapter"></div>
                <div class="skeleton sk-meta"></div>
              </div>
              <div class="end-skeleton skeleton"></div>
            </div>
          {/each}
        </div>
      </section>
    </div>

  {:else if error}
    <div class="empty">
      <div class="empty-icon-wrap"><BookOpen size={22} weight="light" /></div>
      <p class="empty-text">Couldn't load updates</p>
      <p class="empty-hint">{error}</p>
    </div>

  {:else if groups.length === 0}
    <div class="empty">
      <div class="empty-icon-wrap"><BookOpen size={22} weight="light" /></div>
      <p class="empty-text">No recent library updates</p>
      <p class="empty-hint">Run a library update to populate this page.</p>
    </div>

  {:else if filteredGroups.length === 0}
    <div class="empty">
      <div class="empty-icon-wrap"><BookOpen size={22} weight="light" /></div>
      <p class="empty-text">No results for "{updatesSearch}"</p>
    </div>

  {:else}
    <div class="timeline">
      {#each filteredGroups as { label, items } (label)}
        <section class="day-group">
          <div class="day-header">
            <span class="day-label">{label}</span>
            <div class="day-rule"></div>
          </div>
          <div class="updates-list">
            {#each items as item (item.id)}
              <div class="update-row" class:read={item.isRead}>
                <button class="thumb-btn" onclick={() => onOpenSeries(item)} title="View series">
                  <Thumbnail
                    src={item.manga?.thumbnailUrl ?? ''}
                    alt={item.manga?.title ?? 'Series cover'}
                    class="thumb"
                  />
                </button>
                <button
                  class="info-btn"
                  onclick={() => onOpenUpdate(item)}
                  disabled={openingId === item.id}
                >
                  <div class="update-info">
                    <div class="title-row">
                      <span class="series-title">{item.manga?.title ?? 'Unknown series'}</span>
                      {#if !item.isRead}<span class="pill" title="Unread"></span>{/if}
                    </div>
                    <span class="chapter-title">{chapterLabel(item)}</span>
                    {#if (item.lastPageRead ?? 0) > 0 && !item.isRead}
                      <div class="meta-row"><span>Resume p.{item.lastPageRead}</span></div>
                    {/if}
                  </div>
                  <div class="row-end">
                    {#if enqueueing.has(item.id)}
                      <CircleNotch size={14} weight="light" class="anim-spin" />
                    {:else if item.isDownloaded}
                      <button class="dl-btn dl-btn-delete" onclick={(e) => { e.stopPropagation(); onDeleteDownload(item) }} title="Delete download">
                        <Trash size={13} weight="light" />
                      </button>
                    {:else}
                      <button class="dl-btn" onclick={(e) => { e.stopPropagation(); onEnqueue(item) }} title="Download">
                        <Download size={13} weight="light" />
                      </button>
                    {/if}
                    {#if openingId === item.id}
                      <CircleNotch size={14} weight="light" class="anim-spin" />
                    {:else}
                      <BookOpen size={14} weight="light" />
                    {/if}
                  </div>
                </button>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .root { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

  .bar-wrap { padding: var(--sp-3) var(--sp-6); flex-shrink: 0; }
  .status-bar {
    display: flex; align-items: center; gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    background: var(--bg-surface, var(--bg-raised));
    border: 1px solid var(--border-strong, var(--border-dim));
    border-radius: var(--radius-md);
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text-faint); flex-shrink: 0;
    transition: background var(--t-base);
  }
  .status-dot.active { background: var(--accent); animation: pulse 1.6s ease infinite; }
  .status-text  { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); flex: 1; letter-spacing: var(--tracking-wide); }
  .status-right { display: flex; align-items: center; gap: var(--sp-2); margin-left: auto; }
  .status-detail,
  .status-count  { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); }
  .bar-sep { width: 1px; height: 12px; background: var(--border-dim); flex-shrink: 0; }

  .timeline {
    flex: 1; overflow-y: auto; scrollbar-width: thin;
    scrollbar-color: var(--border-dim) transparent;
    padding: var(--sp-4) var(--sp-6) var(--sp-6);
    display: flex; flex-direction: column; gap: var(--sp-5);
  }
  .day-group  { display: flex; flex-direction: column; gap: var(--sp-3); }
  .day-header { display: flex; align-items: center; gap: var(--sp-3); }
  .day-label  {
    font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint);
    letter-spacing: var(--tracking-wider); text-transform: uppercase; white-space: nowrap;
  }
  .day-rule   { height: 1px; flex: 1; background: var(--border-dim); }
  .updates-list { display: flex; flex-direction: column; gap: var(--sp-2); }

  @keyframes shimmer {
    from { background-position: -200% 0 }
    to   { background-position:  200% 0 }
  }
  .skeleton {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--bg-overlay, var(--bg-elevated)) 90%, var(--text-primary) 6%) 20%,
      color-mix(in srgb, var(--bg-elevated, var(--bg-overlay)) 76%, var(--text-primary) 16%) 50%,
      color-mix(in srgb, var(--bg-overlay, var(--bg-elevated)) 90%, var(--text-primary) 6%) 80%
    );
    background-size: 220% 100%;
    animation: shimmer 1.45s ease-in-out infinite;
  }
  .skeleton-row   { min-height: 74px; pointer-events: none; }
  .thumb-skeleton { width: 34px; aspect-ratio: 2/3; margin: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); flex-shrink: 0; align-self: center; }
  .info-skeleton  { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3) var(--sp-2) 0; }
  .sk-title   { height: 12px; width: clamp(140px, 42%, 340px); }
  .sk-chapter { height: 10px; width: clamp(100px, 30%, 260px); }
  .sk-meta    { height: 8px;  width: clamp(70px,  18%, 180px); }
  .end-skeleton { width: 14px; height: 14px; border-radius: 50%; margin: auto var(--sp-4) auto 0; flex-shrink: 0; }
  .sk-day-label { display: block; width: 74px; height: 10px; border-radius: var(--radius-sm); }
  .sk-day-rule  { opacity: 0.7; }

  .update-row {
    display: flex; align-items: stretch;
    border-radius: var(--radius-md); border: 1px solid var(--border-dim);
    background: var(--bg-raised); overflow: hidden;
    transition: border-color var(--t-fast), opacity var(--t-base), background var(--t-fast);
  }
  .update-row:has(.info-btn:hover:not(:disabled)),
  .update-row:has(.thumb-btn:hover) { border-color: var(--border-strong); background: var(--bg-elevated); }
  .update-row.read { opacity: 0.5; }

  .thumb-btn {
    width: 52px; flex-shrink: 0; padding: var(--sp-2);
    background: none; border: none; cursor: pointer;
    display: flex; align-items: center;
  }
  :global(.thumb) { width: 100%; aspect-ratio: 2/3; display: block; object-fit: cover; border-radius: var(--radius-sm); }

  .info-btn {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3); background: none; border: none;
    cursor: pointer; text-align: left;
  }
  .info-btn:disabled { cursor: default; opacity: 0.8; }

  .update-info  { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .title-row    { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; }
  .series-title,
  .chapter-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .series-title  { font-family: var(--font-ui); font-size: var(--text-sm); color: var(--text-primary); }
  .chapter-title { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); }
  .meta-row { font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); }
  .pill {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--color-success, #22c55e); flex-shrink: 0;
  }
  .row-end { color: var(--text-faint); display: flex; align-items: center; gap: var(--sp-1); justify-content: center; flex-shrink: 0; }

  .dl-btn {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; border-radius: var(--radius-sm);
    border: none; background: none; color: var(--text-faint); cursor: pointer;
    transition: color var(--t-base), background var(--t-base);
  }
  .dl-btn:hover { color: var(--text-muted); background: var(--bg-overlay); }
  .dl-btn-delete { color: var(--color-error); }
  .dl-btn-delete:hover { background: var(--color-error-bg); }

  .empty {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: var(--sp-2); color: var(--text-faint);
    padding: var(--sp-6); text-align: center;
  }
  .empty-icon-wrap {
    width: 44px; height: 44px; border-radius: var(--radius-lg);
    display: flex; align-items: center; justify-content: center;
    background: var(--bg-raised); border: 1px solid var(--border-dim);
    color: var(--text-faint); opacity: 0.5; margin-bottom: var(--sp-1);
  }
  .empty-text { margin: 0; font-family: var(--font-ui); font-size: var(--text-sm); color: var(--text-secondary); }
  .empty-hint { margin: 0; font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); }

  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
</style>