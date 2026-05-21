<script lang="ts">
  import HistoryPanel from "./HistoryPanel.svelte";
  import UpdatesPanel from "./UpdatesPanel.svelte";

  type RecentTab = "updates" | "history";
  let tab = $state<RecentTab>("updates");
</script>

<div class="root anim-fade-in">
  <div class="header">
    <span class="heading">Recent</span>
    <div class="tabs">
      <button class="tab" class:active={tab === "updates"} onclick={() => tab = "updates"}>
        Updates
      </button>
      <button class="tab" class:active={tab === "history"} onclick={() => tab = "history"}>
        Reading history
      </button>
    </div>
  </div>

  <div class="content">
    {#if tab === "updates"}
      <UpdatesPanel />
    {:else}
      <HistoryPanel />
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
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-6);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .heading {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
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

  .content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
