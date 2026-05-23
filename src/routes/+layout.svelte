<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { applyTheme } from '$lib/core/theme'
  import { mountIdleDetection } from '$lib/core/ui/idle'
  import { applyZoom, mountZoomKey } from '$lib/core/ui/zoom'
  import { appState } from '$lib/state/app.svelte'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
  import { notificationsState } from '$lib/state/notifications.svelte'
  import SplashScreen from '$lib/ui/chrome/SplashScreen.svelte'
  import AuthGate     from '$lib/ui/chrome/AuthGate.svelte'
  import Sidebar      from '$lib/ui/chrome/Sidebar.svelte'
  import TitleBar     from '$lib/ui/chrome/TitleBar.svelte'
  import Toaster      from '$lib/ui/chrome/Toaster.svelte'
  import '../app.css'

  let { children } = $props()

  let splashVisible = $state(true)
  let bypassed      = $state(false)

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const pathname = $derived($page.url.pathname as string)
  const hideShellChrome = $derived(pathname === '/reader' || pathname.startsWith('/reader/'))
  const ringFull = $derived(appState.status !== 'booting')
  const showSplash = $derived((appState.status === 'booting' || appState.status === 'error') && !bypassed)
  const showAuthGate = $derived(appState.status === 'auth')
  const showShell = $derived(appState.status === 'ready' || bypassed)
  const splashCards = $derived(settingsState.splashCards ?? true)

  function onSplashReady() {
    splashVisible = false
  }

  function onSplashBypass() {
    bypassed      = true
    splashVisible = false
  }

  onMount(() => {
    applyTheme(settingsState.theme, settingsState.customThemes)
    applyZoom(settingsState.uiZoom)

    const stopZoomKey = mountZoomKey(
      () => settingsState.uiZoom,
      (nextZoom) => updateSettings({ uiZoom: nextZoom })
    )

    const stopIdleDetection = mountIdleDetection(
      () => settingsState.idleTimeoutMin,
      () => {
        appState.idle = true
      },
      () => {
        appState.idle = false
      }
    )

    const handleResize = () => {
      applyZoom(settingsState.uiZoom)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    let stopTauriScale: (() => void) | null = null

    if (isTauri) {
      void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
        stopTauriScale = await getCurrentWindow().onScaleChanged(() => {
          applyZoom(settingsState.uiZoom)
        })
      })
    }

    return () => {
      appState.idle = false
      stopZoomKey()
      stopIdleDetection()
      window.removeEventListener('resize', handleResize)
      stopTauriScale?.()
    }
  })
</script>

{#if showSplash && splashVisible}
  <SplashScreen
    mode="loading"
    {ringFull}
    failed={appState.status === 'error'}
    showCards={splashCards}
    onReady={onSplashReady}
    onBypass={onSplashBypass}
    onRetry={() => window.location.reload()}
  />
{/if}

{#if showShell}
  {#if hideShellChrome}
    <main class="reader-main">
      {@render children()}
    </main>
  {:else}
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
{/if}

{#if showAuthGate}
  <AuthGate />
{/if}
<Toaster toasts={notificationsState.toasts} />

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

  .reader-main {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-base);
  }
</style>