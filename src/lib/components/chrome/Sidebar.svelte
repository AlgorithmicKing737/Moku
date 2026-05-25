<script lang="ts">
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { app } from '$lib/state/app.svelte'
  import {
    House, Books, MagnifyingGlass, ClockCounterClockwise,
    DownloadSimple, PuzzlePiece, GearSix, ChartLineUp,
  } from 'phosphor-svelte'
  import logoUrl from '$lib/assets/moku-icon-wordmark.svg'

  const TABS = [
    { path: '/',           label: 'Home',       icon: House },
    { path: '/library',    label: 'Library',    icon: Books },
    { path: '/browse',     label: 'Browse',     icon: MagnifyingGlass },
    { path: '/downloads',  label: 'Downloads',  icon: DownloadSimple },
    { path: '/extensions', label: 'Extensions', icon: PuzzlePiece },
    { path: '/tracking',   label: 'Tracking',   icon: ChartLineUp },
  ] as const

  const TAB_SIZE = 36
  const TAB_GAP  = 4

  const activeIndex = $derived(
    TABS.findIndex(t => {
      if (t.path === '/') return $page.url.pathname === '/'
      return $page.url.pathname.startsWith(t.path)
    })
  )

  const indicatorY = $derived(activeIndex * (TAB_SIZE + TAB_GAP))
</script>

<aside class="root">
  <button class="logo" onclick={() => goto('/')} title="Home" aria-label="Go to Home">
    <div class="logo-icon" style="mask-image: url({logoUrl}); -webkit-mask-image: url({logoUrl})"></div>
  </button>

  <nav class="nav">
    {#if activeIndex >= 0}
      <div class="indicator" style="transform: translateX(-50%) translateY({indicatorY}px)"></div>
    {/if}
    {#each TABS as tab}
      <button
        class="tab"
        class:active={activeIndex === TABS.indexOf(tab)}
        title={tab.label}
        onclick={() => goto(tab.path)}
      >
        <tab.icon size={18} weight="light" />
      </button>
    {/each}
  </nav>

  <div class="bottom">
    <button class="settings-btn" onclick={() => app.setSettingsOpen(true)} title="Settings">
      <GearSix size={18} weight="light" />
    </button>
  </div>
</aside>

<style>
  .root {
    width: var(--sidebar-width);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--sp-4) 0;
    height: 100%;
    border-right: 1px solid var(--border-dim);
    overflow: hidden;
  }

  .logo {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--sp-4);
    border-radius: var(--radius-lg);
    transition: opacity var(--t-base), transform var(--t-base);
  }
  .logo:hover            { opacity: 0.8; transform: scale(0.96); }
  .logo:active           { transform: scale(0.92); }
  .logo:focus-visible    { outline: 2px solid var(--accent); outline-offset: 2px; }

  .logo-icon {
    width: 28px;
    height: 28px;
    background-color: var(--accent);
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    filter: drop-shadow(0 0 8px rgba(107,143,107,0.35));
    pointer-events: none;
  }

  .nav {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 0 var(--sp-2);
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }
  .nav::-webkit-scrollbar { display: none; }

  .indicator {
    position: absolute;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--accent-muted);
    pointer-events: none;
    top: 0;
    left: 50%;
    z-index: 0;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .tab {
    position: relative;
    z-index: 1;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-faint);
    transition: color var(--t-base), background var(--t-base);
  }
  .tab:hover          { color: var(--text-muted); background: var(--bg-raised); }
  .tab:active         { transform: scale(0.88); }
  .tab:focus-visible  { outline: 2px solid var(--accent); outline-offset: -2px; }
  .tab.active         { color: var(--accent-fg); }
  .tab.active:hover   { background: transparent; }

  .bottom {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: var(--sp-3) var(--sp-2) 0;
    border-top: 1px solid var(--border-dim);
    margin-top: var(--sp-3);
  }

  .settings-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-faint);
    transition: color var(--t-base), background var(--t-base), transform var(--t-slow);
  }
  .settings-btn:hover         { color: var(--text-muted); background: var(--bg-raised); transform: rotate(30deg); }
  .settings-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
</style>
