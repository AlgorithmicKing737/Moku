<script lang="ts">
  import { eventToKeybind } from '$lib/core/keybinds/keybindEngine'
  import { DEFAULT_KEYBINDS, KEYBIND_LABELS, type Keybinds } from '$lib/core/keybinds/defaultBinds'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  let listeningKey = $state<keyof Keybinds | null>(null)

  function startListen(key: keyof Keybinds) {
    listeningKey = listeningKey === key ? null : key
  }

  function setBinding(key: keyof Keybinds, binding: string) {
    updateSettings({keybinds: {...settingsState.keybinds, [key]: binding}})
  }

  $effect(() => {
    if (!listeningKey || typeof window === 'undefined') return

    const handler = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const binding = eventToKeybind(event)
      if (!binding) return

      setBinding(listeningKey, binding)
      listeningKey = null
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  })
</script>

<svelte:head>
  <title>Settings - Keybinds</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Keybinds</p>
    <h2>Keyboard shortcuts</h2>
    <p>Click a binding and press the shortcut you want to use.</p>
  </header>

  <div class="settings-card settings-keybinds-card">
    <div class="settings-row settings-row-head">
      <div>
        <div class="settings-label">Shortcut bindings</div>
        <div class="settings-desc">Reset any binding individually or all at once.</div>
      </div>
      <button class="settings-button" type="button" onclick={() => updateSettings({keybinds: {...DEFAULT_KEYBINDS}})}>Reset all</button>
    </div>

    {#each Object.keys(KEYBIND_LABELS) as key}
      {@const bindKey = key as keyof Keybinds}
      {@const isListening = listeningKey === bindKey}
      {@const isDefault = settingsState.keybinds[bindKey] === DEFAULT_KEYBINDS[bindKey]}
      <div class="settings-row settings-keybind-row">
        <div>
          <div class="settings-label">{KEYBIND_LABELS[bindKey]}</div>
        </div>
        <div class="settings-keybind-actions">
          <button class="settings-button" type="button" onclick={() => startListen(bindKey)}>{isListening ? 'Press a key…' : settingsState.keybinds[bindKey]}</button>
          <button class="settings-button" type="button" disabled={isDefault} onclick={() => setBinding(bindKey, DEFAULT_KEYBINDS[bindKey])}>Reset</button>
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  :global(.settings-keybinds-card) {
    gap: 0;
  }

  :global(.settings-keybind-row) {
    align-items: center;
  }

  :global(.settings-keybind-actions) {
    display: flex;
    gap: var(--sp-3);
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>