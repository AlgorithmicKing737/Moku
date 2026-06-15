<script lang="ts">
  import { CircleNotchIcon } from "phosphor-svelte";
  import DownloadItem    from "$lib/components/downloads/DownloadItem.svelte";
  import type { DownloadQueueItem } from "$lib/types/api";

  interface Props {
    queue:      DownloadQueueItem[];
    loading:    boolean;
    isRunning:  boolean;
    dequeueing: Set<number>;
    selected:   Set<number>;
    onRemove: (chapterId: number) => void;
    onRetry:  (chapterId: number) => void;
    onSelect: (chapterId: number, e: MouseEvent) => void;
  }

  const {
    queue, loading, isRunning, dequeueing, selected,
    onRemove, onRetry, onSelect,
  }: Props = $props();
</script>

{#if loading}
  <div class="list">
    {#each Array(5) as _, i (i)}
      <div class="sk-row">
        <div class="sk-thumb skeleton"></div>
        <div class="sk-info">
          <div class="skeleton sk-title"></div>
          <div class="skeleton sk-chapter"></div>
          <div class="sk-progress-row">
            <div class="skeleton sk-bar"></div>
            <div class="skeleton sk-pages"></div>
          </div>
        </div>
        <div class="sk-right">
          <div class="skeleton sk-state"></div>
          <div class="sk-actions"><div class="skeleton sk-btn"></div></div>
        </div>
      </div>
    {/each}
  </div>
{:else if queue.length === 0}
  <div class="empty">Queue is empty.</div>
{:else}
  <div class="list">
    {#each queue as item, i (item.chapter.id)}
      <DownloadItem
        {item}
        isActive={i === 0 && isRunning}
        isRemoving={dequeueing.has(item.chapter.id)}
        isSelected={selected.has(item.chapter.id)}
        {onRemove}
        {onRetry}
        {onSelect}
      />
    {/each}
  </div>
{/if}

<style>
  .list  { display: flex; flex-direction: column; gap: var(--sp-2); }
  .empty { display: flex; align-items: center; justify-content: center; height: 160px; color: var(--text-faint); font-family: var(--font-ui); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); }

  @keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }
  .skeleton {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--bg-overlay) 90%, var(--text-primary) 6%) 20%,
      color-mix(in srgb, var(--bg-overlay) 76%, var(--text-primary) 16%) 50%,
      color-mix(in srgb, var(--bg-overlay) 90%, var(--text-primary) 6%) 80%
    );
    background-size: 220% 100%;
    animation: shimmer 1.45s ease-in-out infinite;
  }

  .sk-row          { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3); background: var(--bg-raised); border: 1px solid var(--border-dim); border-radius: var(--radius-md); pointer-events: none; }
  .sk-thumb        { width: 36px; height: 54px; flex-shrink: 0; }
  .sk-info         { flex: 1; display: flex; flex-direction: column; gap: 5px; overflow: hidden; min-width: 0; }
  .sk-title        { height: 12px; width: clamp(120px, 55%, 280px); }
  .sk-chapter      { height: 10px; width: clamp(80px, 35%, 200px); }
  .sk-progress-row { display: flex; align-items: center; gap: var(--sp-2); }
  .sk-bar          { flex: 1; height: 2px; }
  .sk-pages        { width: 28px; height: 9px; }
  .sk-right        { display: flex; flex-direction: column; align-items: flex-end; gap: var(--sp-1); flex-shrink: 0; }
  .sk-state        { width: 54px; height: 9px; }
  .sk-actions      { display: flex; gap: 2px; }
  .sk-btn          { width: 20px; height: 20px; border-radius: var(--radius-sm); }
</style>