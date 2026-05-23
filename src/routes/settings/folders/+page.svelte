<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  function splitIds(value: string) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
</script>

<svelte:head>
  <title>Settings - Folders</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Folders</p>
    <h2>Library folder organization</h2>
    <p>Use simple comma-separated controls to keep tab order and visibility direct.</p>
  </header>

  <div class="settings-card">
    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">Saved is default category</div>
        <div class="settings-desc">Treat the Saved folder as the default category view.</div>
      </div>
      <input type="checkbox" checked={settingsState.savedIsDefaultCategory} onchange={() => updateSettings({savedIsDefaultCategory: !settingsState.savedIsDefaultCategory})} />
    </label>

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Default library category ID</div>
        <input class="settings-input settings-input-narrow" type="number" min="0" value={settingsState.defaultLibraryCategoryId ?? ''} oninput={(event) => { const value = (event.currentTarget as HTMLInputElement).value; updateSettings({defaultLibraryCategoryId: value === '' ? null : Number(value)}); }} />
      </label>

      <label>
        <div class="settings-label">Hidden category IDs</div>
        <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.hiddenCategoryIds.join(', ')} oninput={(event) => updateSettings({hiddenCategoryIds: splitIds((event.currentTarget as HTMLInputElement).value).map(Number).filter(Number.isFinite)})} />
      </label>
    </div>

    <label class="settings-row">
      <div>
        <div class="settings-label">Hidden library tabs</div>
        <div class="settings-desc">Comma-separated route names such as Saved, Completed, or custom tabs.</div>
      </div>
      <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.hiddenLibraryTabs.join(', ')} oninput={(event) => updateSettings({hiddenLibraryTabs: splitIds((event.currentTarget as HTMLInputElement).value)})} />
    </label>

    <label class="settings-row">
      <div>
        <div class="settings-label">Pinned library tab order</div>
        <div class="settings-desc">Comma-separated pinned tab IDs in the order you want them shown.</div>
      </div>
      <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.libraryPinnedTabOrder.join(', ')} oninput={(event) => updateSettings({libraryPinnedTabOrder: splitIds((event.currentTarget as HTMLInputElement).value)})} />
    </label>
  </div>
</section>