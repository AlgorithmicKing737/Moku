<script lang="ts">
  import { onMount } from 'svelte'
  import { appState, app } from '$lib/state/app.svelte'
  import { notifications } from '$lib/state/notifications.svelte'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
  import { applyTheme, mountSystemThemeSync } from '$lib/core/theme'
  import SplashScreen from '$lib/components/chrome/SplashScreen.svelte'
  import AuthGate     from '$lib/components/chrome/AuthGate.svelte'
  import Sidebar      from '$lib/components/chrome/Sidebar.svelte'
  import TitleBar     from '$lib/components/chrome/TitleBar.svelte'
  import Toaster      from '$lib/components/chrome/Toaster.svelte'
  import Settings     from '$lib/components/settings/Settings.svelte'
  import ThemeEditor  from '$lib/components/settings/ThemeEditor.svelte'
  import { downloadStore } from '$lib/state/downloads.svelte'
  import { seriesState }  from '$lib/state/series.svelte'
  import MangaPreview     from '$lib/components/shared/manga/MangaPreview.svelte'
  import '../app.css'

  let { children } = $props()

  const POLL_MS = 1500
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let polling = false

  async function pollLoop() {
    if (!polling) return
    await downloadStore.poll()
    if (polling) pollTimer = setTimeout(pollLoop, POLL_MS)
  }

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const ringFull = $derived(appState.status !== 'booting')

  let splashVisible   = $state(true)
  let bypassed        = $state(false)
  let themeEditorOpen = $state(false)
  let themeEditorId   = $state<string | null>(null)

  const showApp = $derived(
    appState.status === 'ready' ||
    appState.status === 'auth'  ||
    bypassed
  )

  // Apply theme immediately on mount (before first paint if possible)
  onMount(() => {
    polling = true
    pollLoop()
    applyTheme(
      settingsState.settings.theme ?? 'dark',
      settingsState.settings.customThemes ?? []
    )
  })

  $effect(() => {
    document.documentElement.style.zoom = String(settingsState.settings.uiZoom ?? 1.0)
  })

  // Reactive theme application — explicitly pass values so Svelte tracks them
  $effect(() => {
    const theme        = settingsState.settings.theme ?? 'dark'
    const customThemes = settingsState.settings.customThemes ?? []
    applyTheme(theme, customThemes)
  })

  $effect(() => {
    const enabled    = settingsState.settings.systemThemeSync ?? false
    const darkTheme  = settingsState.settings.systemThemeDark  ?? 'dark'
    const lightTheme = settingsState.settings.systemThemeLight ?? 'light'
    mountSystemThemeSync(enabled, darkTheme, lightTheme, (id) => updateSettings({ theme: id }))
  })

  $effect(() => () => {
    polling = false
    if (pollTimer !== null) { clearTimeout(pollTimer); pollTimer = null }
  })

  function onSplashReady()  { splashVisible = false }
  function onSplashBypass() { bypassed = true; splashVisible = false }

  function openThemeEditor(id?: string | null) {
    themeEditorId   = id ?? null
    themeEditorOpen = true
  }
</script>

{#if splashVisible}
  <SplashScreen
    mode="loading"
    {ringFull}
    failed={appState.status === 'error'}
    onReady={onSplashReady}
    onBypass={onSplashBypass}
    onRetry={() => window.location.reload()}
  />
{/if}

{#if showApp}
  <div class="frame">
    <div class="shell">
      {#if isTauri}
        <TitleBar onClose={() => import('@tauri-apps/api/window').then(m => m.getCurrentWindow().close())} />
      {/if}
      <div class="body">
        <Sidebar />
        <main class="main">
          {@render children()}
        </main>
      </div>
    </div>
  </div>
{/if}

{#if app.settingsOpen}
  <Settings
    onclose={() => app.setSettingsOpen(false)}
    onOpenThemeEditor={openThemeEditor}
  />
{/if}

{#if themeEditorOpen}
  <ThemeEditor
    editingId={themeEditorId}
    onClose={() => themeEditorOpen = false}
  />
{/if}

<AuthGate />
<Toaster toasts={notifications.toasts} />
{#if seriesState.previewManga}
  <MangaPreview />
{/if}

<style>
  .frame {
    display: flex;
    padding: 6px 15px 15px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    border-radius: var(--radius-2xl);
    overflow: hidden;
    border: 1px solid var(--border-dim);
    background: var(--bg-base);
    min-height: 0;
    min-width: 0;
  }

  .body {
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
  }

  .main {
    flex: 1;
    overflow: hidden;
    background: var(--bg-surface);
    transform: translateZ(0);
    contain: layout style;
    min-width: 0;
  }
</style>