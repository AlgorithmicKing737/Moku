<script lang="ts">
  import { Play, Pause, Trash, CircleNotch, ArrowClockwise, Bell, BellSlash, Repeat, Warning } from "phosphor-svelte";
  import { ArrowLineUp, ArrowLineDown, X, CaretUp, CaretDown } from "phosphor-svelte";
  import DownloadQueue  from "$lib/components/downloads/DownloadQueue.svelte";
  import { downloadStore } from "$lib/state/downloads.svelte";
  import { formatEta }  from "$lib/components/downloads/lib/downloadQueue";

  let selectAnchor = $state<number | null>(null);
  let moveBy       = $state(1);
  let confirmClear = $state(false);

  const selectedErrorCount = $derived(
    downloadStore.queue.filter(i => downloadStore.selected.has(i.chapter.id) && i.state === "ERROR").length,
  );

  function handleSelect(chapterId: number, e: MouseEvent | { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.shiftKey && selectAnchor !== null) {
      downloadStore.selectRange(selectAnchor, chapterId);
    } else if (ctrl) {
      downloadStore.toggleSelect(chapterId);
      selectAnchor = chapterId;
    } else {
      if (downloadStore.selected.has(chapterId) && downloadStore.selected.size === 1) {
        downloadStore.clearSelection();
        selectAnchor = null;
      } else {
        downloadStore.selectOnly(chapterId);
        selectAnchor = chapterId;
      }
    }
  }

  function handleClickOff() {
    if (downloadStore.selected.size > 0) { downloadStore.clearSelection(); selectAnchor = null; }
  }
</script>

