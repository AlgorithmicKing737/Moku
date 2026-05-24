<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  let advancedOpen = $state(false)
</script>

<svelte:head>
  <title>Settings - Server</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Server</p>
    <h2>Server connection</h2>
    <p>Configure the Suwayomi server URL, launch behavior, and file paths.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">Server URL</div>
        <div class="settings-desc">Base URL for the Suwayomi server.</div>
      </div>
      <input
        class="settings-input settings-input-wide"
        spellcheck="false"
        value={settingsState.serverUrl}
        oninput={(event) => updateSettings({ serverUrl: (event.currentTarget as HTMLInputElement).value })}
      />
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Auto-start server</div>
        <div class="settings-desc">Launch the server when Moku starts.</div>
      </div>
      <input
        type="checkbox"
        checked={settingsState.autoStartServer}
        onchange={() => updateSettings({ autoStartServer: !settingsState.autoStartServer })}
      />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Suwayomi Web UI</div>
        <div class="settings-desc">Keep the server's web UI enabled alongside Moku.</div>
      </div>
      <input
        type="checkbox"
        checked={settingsState.suwayomiWebUI}
        onchange={() => updateSettings({ suwayomiWebUI: !settingsState.suwayomiWebUI })}
      />
    </label>

    <div class="settings-row settings-row-stack">
      <div class="settings-row-head">
        <div>
          <div class="settings-label">Advanced launch options</div>
          <div class="settings-desc">Custom binary path and launch args.</div>
        </div>
        <button class="settings-button" type="button" onclick={() => (advancedOpen = !advancedOpen)}>
          {advancedOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      {#if advancedOpen}
        <div class="settings-subcard">
          <label class="settings-mini-row">
            <span class="settings-label">Server binary</span>
            <input
              class="settings-input settings-input-wide"
              spellcheck="false"
              placeholder="auto-detect"
              value={settingsState.serverBinary}
              oninput={(event) => updateSettings({ serverBinary: (event.currentTarget as HTMLInputElement).value })}
            />
          </label>
          <label class="settings-mini-row">
            <span class="settings-label">Server args</span>
            <input
              class="settings-input settings-input-wide"
              spellcheck="false"
              placeholder=""
              value={settingsState.serverBinaryArgs}
              oninput={(event) => updateSettings({ serverBinaryArgs: (event.currentTarget as HTMLInputElement).value })}
            />
          </label>
        </div>
      {/if}
    </div>
  </div>

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">Downloads path</div>
        <div class="settings-desc">Directory where the server stores downloaded chapters.</div>
      </div>
      <input
        class="settings-input settings-input-wide"
        spellcheck="false"
        placeholder="server default"
        value={settingsState.serverDownloadsPath}
        oninput={(event) => updateSettings({ serverDownloadsPath: (event.currentTarget as HTMLInputElement).value })}
      />
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Local source path</div>
        <div class="settings-desc">Directory scanned for local manga sources.</div>
      </div>
      <input
        class="settings-input settings-input-wide"
        spellcheck="false"
        placeholder="server default"
        value={settingsState.serverLocalSourcePath}
        oninput={(event) => updateSettings({ serverLocalSourcePath: (event.currentTarget as HTMLInputElement).value })}
      />
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Extra scan directories</div>
        <div class="settings-desc">Comma-separated additional directories the server should scan.</div>
      </div>
      <input
        class="settings-input settings-input-wide"
        spellcheck="false"
        placeholder=""
        value={settingsState.extraScanDirs.join(', ')}
        oninput={(event) => {
          const raw = (event.currentTarget as HTMLInputElement).value
          updateSettings({ extraScanDirs: raw.split(',').map((s) => s.trim()).filter(Boolean) })
        }}
      />
    </div>
  </div>
</section>
