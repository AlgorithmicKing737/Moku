<script lang="ts">
  import pkg from '../../../../package.json'
  import { settingsState } from '$lib/state/settings.svelte'
  import { trackingState } from '$lib/state/tracking.svelte'

  const appVersion = pkg.version as string
</script>

<svelte:head>
  <title>Settings - About</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">About</p>
    <h2>Build and app information</h2>
    <p>Static app details and a quick summary of the connected server.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">Moku</div>
        <div class="settings-desc">Version {appVersion}</div>
      </div>
    </div>

    <div class="settings-row settings-grid-2">
      <div>
        <div class="settings-label">Server URL</div>
        <div class="settings-desc">{settingsState.serverUrl}</div>
      </div>
      <div>
        <div class="settings-label">Tracker count</div>
        <div class="settings-desc">{trackingState.trackers.length} trackers loaded</div>
      </div>
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Project</div>
        <div class="settings-desc">A manga reader frontend for Suwayomi / Tachidesk.</div>
      </div>
    </div>
  </div>
</section>