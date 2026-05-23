<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const downloadAheadOptions = [0, 2, 5, 10]
  const maxKeepOptions = [0, 5, 10, 25]
  const delayOptions = [0, 24, 168]
  const refreshOptions = ['daily', 'weekly', 'manual'] as const

  const defaults = $derived(settingsState.automationDefaults)

  function patchDefaults(patch: Partial<typeof defaults>) {
    updateSettings({automationDefaults: {...defaults, ...patch}})
  }
</script>

<svelte:head>
  <title>Settings - Automation</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Automation</p>
    <h2>Series automation defaults</h2>
    <p>These values are used when a manga has no per-series override.</p>
  </header>

  <div class="settings-card">
    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Enable automation</div>
        <div class="settings-desc">Allow automation rules to run at all.</div>
      </div>
      <input type="checkbox" checked={settingsState.automationEnabled} onchange={() => updateSettings({automationEnabled: !settingsState.automationEnabled})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Enforce global defaults</div>
        <div class="settings-desc">Ignore per-series overrides and use the global defaults below.</div>
      </div>
      <input type="checkbox" checked={settingsState.automationEnforceGlobal} onchange={() => updateSettings({automationEnforceGlobal: !settingsState.automationEnforceGlobal})} />
    </label>

    {#if settingsState.automationEnforceGlobal}
      <div class="settings-row">
        <div>
          <div class="settings-label">Per-series overrides paused</div>
          <div class="settings-desc">Disable enforce to allow individual manga preferences again.</div>
        </div>
      </div>
    {/if}

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Auto-download new chapters</div>
        <select class="settings-select" value={String(defaults.autoDownload)} onchange={(event) => patchDefaults({autoDownload: (event.currentTarget as HTMLSelectElement).value === 'true'})}>
          <option value="true">On</option>
          <option value="false">Off</option>
        </select>
      </label>

      <label>
        <div class="settings-label">Download ahead</div>
        <select class="settings-select" value={String(defaults.downloadAhead)} onchange={(event) => patchDefaults({downloadAhead: Number((event.currentTarget as HTMLSelectElement).value)})}>
          {#each downloadAheadOptions as value}
            <option value={String(value)}>{value === 0 ? 'Off' : value}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Max chapters to keep</div>
        <select class="settings-select" value={String(defaults.maxKeepChapters)} onchange={(event) => patchDefaults({maxKeepChapters: Number((event.currentTarget as HTMLSelectElement).value)})}>
          {#each maxKeepOptions as value}
            <option value={String(value)}>{value === 0 ? 'Off' : value}</option>
          {/each}
        </select>
      </label>

      <label>
        <div class="settings-label">Delete delay</div>
        <select class="settings-select" value={String(defaults.deleteDelayHours)} onchange={(event) => patchDefaults({deleteDelayHours: Number((event.currentTarget as HTMLSelectElement).value)})}>
          {#each delayOptions as value}
            <option value={String(value)}>{value === 0 ? 'Now' : value === 24 ? '1 day' : '1 week'}</option>
          {/each}
        </select>
      </label>
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Delete after reading</div>
        <div class="settings-desc">Remove downloaded chapters after they are marked read.</div>
      </div>
      <input type="checkbox" checked={defaults.deleteOnRead} onchange={() => patchDefaults({deleteOnRead: !defaults.deleteOnRead})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Pause updates</div>
        <div class="settings-desc">Pause chapter refresh for series with this default.</div>
      </div>
      <input type="checkbox" checked={defaults.pauseUpdates} onchange={() => patchDefaults({pauseUpdates: !defaults.pauseUpdates})} />
    </label>

    <div class="settings-row">
      <div>
        <div class="settings-label">Refresh interval</div>
        <div class="settings-desc">How often a series is checked for new chapters.</div>
      </div>
      <select class="settings-select" value={defaults.refreshInterval} onchange={(event) => patchDefaults({refreshInterval: (event.currentTarget as HTMLSelectElement).value as 'daily' | 'weekly' | 'manual'})}>
        {#each refreshOptions as value}
          <option value={value}>{value[0].toUpperCase() + value.slice(1)}</option>
        {/each}
      </select>
    </div>

    <div class="settings-row">
      <div>
        <div class="settings-label">Stored custom manga preferences</div>
        <div class="settings-desc">{Object.keys(settingsState.mangaPrefs).length} manga records currently have custom prefs.</div>
      </div>
    </div>
  </div>
</section>