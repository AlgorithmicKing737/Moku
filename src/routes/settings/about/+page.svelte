<script lang="ts">
  import pkg from '../../../../package.json'
  import { appState } from '$lib/state/app.svelte'
  import { settingsState } from '$lib/state/settings.svelte'
  import { trackingState } from '$lib/state/tracking.svelte'
  import { checkForAppUpdate, installAppUpdate, isSupported } from '$lib/platform-service'
  import type { AppUpdateInfo } from '$lib/platform-adapters/types'

  const appVersion = pkg.version as string

  let updateInfo = $state<AppUpdateInfo | null>(null)
  let updateChecking = $state(false)
  let updateInstalling = $state(false)
  let updateError = $state<string | null>(null)
  let updateDone = $state(false)

  const canCheckUpdates = typeof window !== 'undefined' && (() => {
    try { return isSupported('app-updates') } catch { return false }
  })()

  async function handleCheckUpdate() {
    updateChecking = true
    updateError = null
    updateInfo = null
    updateDone = false

    try {
      updateInfo = await checkForAppUpdate()
    } catch (error: unknown) {
      updateError = error instanceof Error ? error.message : String(error)
    } finally {
      updateChecking = false
    }
  }

  async function handleInstallUpdate() {
    if (!updateInfo) return

    updateInstalling = true
    updateError = null

    try {
      await installAppUpdate()
      updateDone = true
    } catch (error: unknown) {
      updateError = error instanceof Error ? error.message : String(error)
    } finally {
      updateInstalling = false
    }
  }
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
      {#if canCheckUpdates}
        <button class="settings-button" type="button" onclick={handleCheckUpdate} disabled={updateChecking}>
          {updateChecking ? 'Checking…' : 'Check for updates'}
        </button>
      {/if}
    </div>

    {#if updateInfo}
      <div class="settings-row">
        <div>
          <div class="settings-label">Update available</div>
          <div class="settings-desc">v{updateInfo.version}</div>
        </div>
        <button class="settings-button" type="button" onclick={handleInstallUpdate} disabled={updateInstalling}>
          {updateInstalling ? 'Installing…' : 'Install now'}
        </button>
      </div>
    {:else if updateChecking === false && updateError === null && updateInfo === null && updateDone === false && canCheckUpdates}
      <!-- idle, no explicit "up to date" message unless user just clicked -->
    {/if}

    {#if updateDone}
      <p class="settings-feedback-ok">Update installed — please restart Moku.</p>
    {/if}

    {#if updateError}
      <p class="settings-feedback-error">{updateError}</p>
    {/if}

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