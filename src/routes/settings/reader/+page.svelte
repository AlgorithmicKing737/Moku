<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const pageStyles = [
    ['longstrip', 'Long strip'],
    ['single', 'Single page'],
    ['double', 'Double page'],
  ] as const

  const readingDirections = [
    ['ltr', 'Left to right'],
    ['rtl', 'Right to left'],
  ] as const

  const fitModes = [
    ['width', 'Fit width'],
    ['height', 'Fit height'],
    ['screen', 'Fit screen'],
    ['original', 'Original'],
  ] as const
</script>

<svelte:head>
  <title>Settings - Reader</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Reader</p>
    <h2>Reading defaults</h2>
    <p>Behavior and layout for the full-screen reader.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Default page style</div>
        <select class="settings-select" value={settingsState.pageStyle} onchange={(event) => updateSettings({pageStyle: (event.currentTarget as HTMLSelectElement).value as 'single' | 'double' | 'longstrip'})}>
          {#each pageStyles as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>

      <label>
        <div class="settings-label">Reading direction</div>
        <select class="settings-select" value={settingsState.readingDirection} onchange={(event) => updateSettings({readingDirection: (event.currentTarget as HTMLSelectElement).value as 'ltr' | 'rtl'})}>
          {#each readingDirections as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Default fit mode</div>
        <select class="settings-select" value={settingsState.fitMode} onchange={(event) => updateSettings({fitMode: (event.currentTarget as HTMLSelectElement).value as 'width' | 'height' | 'screen' | 'original'})}>
          {#each fitModes as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>

      <label>
        <div class="settings-label">Reader zoom</div>
        <input
          class="settings-slider"
          type="range"
          min="10"
          max="100"
          step="5"
          value={Math.round((settingsState.readerZoom ?? 0.5) * 100)}
          oninput={(event) => updateSettings({readerZoom: Number((event.currentTarget as HTMLInputElement).value) / 100})}
        />
      </label>
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Page gap</div>
        <div class="settings-desc">Adds spacing between pages in single-page mode.</div>
      </div>
      <input type="checkbox" checked={settingsState.pageGap} onchange={() => updateSettings({pageGap: !settingsState.pageGap})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Overlay bars</div>
        <div class="settings-desc">Float reader bars over the content.</div>
      </div>
      <input type="checkbox" checked={settingsState.overlayBars} onchange={() => updateSettings({overlayBars: !settingsState.overlayBars})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Tap to toggle bar</div>
        <div class="settings-desc">Double tap the reader to show or hide the bars.</div>
      </div>
      <input type="checkbox" checked={settingsState.tapToToggleBar} onchange={() => updateSettings({tapToToggleBar: !settingsState.tapToToggleBar})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Optimize contrast</div>
        <div class="settings-desc">Boost line contrast for black-and-white pages.</div>
      </div>
      <input type="checkbox" checked={settingsState.optimizeContrast} onchange={() => updateSettings({optimizeContrast: !settingsState.optimizeContrast})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Auto-mark read</div>
        <div class="settings-desc">Mark chapters read at the end of the last page.</div>
      </div>
      <input type="checkbox" checked={settingsState.autoMarkRead} onchange={() => updateSettings({autoMarkRead: !settingsState.autoMarkRead})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Auto-advance chapters</div>
        <div class="settings-desc">Open the next chapter automatically when you finish.</div>
      </div>
      <input type="checkbox" checked={settingsState.autoNextChapter} onchange={() => updateSettings({autoNextChapter: !settingsState.autoNextChapter})} />
    </label>

    {#if !settingsState.autoNextChapter}
      <label class="settings-row settings-toggle-row">
        <div>
          <div class="settings-label">Mark read when skipping</div>
          <div class="settings-desc">Mark the current chapter read when you skip ahead manually.</div>
        </div>
        <input type="checkbox" checked={settingsState.markReadOnNext} onchange={() => updateSettings({markReadOnNext: !settingsState.markReadOnNext})} />
      </label>
    {/if}

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Auto-bookmark</div>
        <div class="settings-desc">Save page position while reading.</div>
      </div>
      <input type="checkbox" checked={settingsState.autoBookmark} onchange={() => updateSettings({autoBookmark: !settingsState.autoBookmark})} />
    </label>

    <div class="settings-row">
      <div>
        <div class="settings-label">Pages to preload</div>
        <div class="settings-desc">How many pages ahead to fetch in the background.</div>
      </div>
      <input
        class="settings-input settings-input-narrow"
        type="number"
        min="0"
        max="10"
        value={settingsState.preloadPages}
        oninput={(event) => updateSettings({preloadPages: Math.max(0, Math.min(10, Number((event.currentTarget as HTMLInputElement).value) || 0))})}
      />
    </div>
  </div>
</section>