<div class="root">
  <div class="header">
    <h1 class="heading">Downloads</h1>
    <div class="header-actions">
      {#if downloadStore.storageWarning}
        <div class="storage-warning" title="Download queue may exceed available disk space">
          <Warning size={14} weight="fill" />
        </div>
      {/if}
      <button
        class="icon-btn"
        class:active={downloadStore.autoRetryEnabled}
        onclick={() => downloadStore.toggleAutoRetry()}
        title={downloadStore.autoRetryEnabled ? "Disable auto-retry" : "Enable auto-retry"}
      >
        <Repeat size={14} weight="regular" />
      </button>
      {#if downloadStore.hasErrored}
        <button
          class="icon-btn"
          onclick={() => downloadStore.retryAllErrored()}
          disabled={downloadStore.batchWorking}
          title="Retry all errored"
        >
          {#if downloadStore.batchWorking}
            <CircleNotch size={14} weight="light" class="anim-spin" />
          {:else}
            <ArrowClockwise size={14} weight="bold" />
          {/if}
        </button>
      {/if}
      <button
        class="icon-btn"
        class:active={downloadStore.toastsEnabled}
        onclick={() => downloadStore.toggleToasts()}
        title={downloadStore.toastsEnabled ? "Mute download notifications" : "Unmute download notifications"}
      >
        {#if downloadStore.toastsEnabled}
          <Bell size={14} weight="regular" />
        {:else}
          <BellSlash size={14} weight="regular" />
        {/if}
      </button>
      <button
        class="icon-btn"
        class:loading={downloadStore.togglingPlay}
        onclick={() => downloadStore.togglePlay()}
        disabled={downloadStore.togglingPlay || (downloadStore.queue.length === 0 && !downloadStore.isRunning)}
        title={downloadStore.isRunning ? "Pause" : "Resume"}
      >
        {#if downloadStore.togglingPlay}<CircleNotch size={14} weight="light" class="anim-spin" />
        {:else if downloadStore.isRunning}<Pause size={14} weight="fill" />
        {:else}<Play size={14} weight="fill" />{/if}
      </button>
      <button
        class="icon-btn"
        class:loading={downloadStore.clearing}
        onclick={() => confirmClear = true}
        disabled={downloadStore.clearing || downloadStore.queue.length === 0}
        title="Clear queue"
      >
        {#if downloadStore.clearing}<CircleNotch size={14} weight="light" class="anim-spin" />
        {:else}<Trash size={14} weight="regular" />{/if}
      </button>
    </div>
  </div>

  <div class="bar-wrap">
    <div class="status-bar" role="none">
      <div class="status-dot" class:active={downloadStore.isRunning}></div>
      <span class="status-text">
        {downloadStore.togglingPlay
          ? (downloadStore.isRunning ? "Pausing…" : "Starting…")
          : downloadStore.isRunning ? "Downloading" : "Paused"}
      </span>

      {#if downloadStore.selected.size > 0}
        <div class="sel-controls">
          <button class="sel-action-btn" disabled={downloadStore.batchWorking} onclick={(e) => { e.stopPropagation(); downloadStore.reorderSelectedToEdge("top"); }} title="Move to top">
            <ArrowLineUp size={12} weight="bold" />
          </button>
          <div class="move-step" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="none">
            <button class="sel-action-btn" disabled={downloadStore.batchWorking} onclick={(e) => { e.stopPropagation(); downloadStore.reorderSelected("up", moveBy); }} title="Move up">
              <CaretUp size={12} weight="bold" />
            </button>
            <input
              class="move-input"
              type="number"
              min="1"
              bind:value={moveBy}
              onclick={(e) => e.stopPropagation()}
              onkeydown={(e) => e.stopPropagation()}
            />
            <button class="sel-action-btn" disabled={downloadStore.batchWorking} onclick={(e) => { e.stopPropagation(); downloadStore.reorderSelected("down", moveBy); }} title="Move down">
              <CaretDown size={12} weight="bold" />
            </button>
          </div>
          <button class="sel-action-btn" disabled={downloadStore.batchWorking} onclick={(e) => { e.stopPropagation(); downloadStore.reorderSelectedToEdge("bottom"); }} title="Move to bottom">
            <ArrowLineDown size={12} weight="bold" />
          </button>
          {#if selectedErrorCount > 0}
            <button class="sel-action-btn" disabled={downloadStore.batchWorking} onclick={(e) => { e.stopPropagation(); downloadStore.retrySelected(); }} title="Retry errors">
              <ArrowClockwise size={12} weight="bold" />
            </button>
          {/if}
          <button class="sel-action-btn sel-action-danger" disabled={downloadStore.batchWorking} onclick={(e) => { e.stopPropagation(); downloadStore.dequeueSelected(); }} title="Remove selected">
            <X size={12} weight="bold" />
          </button>
        </div>
        <div class="bar-sep"></div>
        <span class="status-count">{downloadStore.selected.size} selected</span>
      {:else}
        <div class="status-right">
          {#if downloadStore.isRunning && downloadStore.eta !== null && downloadStore.eta > 0}
            <span class="status-eta">{formatEta(downloadStore.eta)}</span>
            <span class="bar-sep"></span>
          {/if}
          <span class="status-count">{downloadStore.queue.length} {downloadStore.queue.length === 1 ? "chapter" : "chapters"}</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="content" role="none" onclick={handleClickOff} onkeydown={(e) => e.key === "Escape" && handleClickOff()}>
    <DownloadQueue
      queue={downloadStore.queue}
      loading={downloadStore.loading}
      isRunning={downloadStore.isRunning}
      dequeueing={downloadStore.dequeueing}
      selected={downloadStore.selected}
      onRemove={(id: number) => downloadStore.dequeue(id)}
      onRemoveMany={(ids: number[]) => downloadStore.dequeueMany(ids)}
      onRetry={(id: number) => downloadStore.retryOne(id)}
      onSelect={handleSelect}
    />
  </div>
</div>

{#if confirmClear}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={() => confirmClear = false}
    onkeydown={(e) => e.key === 'Escape' && (confirmClear = false)}
  >
    <div class="modal-card" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">Clear download queue?</span>
      </div>
      <div class="modal-body">
        <p class="modal-msg">Remove all <strong>{downloadStore.queue.length}</strong> queued downloads? Chapters that are already downloaded on the server are not affected.</p>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick={() => confirmClear = false}>Cancel</button>
        <button
          class="btn-danger"
          onclick={() => { confirmClear = false; downloadStore.clear(); }}
        >
          Clear queue
        </button>
      </div>
    </div>
  </div>
{/if}

{#if downloadStore.reorderProgress}
  <div class="reorder-toast" role="status" aria-live="polite">
    <CircleNotch size={14} weight="light" class="anim-spin" />
    <span class="reorder-text">
      Reordering {downloadStore.reorderProgress.current + 1}/{downloadStore.reorderProgress.total}
      <span class="reorder-chapter">{downloadStore.reorderProgress.chapterName}</span>
    </span>
    <button class="reorder-cancel" onclick={() => downloadStore.cancelReorder()} title="Cancel reorder">
      <X size={12} weight="bold" />
    </button>
  </div>
{/if}

<style>
  .root { display: flex; flex-direction: column; height: 100%; overflow: hidden; animation: fadeIn 0.14s ease both; }

  .header         { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-6); border-bottom: 1px solid var(--border-dim); flex-shrink: 0; }
  .heading        { font-family: var(--font-ui); font-size: var(--text-xs); font-weight: var(--weight-normal); color: var(--text-faint); letter-spacing: var(--tracking-wider); text-transform: uppercase; }
  .header-actions { display: flex; align-items: center; gap: var(--sp-2); }

  .storage-warning {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    color: var(--color-warning);
    flex-shrink: 0;
  }

  .bar-wrap   { padding: var(--sp-4) var(--sp-6); flex-shrink: 0; }
  .status-bar { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: var(--radius-md); box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: default; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-faint); flex-shrink: 0; transition: background var(--t-base); }
  .status-dot.active { background: var(--accent); animation: pulse 1.6s ease infinite; }
  .status-text { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); flex: 1; letter-spacing: var(--tracking-wide); }
  .status-right { display: flex; align-items: center; gap: var(--sp-2); margin-left: auto; }
  .status-eta   { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--accent-fg); letter-spacing: var(--tracking-wide); }
  .status-count { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); }

  .sel-controls   { display: flex; align-items: center; gap: var(--sp-2); }
  .bar-sep        { width: 1px; height: 12px; background: var(--border-dim); flex-shrink: 0; }
  .sel-action-btn { display: flex; align-items: center; gap: 4px; font-family: var(--font-ui); font-size: var(--text-xs); padding: 3px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-dim); background: var(--bg-overlay); color: var(--text-muted); cursor: pointer; transition: color var(--t-base), border-color var(--t-base), background var(--t-base); white-space: nowrap; }
  .sel-action-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); }
  .sel-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .sel-action-danger:hover:not(:disabled) { color: var(--color-error); border-color: color-mix(in srgb, var(--color-error) 40%, transparent); background: color-mix(in srgb, var(--color-error) 8%, transparent); }

  .content { flex: 1; overflow-y: auto; padding: 0 var(--sp-6) var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-4); }

  .icon-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius-md); border: 1px solid var(--border-dim); background: var(--bg-raised); color: var(--text-faint); cursor: pointer; flex-shrink: 0; transition: color var(--t-base), border-color var(--t-base), background var(--t-base); }
  .icon-btn:hover:not(:disabled):not(.active) { color: var(--text-primary); border-color: var(--border-strong); }
  .icon-btn.active:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-muted); }
  .icon-btn:disabled { opacity: 0.3; cursor: default; }
  .icon-btn.loading { border-color: var(--accent-dim); color: var(--accent-fg); background: var(--accent-muted); }
  .icon-btn.active  { border-color: var(--accent-dim); color: var(--accent-fg); background: var(--accent-muted); }

  .move-step { display: flex; align-items: center; border: 1px solid var(--border-dim); border-radius: var(--radius-sm); overflow: hidden; }
  .move-step .sel-action-btn { border: none; border-radius: 0; background: none; padding: 3px 6px; }
  .move-step .sel-action-btn:hover:not(:disabled) { background: var(--bg-overlay); border-color: transparent; }
  .move-input { width: 28px; background: none; border: none; border-left: 1px solid var(--border-dim); border-right: 1px solid var(--border-dim); color: var(--text-muted); font-family: var(--font-ui); font-size: var(--text-xs); text-align: center; padding: 2px 0; outline: none; -moz-appearance: textfield; appearance: textfield; }
  .move-input::-webkit-outer-spin-button, .move-input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .move-input:focus { color: var(--text-primary); }

  .modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.12s ease both;
  }
  .modal-card {
    background: var(--bg-surface); border: 1px solid var(--border-base);
    border-radius: var(--radius-lg); width: 340px; max-width: 90vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .modal-header { padding: var(--sp-4) var(--sp-4) var(--sp-2); }
  .modal-title  { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); }
  .modal-body   { padding: 0 var(--sp-4) var(--sp-4); }
  .modal-msg    { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); line-height: 1.4; margin: 0; }
  .modal-actions {
    display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--border-dim); background: var(--bg-raised);
  }
  .btn-cancel, .btn-danger {
    font-family: var(--font-ui); font-size: var(--text-xs); letter-spacing: var(--tracking-wide);
    padding: 5px 12px; border-radius: var(--radius-sm); cursor: pointer;
    transition: background var(--t-base), color var(--t-base), border-color var(--t-base);
  }
  .btn-cancel { border: 1px solid var(--border-dim); background: none; color: var(--text-muted); }
  .btn-cancel:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .btn-danger {
    border: 1px solid color-mix(in srgb, var(--color-error) 40%, transparent);
    background: var(--color-error-bg); color: var(--color-error);
  }
  .btn-danger:hover {
    background: color-mix(in srgb, var(--color-error) 20%, transparent);
    border-color: var(--color-error);
  }

  @keyframes pulse  { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

  .reorder-toast {
    position: fixed; bottom: var(--sp-6); right: var(--sp-6); z-index: 900;
    display: flex; align-items: center; gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-4);
    background: var(--bg-surface); border: 1px solid var(--border-strong);
    border-radius: var(--radius-md); box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: fadeIn 0.12s ease both;
    color: var(--text-muted);
  }
  .reorder-text {
    font-family: var(--font-ui); font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide); white-space: nowrap;
    display: inline-flex; align-items: center; gap: var(--sp-2);
  }
  .reorder-chapter {
    color: var(--text-faint); max-width: 200px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .reorder-cancel {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: var(--radius-sm);
    border: 1px solid var(--border-dim); background: none;
    color: var(--text-faint); cursor: pointer; flex-shrink: 0;
    transition: color var(--t-base), border-color var(--t-base), background var(--t-base);
  }
  .reorder-cancel:hover { color: var(--color-error); border-color: color-mix(in srgb, var(--color-error) 40%, transparent); background: color-mix(in srgb, var(--color-error) 8%, transparent); }
</style>