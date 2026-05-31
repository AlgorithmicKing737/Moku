<script lang="ts">
  import { CheckSquare, Trash, Folder } from 'phosphor-svelte'
  import type { Manga, Category } from '$lib/types'

  interface Props {
    items:             Manga[]
    loading:           boolean
    selectMode:        boolean
    selected:          Set<number>
    tab:               string
    visibleCategories: Category[]
    bulkWorking:       boolean
    onCardClick:       (e: MouseEvent, m: Manga) => void
    onCardContextMenu: (e: MouseEvent, m: Manga) => void
    onSelectAll:       () => void
    onExitSelect:      () => void
    onBulkRemove:      () => void
    onBulkMove:        (cat: Category) => void
  }

  let {
    items, loading, selectMode, selected, tab,
    visibleCategories, bulkWorking,
    onCardClick, onCardContextMenu, onSelectAll, onExitSelect, onBulkRemove, onBulkMove,
  }: Props = $props()

  const THUMB_BASE = 'http://127.0.0.1:4567'

  let movePanelOpen = $state(false)

  function coverUrl(m: Manga) {
    const url = m.thumbnailUrl ?? ''
    return url.startsWith('http') ? url : `${THUMB_BASE}${url}`
  }

  function onDocDown(e: MouseEvent) {
    if (movePanelOpen && !(e.target as HTMLElement).closest('.move-wrap')) movePanelOpen = false
  }

  $effect(() => {
    document.addEventListener('mousedown', onDocDown, true)
    return () => document.removeEventListener('mousedown', onDocDown, true)
  })
</script>

