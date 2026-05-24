<script lang="ts">
  import { page } from '$app/stores'

  const sections = [
    ['general', 'General'],
    ['server', 'Server'],
    ['appearance', 'Appearance'],
    ['reader', 'Reader'],
    ['library', 'Library'],
    ['automation', 'Automation'],
    ['performance', 'Performance'],
    ['keybinds', 'Keybinds'],
    ['storage', 'Storage'],
    ['folders', 'Folders'],
    ['tracking', 'Tracking'],
    ['security', 'Security'],
    ['content', 'Content'],
    ['about', 'About'],
    ['devtools', 'Devtools'],
  ] as const

  let { children } = $props()

  const activeSection = $derived(
    sections.find(([section]) => $page.url.pathname === `/settings/${section}`)?.[0] ?? 'general'
  )
</script>

<div class="settings-shell">
  <aside class="settings-nav-panel">
    <div class="settings-nav-header">
      <p class="settings-kicker">Preferences</p>
      <h1>Settings</h1>
      <p class="settings-nav-copy">Route-driven sections backed by shared state.</p>
    </div>

    <nav class="settings-nav" aria-label="Settings sections">
      {#each sections as [section, label]}
        <a
          class="settings-nav-link"
          class:active={activeSection === section}
          href={`/settings/${section}`}
          aria-current={activeSection === section ? 'page' : undefined}
        >
          {label}
        </a>
      {/each}
    </nav>
  </aside>

  <main class="settings-main">
    {@render children()}
  </main>
</div>

<style>
  :global(.settings-shell) {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-base) 82%, transparent), var(--bg-surface));
  }

  :global(.settings-nav-panel) {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-right: 1px solid var(--border-dim);
    background: color-mix(in srgb, var(--bg-base) 94%, black);
    padding: var(--sp-5) var(--sp-4);
    overflow: hidden;
  }

  :global(.settings-nav-header) {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: var(--sp-4);
  }

  :global(.settings-kicker) {
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  :global(.settings-nav-header h1) {
    margin: 0;
    font-size: 1.45rem;
    color: var(--text-primary);
  }

  :global(.settings-nav-copy) {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  :global(.settings-nav) {
    display: grid;
    gap: 0.35rem;
    overflow: auto;
    padding-right: 0.25rem;
  }

  :global(.settings-nav-link) {
    display: flex;
    align-items: center;
    min-height: 38px;
    padding: 0.55rem 0.8rem;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    text-decoration: none;
    transition: background var(--t-base), color var(--t-base), transform var(--t-base);
  }

  :global(.settings-nav-link:hover) {
    background: var(--bg-raised);
    color: var(--text-secondary);
  }

  :global(.settings-nav-link.active) {
    background: var(--accent-muted);
    color: var(--accent-fg);
  }

  :global(.settings-main) {
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding: var(--sp-6);
  }

  :global(.settings-page) {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    max-width: 1100px;
    margin: 0 auto;
  }

  :global(.settings-page-header) {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  :global(.settings-page-header h2) {
    margin: 0;
    font-size: 1.8rem;
    color: var(--text-primary);
  }

  :global(.settings-page-header p) {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.5;
  }

  :global(.settings-card) {
    display: flex;
    flex-direction: column;
    gap: 1px;
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-xl);
    overflow: hidden;
    background: var(--bg-base);
  }

  :global(.settings-row) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5);
    background: var(--bg-surface);
  }

  :global(.settings-row-stack) {
    flex-direction: column;
    align-items: stretch;
  }

  :global(.settings-row-head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
  }

  :global(.settings-toggle-row) {
    align-items: center;
  }

  :global(.settings-grid-2) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-4);
  }

  :global(.settings-grid-2 > label) {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  :global(.settings-inline-control) {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  :global(.settings-subcard) {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-lg);
    background: var(--bg-base);
  }

  :global(.settings-mini-row) {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  :global(.settings-label) {
    color: var(--text-primary);
    font-weight: 600;
  }

  :global(.settings-desc) {
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  :global(.settings-input),
  :global(.settings-select) {
    min-height: 40px;
    padding: 0.55rem 0.8rem;
    border: 1px solid var(--border-base);
    border-radius: var(--radius-md);
    background: var(--bg-overlay);
    color: var(--text-primary);
    outline: none;
  }

  :global(.settings-input:focus),
  :global(.settings-select:focus) {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--border-focus) 25%, transparent);
  }

  :global(.settings-input-wide) {
    width: min(100%, 480px);
  }

  :global(.settings-input-narrow) {
    width: 96px;
    text-align: center;
  }

  :global(.settings-slider) {
    width: min(320px, 100%);
    accent-color: var(--accent);
  }

  :global(.settings-button) {
    min-height: 40px;
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--border-base);
    border-radius: var(--radius-md);
    background: var(--bg-overlay);
    color: var(--text-secondary);
    cursor: pointer;
  }

  :global(.settings-button:hover) {
    border-color: var(--border-strong);
    background: var(--bg-raised);
  }

  :global(.settings-theme-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--sp-3);
    padding: var(--sp-4);
    background: var(--bg-surface);
  }

  :global(.settings-theme-card) {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border: 1px solid var(--border-base);
    border-radius: var(--radius-lg);
    background: var(--bg-base);
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  :global(.settings-theme-card.active) {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent);
  }

  :global(.settings-theme-preview) {
    display: block;
    height: 72px;
    border-radius: var(--radius-md);
    background:
      linear-gradient(135deg, var(--theme-bg), var(--theme-surface)),
      linear-gradient(135deg, var(--theme-bg), var(--theme-surface));
    position: relative;
    overflow: hidden;
  }

  :global(.settings-theme-preview)::after {
    content: '';
    position: absolute;
    inset: 14px 14px 14px 38px;
    border-radius: 10px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--theme-accent) 82%, white), color-mix(in srgb, var(--theme-accent) 40%, transparent));
    opacity: 0.86;
  }

  :global(.settings-theme-info) {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  @media (max-width: 760px) {
    :global(.settings-grid-2) {
      grid-template-columns: 1fr;
    }

    :global(.settings-row),
    :global(.settings-row-head) {
      flex-direction: column;
      align-items: stretch;
    }

    :global(.settings-inline-control) {
      justify-content: stretch;
    }
  }

  @media (max-width: 920px) {
    :global(.settings-shell) {
      grid-template-columns: 1fr;
    }

    :global(.settings-nav-panel) {
      border-right: none;
      border-bottom: 1px solid var(--border-dim);
    }
  }
</style>