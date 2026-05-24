<script lang="ts">
  import { appState } from '$lib/state/app.svelte'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
  import { historyState } from '$lib/state/history.svelte'
  import {
    buildAppDataBackup,
    downloadAppDataBackup,
    parseAppDataBackup,
    pickAppDataBackupFile,
  } from '$lib/core/backup'
  import { isSupported } from '$lib/platform-service'
  import { savePersistentState } from '$lib/core/persistence/persist'

  let exportBusy = $state(false)
  let importBusy = $state(false)
  let backupError = $state<string | null>(null)
  let backupMsg = $state<string | null>(null)

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

  async function handleExport() {
    exportBusy = true
    backupError = null
    backupMsg = null

    try {
      if (isTauri && isSupported('filesystem')) {
        // Tauri-native export via invoke not yet wired — fall through to web path
        const backup = buildAppDataBackup(settingsState, {
          history: historyState.history,
          bookmarks: historyState.bookmarks,
          markers: historyState.markers,
          readLog: historyState.readLog,
          readingStats: historyState.readingStats as unknown as Record<string, unknown>,
          dailyReadCounts: historyState.dailyReadCounts,
        })
        downloadAppDataBackup(backup)
        backupMsg = 'Backup downloaded.'
      } else {
        const backup = buildAppDataBackup(settingsState, {
          history: historyState.history,
          bookmarks: historyState.bookmarks,
          markers: historyState.markers,
          readLog: historyState.readLog,
          readingStats: historyState.readingStats as unknown as Record<string, unknown>,
          dailyReadCounts: historyState.dailyReadCounts,
        })
        downloadAppDataBackup(backup)
        backupMsg = 'Backup downloaded.'
      }

      setTimeout(() => (backupMsg = null), 3000)
    } catch (error: unknown) {
      if (String(error).includes('Cancelled') || String(error).includes('AbortError')) {
        // user cancelled
      } else {
        backupError = error instanceof Error ? error.message : String(error)
      }
    } finally {
      exportBusy = false
    }
  }

  async function handleImport() {
    importBusy = true
    backupError = null
    backupMsg = null

    try {
      // Tauri-native import handled below — same web path works

      const file = await pickAppDataBackupFile()
      if (!file) return

      const text = await file.text()
      const backup = parseAppDataBackup(text)

      await Promise.all([
        savePersistentState('settings', {
          settings: backup.settings,
          storeVersion: 1,
        }),
        savePersistentState('history', backup.history),
      ])

      backupMsg = 'Import complete — reloading in 3 seconds…'
      setTimeout(() => window.location.reload(), 3000)
    } catch (error: unknown) {
      if (String(error).includes('Cancelled') || String(error).includes('AbortError')) {
        // user cancelled
      } else {
        backupError = error instanceof Error ? error.message : String(error)
      }
    } finally {
      importBusy = false
    }
  }
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

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">App data backup</div>
        <div class="settings-desc">Export or import Moku settings and reading history.</div>
      </div>
      <div class="settings-inline-control">
        <button class="settings-button" type="button" onclick={handleExport} disabled={exportBusy}>
          {exportBusy ? 'Exporting…' : 'Export backup'}
        </button>
        <button class="settings-button" type="button" onclick={handleImport} disabled={importBusy}>
          {importBusy ? 'Importing…' : 'Import backup'}
        </button>
      </div>
    </div>

    {#if backupMsg}
      <p class="settings-feedback-ok">{backupMsg}</p>
    {/if}

    {#if backupError}
      <p class="settings-feedback-error">{backupError}</p>
    {/if}
  </div>
</section>