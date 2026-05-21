<script lang="ts">
  import { ArrowCircleUp, ArrowsClockwise, BookOpen, CircleNotch, MagnifyingGlass, NewspaperClipping, Trash } from "phosphor-svelte";
  import { store, clearHistory } from "@store/state.svelte";
  import HistoryPanel from "./HistoryPanel.svelte";
  import UpdatesPanel from "./UpdatesPanel.svelte";

  type RecentTab = "updates" | "history";
  let tab = $state<RecentTab>("updates");

  // History toolbar state
  let historySearch       = $state("");
  let historyConfirmClear = $state(false);

  function handleHistoryClear() {
    if (!historyConfirmClear) {
      historyConfirmClear = true;
      setTimeout(() => { historyConfirmClear = false; }, 3000);
      return;
    }
    clearHistory();
    historyConfirmClear = false;
  }

  // Updates toolbar state — bound to the child panel
  let updatesLoading    = $state(true);
  let updatesRefreshFn  = $state<(() => Promise<void>) | null>(null);
</script>

<div class="root anim-fade-in">
  <div class="header">
    <span class="heading">Recent</span>

    <div class="tabs">
      <button class="tab" class:active={tab === "updates"} onclick={() => tab = "updates"}>
        <NewspaperClipping size={11} weight="bold" />
        Updates
      </button>
      <button class="tab" class:active={tab === "history"} onclick={() => tab = "history"}>
        <BookOpen size={11} weight="bold" />
        Reading history
      </button>
    </div>

    <div class="header-right">
      {#if tab === "updates"}
        <button class="icon-btn" onclick={() => updatesRefreshFn?.()} disabled={updatesLoading} title="Refresh updates">
          {#if updatesLoading}
            <CircleNotch size={14} weight="light" class="anim-spin" />
          {:else}
            <ArrowsClockwise size={14} weight="bold" />
          {/if}
        </button>
      {:else}
        <div class="search-wrap">
          <MagnifyingGlass size={11} class="search-icon" weight="light" />
          <input
            class="search"
            placeholder="Search…"
            value={historySearch}
            oninput={(e) => historySearch = (e.target as HTMLInputElement).value}
          />
          {#if historySearch}
            <button class="search-clear" onclick={() => historySearch = ""}>×</button>
          {/if}
        </div>
        {#if store.history.length > 0}
          <button
            class="clear-btn"
            class:confirm={historyConfirmClear}
            onclick={handleHistoryClear}
            title={historyConfirmClear ? "Click again to confirm" : "Clear history"}
          >
            <Trash size={12} weight="light" />
            {#if historyConfirmClear}<span class="clear-label">Confirm?</span>{/if}
          </button>
        {/if}
      {/if}
    </div>
  </div>

  <div class="content">
    {#if tab === "updates"}
      <UpdatesPanel
        bind:loading={updatesLoading}
        onRegisterRefresh={(fn) => updatesRefreshFn = fn}
      />
    {:else}
      <HistoryPanel search={historySearch} confirmClear={historyConfirmClear} />
    {/if}
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .header {
    position: relative;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-6);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
    min-width: 0;
  }

  .heading {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-faint);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .tabs {
    display: flex;
    gap: 2px;
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    color: var(--text-faint);
    white-space: nowrap;
    transition: background var(--t-base), color var(--t-base), border-color var(--t-base);
    border: 1px solid transparent;
  }

  .tab:hover { color: var(--text-muted); }
  .tab.active { background: var(--accent-muted); color: var(--accent-fg); border-color: var(--accent-dim); }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin-left: auto;
    flex-shrink: 0;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
    color: var(--text-faint);
    cursor: pointer;
    transition: color var(--t-base), border-color var(--t-base), background var(--t-base);
  }
  .icon-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); }
  .icon-btn:disabled { opacity: 0.45; cursor: default; }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-wrap :global(.search-icon) {
    position: absolute;
    left: 8px;
    color: var(--text-faint);
    pointer-events: none;
  }

  .search {
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: 4px 26px;
    color: var(--text-primary);
    font-size: var(--text-xs);
    width: 148px;
    outline: none;
    transition: border-color var(--t-base), width var(--t-base), background var(--t-base);
  }
  .search::placeholder { color: var(--text-faint); }
  .search:focus { border-color: var(--border-strong); background: var(--bg-elevated); width: 200px; }

  .search-clear {
    position: absolute;
    right: 8px;
    color: var(--text-faint);
    font-size: 13px;
    line-height: 1;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    transition: color var(--t-base);
  }
  .search-clear:hover { color: var(--text-muted); }

  .clear-btn {
    display: flex; align-items: center; gap: 4px;
    height: 28px; padding: 0 var(--sp-2);
    border-radius: var(--radius-md); border: 1px solid var(--border-dim);
    background: var(--bg-raised); color: var(--text-faint);
    cursor: pointer; font-family: var(--font-ui); font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide); flex-shrink: 0;
    transition: color var(--t-base), background var(--t-base), border-color var(--t-base);
  }
  .clear-btn:hover { color: var(--color-error); background: var(--color-error-bg); border-color: color-mix(in srgb, var(--color-error) 30%, transparent); }
  .clear-btn.confirm { color: var(--color-error); background: var(--color-error-bg); border-color: var(--color-error); }
  .clear-label { font-size: var(--text-2xs); }

  .content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
