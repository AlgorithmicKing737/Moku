<script lang="ts">
  import { mountSystemThemeSync } from '$lib/core/theme'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const builtinThemes = [
    ['original', 'Original', '#101010', '#151515', '#a8c4a8'],
    ['dark', 'Dark', '#080808', '#111111', '#bcd8bc'],
    ['light', 'Light', '#f4f2ee', '#faf8f4', '#2a5a2a'],
    ['midnight', 'Midnight', '#0c1020', '#101428', '#a8b4e8'],
    ['warm', 'Warm', '#16130c', '#1c1810', '#e0b860'],
  ] as const

  const allThemes = $derived([
    ...builtinThemes.map(([id, label]) => ({id, label})),
    ...settingsState.customThemes.map((theme) => ({id: theme.id, label: theme.name})),
  ])

  function chooseTheme(id: string) {
    updateSettings({theme: id})
  }

  function toggleSystemSync() {
    updateSettings({systemThemeSync: !settingsState.systemThemeSync})
    mountSystemThemeSync()
  }
</script>

<svelte:head>
  <title>Settings - Appearance</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Appearance</p>
    <h2>Theme and color behavior</h2>
    <p>Choose the app theme and optional system theme sync.</p>
  </header>

  <div class="settings-card">
    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Match system theme</div>
        <div class="settings-desc">Switch between light and dark themes automatically.</div>
      </div>
      <input type="checkbox" checked={settingsState.systemThemeSync} onchange={toggleSystemSync} />
    </label>

    {#if settingsState.systemThemeSync}
      <div class="settings-row settings-grid-2">
        <label>
          <div class="settings-label">Dark theme</div>
          <select class="settings-select" value={settingsState.systemThemeDark} onchange={(event) => { updateSettings({systemThemeDark: (event.currentTarget as HTMLSelectElement).value}); mountSystemThemeSync(); }}>
            {#each allThemes as theme}
              <option value={theme.id}>{theme.label}</option>
            {/each}
          </select>
        </label>
        <label>
          <div class="settings-label">Light theme</div>
          <select class="settings-select" value={settingsState.systemThemeLight} onchange={(event) => { updateSettings({systemThemeLight: (event.currentTarget as HTMLSelectElement).value}); mountSystemThemeSync(); }}>
            {#each allThemes as theme}
              <option value={theme.id}>{theme.label}</option>
            {/each}
          </select>
        </label>
      </div>
    {/if}

    <div class="settings-theme-grid">
      {#each builtinThemes as [id, label, bg, surface, accent]}
        <button class="settings-theme-card" class:active={settingsState.theme === id} type="button" onclick={() => chooseTheme(id)}>
          <span class="settings-theme-preview" style={`--theme-bg:${bg};--theme-surface:${surface};--theme-accent:${accent};`}></span>
          <span class="settings-theme-info">
            <span class="settings-label">{label}</span>
            <span class="settings-desc">Built-in theme</span>
          </span>
        </button>
      {/each}

      {#each settingsState.customThemes as theme}
        <button class="settings-theme-card" class:active={settingsState.theme === theme.id} type="button" onclick={() => chooseTheme(theme.id)}>
          <span class="settings-theme-preview" style={`--theme-bg:${theme.tokens['bg-base']};--theme-surface:${theme.tokens['bg-surface']};--theme-accent:${theme.tokens['accent']};`}></span>
          <span class="settings-theme-info">
            <span class="settings-label">{theme.name}</span>
            <span class="settings-desc">Custom theme</span>
          </span>
        </button>
      {/each}
    </div>
  </div>
</section>