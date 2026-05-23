<script lang="ts">
  import { resetSettings, settingsState } from '$lib/state/settings.svelte'

  const themeCount = $derived(settingsState.customThemes.length)
  const prefsCount = $derived(Object.keys(settingsState.mangaPrefs).length)
</script>

<svelte:head>
  <title>Settings - Devtools</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Devtools</p>
    <h2>Diagnostics and reset tools</h2>
    <p>Basic internal state summaries and a safe settings reset button.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row settings-grid-2">
      <div>
        <div class="settings-label">Custom themes</div>
        <div class="settings-desc">{themeCount} stored theme definitions</div>
      </div>
      <div>
        <div class="settings-label">Custom manga prefs</div>
        <div class="settings-desc">{prefsCount} manga entries have overrides</div>
      </div>
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Reset all settings</div>
        <div class="settings-desc">Restore the entire settings object to defaults.</div>
      </div>
      <button class="settings-button" type="button" onclick={resetSettings}>Reset settings</button>
    </div>
  </div>
</section>