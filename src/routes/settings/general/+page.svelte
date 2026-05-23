<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  let advancedOpen = $state(false)
  const idleChoices = [0, 1, 2, 5, 10, 15, 30]
</script>

<svelte:head>
  <title>Settings - General</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">General</p>
    <h2>Application basics</h2>
    <p>Core behavior, server connection, and desktop shell preferences.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">Interface scale</div>
        <div class="settings-desc">Scale the whole app UI.</div>
      </div>
      <div class="settings-inline-control">
        <input
          class="settings-slider"
          type="range"
          min="50"
          max="200"
          step="5"
          value={Math.round((settingsState.uiZoom ?? 1) * 100)}
          oninput={(event) => updateSettings({uiZoom: Number((event.currentTarget as HTMLInputElement).value) / 100})}
        />
        <input
          class="settings-input settings-input-narrow"
          type="number"
          min="50"
          max="200"
          value={Math.round((settingsState.uiZoom ?? 1) * 100)}
          oninput={(event) => updateSettings({uiZoom: Number((event.currentTarget as HTMLInputElement).value) / 100})}
        />
        <button class="settings-button" type="button" onclick={() => updateSettings({uiZoom: 1})}>Reset</button>
      </div>
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Server URL</div>
        <div class="settings-desc">Base URL for the Suwayomi server.</div>
      </div>
      <input
        class="settings-input settings-input-wide"
        spellcheck="false"
        value={settingsState.serverUrl}
        oninput={(event) => updateSettings({serverUrl: (event.currentTarget as HTMLInputElement).value})}
      />
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Auto-start server</div>
        <div class="settings-desc">Launch the server when Moku starts.</div>
      </div>
      <input type="checkbox" checked={settingsState.autoStartServer} onchange={() => updateSettings({autoStartServer: !settingsState.autoStartServer})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Suwayomi Web UI</div>
        <div class="settings-desc">Keep the server's web UI enabled alongside Moku.</div>
      </div>
      <input type="checkbox" checked={settingsState.suwayomiWebUI} onchange={() => updateSettings({suwayomiWebUI: !settingsState.suwayomiWebUI})} />
    </label>

    <div class="settings-row settings-row-stack">
      <div class="settings-row-head">
        <div>
          <div class="settings-label">Advanced server options</div>
          <div class="settings-desc">Custom binary path and launch args.</div>
        </div>
        <button class="settings-button" type="button" onclick={() => advancedOpen = !advancedOpen}>{advancedOpen ? 'Hide' : 'Show'}</button>
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
              oninput={(event) => updateSettings({serverBinary: (event.currentTarget as HTMLInputElement).value})}
            />
          </label>
          <label class="settings-mini-row">
            <span class="settings-label">Server args</span>
            <input
              class="settings-input settings-input-wide"
              spellcheck="false"
              placeholder=""
              value={settingsState.serverBinaryArgs}
              oninput={(event) => updateSettings({serverBinaryArgs: (event.currentTarget as HTMLInputElement).value})}
            />
          </label>
        </div>
      {/if}
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Idle screen timeout</div>
        <div class="settings-desc">Show the splash screen after inactivity.</div>
      </div>
      <select class="settings-select" value={String(settingsState.idleTimeoutMin ?? 5)} onchange={(event) => updateSettings({idleTimeoutMin: Number((event.currentTarget as HTMLSelectElement).value)})}>
        {#each idleChoices as minutes}
          <option value={String(minutes)}>{minutes === 0 ? 'Never' : `${minutes} min`}</option>
        {/each}
      </select>
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Close button behavior</div>
        <div class="settings-desc">Choose what the window close button does.</div>
      </div>
      <select class="settings-select" value={settingsState.closeAction} onchange={(event) => updateSettings({closeAction: (event.currentTarget as HTMLSelectElement).value as 'ask' | 'tray' | 'quit'})}>
        <option value="ask">Ask</option>
        <option value="tray">Tray</option>
        <option value="quit">Quit</option>
      </select>
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Discord Rich Presence</div>
        <div class="settings-desc">Show what you're reading in Discord.</div>
      </div>
      <input type="checkbox" checked={settingsState.discordRpc} onchange={() => updateSettings({discordRpc: !settingsState.discordRpc})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">QOL animations</div>
        <div class="settings-desc">Enable small hover and transition effects.</div>
      </div>
      <input type="checkbox" checked={settingsState.qolAnimations} onchange={() => updateSettings({qolAnimations: !settingsState.qolAnimations})} />
    </label>

    <div class="settings-row">
      <div>
        <div class="settings-label">Preferred source language</div>
        <div class="settings-desc">Used for search defaults and source sorting.</div>
      </div>
      <input
        class="settings-input settings-input-narrow"
        spellcheck="false"
        value={settingsState.preferredExtensionLang}
        oninput={(event) => updateSettings({preferredExtensionLang: (event.currentTarget as HTMLInputElement).value.trim().toLowerCase()})}
      />
    </div>
  </div>
</section>