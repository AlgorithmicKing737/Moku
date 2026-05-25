<script lang="ts">
  import { Check, Funnel } from 'phosphor-svelte'
  import type { MangaStatus } from '$lib/server-adapters/types'

  interface Props {
    status:        MangaStatus | 'all'
    unread:        boolean
    downloaded:    boolean
    bookmarked:    boolean
    hasActive:     boolean
    open:          boolean
    onToggle:      () => void
    onStatus:      (s: MangaStatus | 'all') => void
    onUnread:      () => void
    onDownloaded:  () => void
    onBookmarked:  () => void
    onClear:       () => void
  }

  let {
    status, unread, downloaded, bookmarked, hasActive, open,
    onToggle, onStatus, onUnread, onDownloaded, onBookmarked, onClear,
  }: Props = $props()

  const STATUSES: [MangaStatus, string][] = [
    ['ONGOING',             'Ongoing'],
    ['COMPLETED',           'Completed'],
    ['ON_HIATUS',           'Hiatus'],
    ['CANCELLED',           'Cancelled'],
    ['PUBLISHING_FINISHED', 'Publishing finished'],
  ]
</script>

<div class="wrap">
  <button
    class="icon-btn"
    class:active={hasActive}
    title="Filter"
    onclick={onToggle}
  >
    <Funnel size={15} weight={hasActive ? 'fill' : 'bold'} />
  </button>

  {#if open}
    <div class="panel" role="menu">
      <div class="panel-head">
        <span class="panel-title">Filter</span>
        {#if hasActive}
          <button class="clear-btn" onclick={onClear}>Clear all</button>
        {/if}
      </div>

      <div class="divider"></div>
      <p class="section-label">Content</p>

      {#each [
        { label: 'Unread',     active: unread,     handler: onUnread },
        { label: 'Downloaded', active: downloaded, handler: onDownloaded },
        { label: 'Bookmarked', active: bookmarked, handler: onBookmarked },
      ] as f}
        <button
          class="item"
          class:item-active={f.active}
          role="menuitem"
          onclick={f.handler}
        >
          <span class="check" class:check-on={f.active}>
            {#if f.active}<Check size={9} weight="bold" />{/if}
          </span>
          {f.label}
        </button>
      {/each}

      <div class="divider"></div>
      <p class="section-label">Status</p>

      {#each STATUSES as [s, label]}
        <button
          class="item"
          class:item-active={status === s}
          role="menuitem"
          onclick={() => onStatus(status === s ? 'all' : s)}
        >
          <span class="check" class:check-on={status === s}>
            {#if status === s}<Check size={9} weight="bold" />{/if}
          </span>
          {label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }

  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
    color: var(--text-faint);
    cursor: pointer;
    transition: color var(--t-base), border-color var(--t-base), background var(--t-base);
  }
  .icon-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .icon-btn.active { color: var(--accent-fg); border-color: var(--accent-dim); background: var(--accent-muted); }

  .panel {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 9999;
    min-width: 220px;
    background: var(--bg-raised);
    border: 1px solid var(--border-base);
    border-radius: var(--radius-lg);
    padding: var(--sp-1);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: fadeIn 0.1s ease both;
  }

  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 10px 4px;
  }
  .panel-title {
    font-family: var(--font-ui); font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide); color: var(--text-secondary);
    font-weight: var(--weight-medium, 500);
  }
  .clear-btn {
    font-family: var(--font-ui); font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide); color: var(--text-faint);
    background: none; border: none; cursor: pointer; padding: 0;
    transition: color var(--t-base);
  }
  .clear-btn:hover { color: var(--color-error); }

  .divider { height: 1px; background: var(--border-dim); margin: 4px 2px; }

  .section-label {
    font-family: var(--font-ui); font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider); text-transform: uppercase;
    color: var(--text-faint); padding: 4px 8px 8px;
  }

  .item {
    display: flex; align-items: center; gap: var(--sp-2);
    width: 100%; padding: 7px 10px;
    border-radius: var(--radius-sm); border: none;
    background: transparent; color: var(--text-muted);
    font-family: var(--font-ui); font-size: var(--text-xs);
    cursor: pointer; text-align: left;
    transition: background var(--t-base), color var(--t-base);
  }
  .item:hover { background: var(--bg-overlay); color: var(--text-primary); }
  .item-active { color: var(--accent-fg); background: var(--accent-muted); font-weight: var(--weight-medium, 500); }
  .item-active:hover { background: var(--accent-dim); }

  .check {
    width: 13px; height: 13px; border-radius: 2px;
    border: 1px solid var(--border-strong);
    background: transparent; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    color: var(--bg-base);
    transition: background var(--t-base), border-color var(--t-base);
  }
  .check-on { background: var(--accent); border-color: var(--accent); }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>