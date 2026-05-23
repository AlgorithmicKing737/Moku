<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const levels = [
    ['strict', 'Strict'],
    ['moderate', 'Moderate'],
    ['unrestricted', 'Unrestricted'],
  ] as const

  function splitIds(value: string) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
</script>

<svelte:head>
  <title>Settings - Content</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Content</p>
    <h2>Content filtering and source overrides</h2>
    <p>Control the overall content level and any per-source exceptions.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Content level</div>
        <select class="settings-select" value={settingsState.contentLevel} onchange={(event) => updateSettings({contentLevel: (event.currentTarget as HTMLSelectElement).value as 'strict' | 'moderate' | 'unrestricted'})}>
          {#each levels as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>

      <label class="settings-toggle-row">
        <div>
          <div class="settings-label">Per-source overrides</div>
          <div class="settings-desc">Allow explicit source allow/block exceptions.</div>
        </div>
        <input type="checkbox" checked={settingsState.sourceOverridesEnabled} onchange={() => updateSettings({sourceOverridesEnabled: !settingsState.sourceOverridesEnabled})} />
      </label>
    </div>

    {#if settingsState.sourceOverridesEnabled}
      <label class="settings-row">
        <div>
          <div class="settings-label">Allowed source IDs</div>
          <div class="settings-desc">Comma-separated source IDs allowed through the current filter.</div>
        </div>
        <input class="settings-input settings-input-wide" value={settingsState.nsfwAllowedSourceIds.join(', ')} oninput={(event) => updateSettings({nsfwAllowedSourceIds: splitIds((event.currentTarget as HTMLInputElement).value)})} />
      </label>

      <label class="settings-row">
        <div>
          <div class="settings-label">Blocked source IDs</div>
          <div class="settings-desc">Comma-separated source IDs to always block.</div>
        </div>
        <input class="settings-input settings-input-wide" value={settingsState.nsfwBlockedSourceIds.join(', ')} oninput={(event) => updateSettings({nsfwBlockedSourceIds: splitIds((event.currentTarget as HTMLInputElement).value)})} />
      </label>
    {/if}
  </div>
</section>