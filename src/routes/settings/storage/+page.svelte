<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
</script>

<svelte:head>
  <title>Settings - Storage</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Storage</p>
    <h2>Paths and limits</h2>
    <p>Control where Moku stores downloads and local sources.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">Storage limit</div>
        <div class="settings-desc">Maximum local storage in gigabytes. Leave blank for no limit.</div>
      </div>
      <input class="settings-input settings-input-narrow" type="number" min="0" step="1" value={settingsState.storageLimitGb ?? ''} oninput={(event) => { const value = (event.currentTarget as HTMLInputElement).value; updateSettings({storageLimitGb: value === '' ? null : Number(value)}); }} />
    </div>

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Downloads path</div>
        <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.serverDownloadsPath} oninput={(event) => updateSettings({serverDownloadsPath: (event.currentTarget as HTMLInputElement).value})} />
      </label>

      <label>
        <div class="settings-label">Local source path</div>
        <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.serverLocalSourcePath} oninput={(event) => updateSettings({serverLocalSourcePath: (event.currentTarget as HTMLInputElement).value})} />
      </label>
    </div>
  </div>
</section>