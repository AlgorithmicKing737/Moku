<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const sortDirs = [
    ['desc', 'Newest first'],
    ['asc', 'Oldest first'],
  ] as const

  const sortModes = [
    ['az', 'A-Z'],
    ['unreadCount', 'Unread count'],
    ['totalChapters', 'Total chapters'],
    ['recentlyAdded', 'Recently added'],
    ['recentlyRead', 'Recently read'],
    ['latestFetched', 'Latest fetched'],
    ['latestUploaded', 'Latest uploaded'],
  ] as const
</script>

<svelte:head>
  <title>Settings - Library</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Library</p>
    <h2>Library display and sorting</h2>
    <p>How manga cards and chapter lists are shown in the library.</p>
  </header>

  <div class="settings-card">
    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Always show card stats</div>
        <div class="settings-desc">Show unread and download counts without hovering.</div>
      </div>
      <input type="checkbox" checked={settingsState.libraryStatsAlways} onchange={() => updateSettings({libraryStatsAlways: !settingsState.libraryStatsAlways})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Crop cover images</div>
        <div class="settings-desc">Fill cards with cover art instead of letterboxing.</div>
      </div>
      <input type="checkbox" checked={settingsState.libraryCropCovers} onchange={() => updateSettings({libraryCropCovers: !settingsState.libraryCropCovers})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Show all in Saved tab</div>
        <div class="settings-desc">Include manga that are already in folders.</div>
      </div>
      <input type="checkbox" checked={settingsState.libraryShowAllInSaved} onchange={() => updateSettings({libraryShowAllInSaved: !settingsState.libraryShowAllInSaved})} />
    </label>

    {#if settingsState.libraryShowAllInSaved}
      <label class="settings-row settings-toggle-row">
        <div>
          <div class="settings-label">Hide completed in Saved tab</div>
          <div class="settings-desc">Keep completed manga out of the Saved view.</div>
        </div>
        <input type="checkbox" checked={settingsState.libraryHideCompletedInSaved} onchange={() => updateSettings({libraryHideCompletedInSaved: !settingsState.libraryHideCompletedInSaved})} />
      </label>
    {/if}

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Default chapter sort direction</div>
        <select class="settings-select" value={settingsState.chapterSortDir} onchange={(event) => updateSettings({chapterSortDir: (event.currentTarget as HTMLSelectElement).value as 'desc' | 'asc'})}>
          {#each sortDirs as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>

      <label>
        <div class="settings-label">Default chapter sort mode</div>
        <select class="settings-select" value={settingsState.chapterSortMode} onchange={(event) => updateSettings({chapterSortMode: (event.currentTarget as HTMLSelectElement).value as 'source' | 'chapterNumber' | 'uploadDate'})}>
          {#each sortModes as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
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
        <div class="settings-label">Auto-link on open</div>
        <div class="settings-desc">Try to link a manga to similar entries when opened.</div>
      </div>
      <input type="checkbox" checked={settingsState.autoLinkOnOpen} onchange={() => updateSettings({autoLinkOnOpen: !settingsState.autoLinkOnOpen})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Disable auto-complete</div>
        <div class="settings-desc">Do not move manga to Completed automatically.</div>
      </div>
      <input type="checkbox" checked={settingsState.disableAutoComplete} onchange={() => updateSettings({disableAutoComplete: !settingsState.disableAutoComplete})} />
    </label>
  </div>
</section>