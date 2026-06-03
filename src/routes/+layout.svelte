<script lang="ts">
  import { onMount }                                        from 'svelte'
  import { page }                                           from '$app/stores'
  import { appState, app }                                  from '$lib/state/app.svelte'
  import { notifications }                                  from '$lib/state/notifications.svelte'
  import { settingsState, loadSettingsIntoState, updateSettings } from '$lib/state/settings.svelte'
  import { applyTheme, mountSystemThemeSync }               from '$lib/core/theme'
  import { platformService }                                from '$lib/platform-service'
  import * as discord                                       from '$lib/core/discord'
  import SplashScreen from '$lib/components/chrome/SplashScreen.svelte'
  import AuthGate     from '$lib/components/chrome/AuthGate.svelte'
  import Sidebar      from '$lib/components/chrome/Sidebar.svelte'
  import TitleBar     from '$lib/components/chrome/TitleBar.svelte'
  import Toaster      from '$lib/components/chrome/Toaster.svelte'
  import Settings     from '$lib/components/settings/Settings.svelte'
  import ThemeEditor  from '$lib/components/settings/ThemeEditor.svelte'
  import { downloadStore } from '$lib/state/downloads.svelte'
  import { seriesState }   from '$lib/state/series.svelte'
  import MangaPreview      from '$lib/components/shared/manga/MangaPreview.svelte'
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

  const isTauri  = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const ringFull = $derived(appState.status === 'ready' || appState.status === 'auth')

  let splashVisible   = $state(true)
  let bypassed        = $state(false)
  let themeEditorOpen = $state(false)
  let themeEditorId   = $state<string | null>(null)

  const showApp = $derived(
    appState.status === 'ready' ||
    appState.status === 'auth'  ||
    bypassed
  )

  const isReaderRoute       = $derived($page.url.pathname.startsWith('/reader'))
  const readerContainerized = $derived(settingsState.settings.readerContainerized ?? false)
  const strippedLayout      = $derived(isReaderRoute && !readerContainerized)

  onMount(async () => {
    // hooks.client.ts already ran detectAdapter(), initPlatformService(),
    // loadSettingsIntoState(), and startProbe() — nothing to re-initialize here.

    if (isTauri && settingsState.settings.autoStartServer) {
      platformService.launchServer({
        binary:        settingsState.settings.serverBinary,
        binaryArgs:    settingsState.settings.serverBinaryArgs,
        webUiEnabled:  settingsState.settings.suwayomiWebUI,
      }).catch(() => {})
    }

    if (settingsState.settings.discordRpc) {
      await discord.initRpc()
      await discord.setIdle()
    }

    polling = true
    pollLoop()

    applyTheme(
      settingsState.settings.theme ?? 'dark',
      settingsState.settings.customThemes ?? []
    )

    return () => {
      polling = false
      if (pollTimer !== null) { clearTimeout(pollTimer); pollTimer = null }
      discord.destroyRpc()
      platformService.destroy()
    }
  })

  $effect(() => {
    document.documentElement.style.zoom = String(settingsState.settings.uiZoom ?? 1.0)
  })

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
  {#if strippedLayout}
    {@render children()}
  {:else}
    <div class="frame">
      {#if isTauri}
        <TitleBar onClose={() => platformService.close()} />
      {/if}
      <div class="padding" class:padding-web={!isTauri}>
        <div class="shell">
          <div class="body">
            <Sidebar />
            <main class="main">
              {@render children()}
            </main>
          </div>
        </div>
      </div>
    </div>
  {/if}
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
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .padding {
    display: flex;
    flex: 1;
    padding: 0 15px 15px;
    min-height: 0;
  }

  .padding-web {
    padding-top: 15px;
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