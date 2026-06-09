<script lang="ts">
  import { onMount }                                                    from 'svelte'
  import { page }                                                       from '$app/stores'
  import { appState, app }                                              from '$lib/state/app.svelte'
  import { boot }                                                        from '$lib/state/boot.svelte'
  import { notifications }                                              from '$lib/state/notifications.svelte'
  import { settingsState, loadSettingsIntoState, updateSettings }       from '$lib/state/settings.svelte'
  import { applyTheme, mountSystemThemeSync }                           from '$lib/core/theme'
  import { platformService }                                            from '$lib/platform-service'
  import { initRpc, setIdle, destroyRpc }                                from '$lib/core/discord'
  import SplashScreen                                                   from '$lib/components/chrome/SplashScreen.svelte'
  import AuthGate                                                       from '$lib/components/chrome/AuthGate.svelte'
  import Sidebar                                                        from '$lib/components/chrome/Sidebar.svelte'
  import TitleBar                                                       from '$lib/components/chrome/TitleBar.svelte'
  import Toaster                                                        from '$lib/components/chrome/Toaster.svelte'
  import Settings                                                       from '$lib/components/settings/Settings.svelte'
  import ThemeEditor                                                    from '$lib/components/settings/ThemeEditor.svelte'
  import { downloadStore }                                              from '$lib/state/downloads.svelte'
  import { seriesState }                                                from '$lib/state/series.svelte'
  import MangaPreview                                                   from '$lib/components/shared/manga/MangaPreview.svelte'
  import '../app.css'

  let { children } = $props()

  const POLL_MS = 1500
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let polling = false

  async function pollLoop() {
    if (!polling) return
    await downloadStore.poll()
    if (polling) pollTimer = setTimeout(pollLoop, POLL_MS)
  }

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

  let _splashDismissed = $state(false)
  let bypassed         = $state(false)
  let themeEditorOpen  = $state(false)
  let themeEditorId    = $state<string | null>(null)

  const splashVisible = $derived(
    !_splashDismissed ||
    appState.status === 'booting' ||
    appState.status === 'locked'  ||
    appState.status === 'error'   ||
    appState.status === 'auth'
  )

  const ringFull = $derived(appState.status === 'ready')

  const showApp = $derived(
    !splashVisible && (
      appState.status === 'ready' ||
      bypassed
    )
  )

  function onSplashReady()  { _splashDismissed = true }
  function onSplashUnlock() { appState.status = 'ready'; _splashDismissed = true }
  function onSplashBypass() { bypassed = true; _splashDismissed = true }

  const isReaderRoute       = $derived($page.url.pathname.startsWith('/reader'))
  const readerContainerized = $derived(settingsState.settings.readerContainerized ?? false)
  const strippedLayout      = $derived(isReaderRoute && !readerContainerized)

  onMount(async () => {
    const { detectAdapter }       = await import('$lib/platform-adapters')
    const { initPlatformService } = await import('$lib/platform-service')
    const { loadSettings }        = await import('$lib/core/persistence/persist')
    const { startProbe }          = await import('$lib/state/boot.svelte')

    const adapter = detectAdapter()
    initPlatformService(adapter)
    await adapter.init()
    appState.platform = adapter.platform
    appState.version  = await platformService.getVersion().catch(() => '')
    appState.appDir   = await platformService.getAppDir().catch(() => '')

    const persisted = await loadSettings()
    const raw       = persisted?.settings ?? persisted ?? null
    await loadSettingsIntoState(raw)

    const s = (raw ?? {}) as Record<string, unknown>
    appState.serverUrl = (s.serverUrl      as string) ?? ''
    appState.authMode  = (s.serverAuthMode as 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN') ?? 'NONE'
    appState.authUser  = (s.serverAuthUser as string) ?? ''
    appState.authPass  = (s.serverAuthPass as string) ?? ''

    applyTheme(
      settingsState.settings.theme        ?? 'dark',
      settingsState.settings.customThemes ?? [],
    )

    if (isTauri && settingsState.settings.autoStartServer) {
      platformService.launchServer({
        binary:       settingsState.settings.serverBinary,
        binaryArgs:   settingsState.settings.serverBinaryArgs,
        webUiEnabled: settingsState.settings.suwayomiWebUI,
      }).catch(() => {})
    }

    startProbe(
      appState.authMode ?? 'NONE',
      appState.authUser ?? '',
      appState.authPass ?? '',
      isTauri && settingsState.settings.autoStartServer ? 2000 : 100,
    )

    let discordInitialized = false
    if (settingsState.settings.discordRpc) {
      await initRpc()
      await setIdle()
      discordInitialized = true
    }

    polling = true
    pollLoop()

    resetIdleTimer()

    return () => {
      polling = false
      if (pollTimer !== null) { clearTimeout(pollTimer); pollTimer = null }
      if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null }
      if (discordInitialized) destroyRpc().catch(() => {})
      platformService.destroy().catch(() => {})
    }
  })

  $effect(() => {
    document.documentElement.style.zoom = String(settingsState.settings.uiZoom ?? 1.0)
  })

  $effect(() => {
    applyTheme(settingsState.settings.theme ?? 'dark', settingsState.settings.customThemes ?? [])
  })

  $effect(() => {
    mountSystemThemeSync(
      settingsState.settings.systemThemeSync  ?? false,
      settingsState.settings.systemThemeDark  ?? 'dark',
      settingsState.settings.systemThemeLight ?? 'light',
      (id) => updateSettings({ theme: id }),
    )
  })

  $effect(() => {
    if (appState.status === 'booting') _splashDismissed = false
  })

  $effect(() => {
    if (appState.status === 'ready') resetIdleTimer()
  })

  $effect(() => {
    if (appState.status !== 'ready') return
    // capture phase so events from any component — including modals — reset the timer
    const onActivity = () => resetIdleTimer()
    document.addEventListener('mousemove',  onActivity, true)
    document.addEventListener('keydown',    onActivity, true)
    document.addEventListener('touchstart', onActivity, true)
    // passive:true tells the browser it can render scroll frames without waiting for the handler
    document.addEventListener('touchmove',  onActivity, { capture: true, passive: true })
    document.addEventListener('wheel',      onActivity, { capture: true, passive: true })
    document.addEventListener('click',      onActivity, true)
    return () => {
      document.removeEventListener('mousemove',  onActivity, true)
      document.removeEventListener('keydown',    onActivity, true)
      document.removeEventListener('touchstart', onActivity, true)
      document.removeEventListener('touchmove',  onActivity, { capture: true })
      document.removeEventListener('wheel',      onActivity, { capture: true })
      document.removeEventListener('click',      onActivity, true)
    }
  })

  function resetIdleTimer() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
    // 0 means "Never" — skip the timer entirely
    const mins = settingsState.settings.idleTimeoutMin ?? 5
    if (mins === 0) return
    idleTimer = setTimeout(() => {
      if (appState.status === 'ready') appState.idleSplash = true
    }, mins * 60_000)
  }

  function onIdleDismiss() { appState.idleSplash = false; resetIdleTimer() }

  function onSplashRetry() {
    import('$lib/state/boot.svelte').then(({ retryBoot }) => {
      retryBoot(appState.authMode ?? 'NONE', appState.authUser ?? '', appState.authPass ?? '')
    })
  }

  function openThemeEditor(id?: string | null) {
    themeEditorId   = id ?? null
    themeEditorOpen = true
  }
</script>

{#if splashVisible}
  <SplashScreen
    mode={appState.status === 'locked' ? 'locked' : 'loading'}
    {ringFull}
    failed={appState.status === 'error'}
    notConfigured={boot.notConfigured}
    pinLen={settingsState.settings.appLockPin?.length ?? 0}
    pinCorrect={settingsState.settings.appLockPin ?? ''}
    onReady={onSplashReady}
    onUnlock={onSplashUnlock}
    onBypass={onSplashBypass}
    onRetry={onSplashRetry}
  />
{/if}

{#if appState.idleSplash}
  <SplashScreen mode="idle" onDismiss={onIdleDismiss} />
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