{#if selectMode}
  <div class="select-bar">
    <span class="sel-count">{selected.size} selected</span>
    <button class="sel-text-btn" onclick={onSelectAll}>Select all</button>
    <div class="sel-right">
      {#if visibleCategories.length > 0}
        <div class="move-wrap">
          <button
            class="sel-action-btn"
            disabled={selected.size === 0 || bulkWorking}
            onclick={() => movePanelOpen = !movePanelOpen}
          >
            <Folder size={13} weight="bold" />
            Move to folder
          </button>
          {#if movePanelOpen}
            <div class="move-panel" role="menu">
              {#each visibleCategories as cat}
                <button
                  class="move-item"
                  role="menuitem"
                  onclick={() => { onBulkMove(cat); movePanelOpen = false }}
                >
                  <Folder size={12} weight="bold" />
                  {cat.name}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <button
        class="sel-action-btn sel-danger"
        disabled={selected.size === 0 || bulkWorking}
        onclick={onBulkRemove}
      >
        <Trash size={13} weight="bold" />
        Remove
      </button>
    </div>
  </div>
{/if}

<div
  class="content"
  role="presentation"
  onclick={(e) => {
    if (selectMode && !(e.target as HTMLElement).closest('.card')) onExitSelect()
  }}
>
  {#if loading}
    <div class="grid">
      {#each Array(12) as _}
        <div class="card-skeleton">
          <div class="cover-skeleton skeleton"></div>
          <div class="title-skeleton skeleton"></div>
        </div>
      {/each}
    </div>

  {:else if items.length === 0}
    <div class="empty">
      {tab === 'downloaded'
        ? 'No downloaded manga.'
        : 'No manga in this library — browse sources to add some.'}
    </div>

  {:else}
    <div class="grid">
    {#each items as m (m.id)}
      {@const isSelected  = selected.has(m.id)}
      {@const isCompleted = m.status === 'COMPLETED' || (!m.unreadCount && (m.chapters?.totalCount ?? 0) > 0)}
        <button
          class="card"
          class:card-selected={isSelected}
          class:select-mode={selectMode}
          onclick={(e) => onCardClick(e, m)}
          oncontextmenu={(e) => onCardContextMenu(e, m)}
        >
          <div class="cover-wrap" class:completed={isCompleted}>
            <img
              class="cover"
              src={coverUrl(m)}
              alt={m.title}
              draggable="false"
              loading="lazy"
            />
            <div class="overlay">
              <div class="badges">
                {#if isCompleted}
                  <span class="badge badge-done">✓ Done</span>
                {:else if m.unreadCount}
                  <span class="badge badge-unread">{m.unreadCount} new</span>
                {/if}
                {#if m.downloadCount}
                  <span class="badge badge-dl">↓ {m.downloadCount}</span>
                {/if}
              </div>
            </div>
            {#if selectMode}
              <div class="select-overlay" aria-hidden="true">
                <div class="select-check" class:checked={isSelected}>
                  {#if isSelected}
                    <CheckSquare size={20} weight="fill" />
                  {:else}
                    <div class="check-empty"></div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
          <p class="title">{m.title}</p>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .content {
    flex: 1; overflow-y: auto;
    padding: var(--sp-5) var(--sp-6) var(--sp-6);
    -webkit-overflow-scrolling: touch;
  }

  .select-bar {
    display: flex; align-items: center; gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-6);
    background: var(--bg-raised); border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0; z-index: 10; position: relative;
    animation: fadeIn 0.1s ease both;
  }
  .sel-right { display: flex; align-items: center; gap: var(--sp-2); margin-left: auto; }
  .sel-count {
    font-family: var(--font-ui); font-size: var(--text-xs);
    color: var(--text-secondary); letter-spacing: var(--tracking-wide); white-space: nowrap;
  }
  .sel-text-btn {
    font-family: var(--font-ui); font-size: var(--text-xs);
    color: var(--text-faint); background: none; border: none;
    cursor: pointer; padding: 2px 4px; border-radius: var(--radius-sm);
    transition: color var(--t-base);
  }
  .sel-text-btn:hover { color: var(--text-primary); }
  .sel-action-btn {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--font-ui); font-size: var(--text-xs);
    padding: 5px 10px; border-radius: var(--radius-md);
    border: 1px solid var(--border-dim); background: var(--bg-raised);
    color: var(--text-muted); cursor: pointer; white-space: nowrap;
    transition: color var(--t-base), border-color var(--t-base), background var(--t-base);
  }
  .sel-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .sel-action-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); }
  .sel-danger:hover:not(:disabled) {
    color: var(--color-error, #e05c5c);
    border-color: color-mix(in srgb, var(--color-error, #e05c5c) 40%, transparent);
    background: color-mix(in srgb, var(--color-error, #e05c5c) 8%, transparent);
  }

  .move-wrap { position: relative; }
  .move-panel {
    position: absolute; top: calc(100% + 4px); right: 0; z-index: 9999;
    min-width: 180px; background: var(--bg-raised);
    border: 1px solid var(--border-base); border-radius: var(--radius-lg);
    padding: var(--sp-1); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: fadeIn 0.1s ease both;
  }
  .move-item {
    display: flex; align-items: center; gap: var(--sp-2);
    width: 100%; padding: 7px 10px; border-radius: var(--radius-sm);
    border: none; background: transparent; color: var(--text-muted);
    font-family: var(--font-ui); font-size: var(--text-xs);
    cursor: pointer; text-align: left;
    transition: background var(--t-base), color var(--t-base);
  }
  .move-item:hover { background: var(--bg-overlay); color: var(--text-primary); }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: var(--sp-4);
  }

  .card { background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
  .card:not(.select-mode):hover .cover-wrap {
    transform: translateY(-3px);
    border-color: var(--border-strong);
    box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  }
  .card:not(.select-mode):hover .title { color: var(--text-primary); }
  .card.select-mode { cursor: default; }
  .card.card-selected .cover-wrap { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--radius-md); }
  .card.card-selected .title { color: var(--accent-fg); }

  .cover-wrap {
    position: relative; aspect-ratio: 2/3; overflow: hidden;
    border-radius: var(--radius-md); background: var(--bg-raised);
    border: 1px solid var(--border-dim); will-change: transform;
    transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), border-color var(--t-base), box-shadow 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .cover-wrap.completed { box-shadow: inset 0 -2px 0 0 var(--accent); }

  .cover { width: 100%; height: 100%; object-fit: cover; display: block; }

  .overlay {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    padding: 32px 6px 10px;
    background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 50%, transparent 100%);
    opacity: 0; pointer-events: none;
    transition: opacity 0.18s ease;
  }
  .card:not(.select-mode):hover .overlay { opacity: 1; }

  .badges { display: flex; align-items: flex-end; justify-content: space-between; gap: 4px; flex-wrap: wrap; }
  .badge {
    font-family: var(--font-ui); font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.04em; line-height: 1; padding: 3px 7px;
    border-radius: 20px; white-space: nowrap;
  }
  .badge-unread { background: var(--accent); color: #fff; box-shadow: 0 1px 8px rgba(0,0,0,0.5); }
  .badge-done   { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.25); }
  .badge-dl     { background: rgba(0,0,0,0.55); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.18); margin-left: auto; }

  .select-overlay {
    position: absolute; inset: 0; z-index: 3;
    background: rgba(0,0,0,0.18);
    display: flex; align-items: flex-start; justify-content: flex-end;
    padding: 6px; pointer-events: none;
  }
  .select-check { color: var(--text-faint); opacity: 0.7; transition: color var(--t-base), opacity var(--t-base); }
  .select-check.checked { color: var(--accent-fg); opacity: 1; }
  .check-empty {
    width: 20px; height: 20px; border-radius: 4px;
    border: 2px solid var(--text-faint); background: rgba(0,0,0,0.3);
  }

  .title {
    margin-top: var(--sp-2); font-size: var(--text-sm);
    color: var(--text-secondary); line-height: var(--leading-snug);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; height: 2lh;
    transition: color var(--t-base);
  }

  .card-skeleton { padding: 0; }
  .cover-skeleton { aspect-ratio: 2/3; border-radius: var(--radius-md); }
  .title-skeleton { height: 12px; margin-top: var(--sp-2); width: 80%; border-radius: var(--radius-sm); }
  .skeleton { background: var(--bg-raised); animation: pulse 1.4s ease infinite; }

  .empty {
    display: flex; align-items: center; justify-content: center;
    height: 60%; color: var(--text-muted); font-size: var(--text-sm);
    text-align: center;
  }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes pulse  { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
</style>