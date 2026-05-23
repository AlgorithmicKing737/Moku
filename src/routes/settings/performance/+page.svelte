<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const renderLimits = [48, 96, 144, 300, 500]
</script>

<svelte:head>
  <title>Settings - Performance</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Performance</p>
    <h2>Render and behavior tuning</h2>
    <p>Keep the app light or turn up quality-of-life options.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Render limit</div>
        <select class="settings-select" value={String(settingsState.renderLimit)} onchange={(event) => updateSettings({renderLimit: Number((event.currentTarget as HTMLSelectElement).value)})}>
          {#each renderLimits as value}
            <option value={String(value)}>{value}</option>
          {/each}
        </select>
      </label>

      <label>
        <div class="settings-label">Reader debounce</div>
        <input class="settings-input settings-input-narrow" type="number" min="0" max="1000" value={settingsState.readerDebounceMs} oninput={(event) => updateSettings({readerDebounceMs: Number((event.currentTarget as HTMLInputElement).value) || 0})} />
      </label>
    </div>

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Library page size</div>
        <input class="settings-input settings-input-narrow" type="number" min="1" max="200" value={settingsState.libraryPageSize} oninput={(event) => updateSettings({libraryPageSize: Number((event.currentTarget as HTMLInputElement).value) || 1})} />
      </label>

      <label>
        <div class="settings-label">Chapter page size</div>
        <input class="settings-input settings-input-narrow" type="number" min="1" max="200" value={settingsState.chapterPageSize} oninput={(event) => updateSettings({chapterPageSize: Number((event.currentTarget as HTMLInputElement).value) || 1})} />
      </label>
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">GPU acceleration</div>
        <div class="settings-desc">Use the GPU for rendering when available.</div>
      </div>
      <input type="checkbox" checked={settingsState.gpuAcceleration} onchange={() => updateSettings({gpuAcceleration: !settingsState.gpuAcceleration})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">QOL animations</div>
        <div class="settings-desc">Hover lifts and transition polish.</div>
      </div>
      <input type="checkbox" checked={settingsState.qolAnimations} onchange={() => updateSettings({qolAnimations: !settingsState.qolAnimations})} />
    </label>
  </div>
</section>