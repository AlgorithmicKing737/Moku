<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { applyTheme, mountSystemThemeSync, unmountSystemThemeSync } from '$lib/core/theme'
  import { matchesKeybind, toggleFullscreen } from '$lib/core/keybinds/keybindEngine'
  import { mountIdleDetection } from '$lib/core/ui/idle'
  import { applyZoom, mountZoomKey } from '$lib/core/ui/zoom'
  import { appState } from '$lib/state/app.svelte'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
  import { notificationsState } from '$lib/state/notifications.svelte'
  import { readerState } from '$lib/state/reader.svelte'
  import { clearDiscordPresence, isSupported, setDiscordPresence } from '$lib/platform-service'
  import { loadDownloads } from '$lib/request-manager/downloads'
  import SplashScreen from '$lib/ui/chrome/SplashScreen.svelte'
  import AuthGate     from '$lib/ui/chrome/AuthGate.svelte'
  import Sidebar      from '$lib/ui/chrome/Sidebar.svelte'
  import TitleBar     from '$lib/ui/chrome/TitleBar.svelte'
  import Toaster      from '$lib/ui/chrome/Toaster.svelte'
  import '../app.css'

  let { children } = $props()

  let splashVisible = $state(true)
  let bypassed      = $state(false)
  let closeDialogOpen = $state(false)

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const pathname = $derived($page.url.pathname as string)
  const hideShellChrome = $derived(pathname === '/reader' || pathname.startsWith('/reader/'))
  const ringFull = $derived(appState.status !== 'booting')
  const showSplash = $derived((appState.status === 'booting' || appState.status === 'error') && !bypassed)
  const showAuthGate = $derived(appState.status === 'auth')
  const showShell = $derived(appState.status === 'ready' || bypassed)
  const splashCards = $derived(settingsState.splashCards ?? true)

  async function handleClose() {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    const action = settingsState.closeAction
    if (action === 'tray') {
      await win.hide()
    } else if (action === 'ask') {
      closeDialogOpen = true
    } else {
      await win.close()
    }
  }

  async function confirmQuit() {
    closeDialogOpen = false
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  }

  async function confirmTray() {
    closeDialogOpen = false
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().hide()
  }

  function canUseDiscordRpc(): boolean {
    try {
      return isSupported('discord-rpc')
    } catch {
      return false
    }
  }

  function hasEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null
    if (!element) return false

    const tag = element.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return element.isContentEditable
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (!showShell || hasEditableTarget(event.target)) return

    if (matchesKeybind(event, settingsState.keybinds.openSettings)) {
      event.preventDefault()
      if (!pathname.startsWith('/settings')) {
        void goto('/settings/general')
      }
      return
    }

    if (matchesKeybind(event, settingsState.keybinds.toggleFullscreen)) {
      event.preventDefault()
      void toggleFullscreen()
    }
  }

  let lastPresenceKey = ''

  $effect(() => {
    const enabled = settingsState.discordRpc && appState.status === 'ready' && !appState.idle && canUseDiscordRpc()

    if (!enabled) {
      if (lastPresenceKey) {
        lastPresenceKey = ''
        void clearDiscordPresence().catch(() => {})
      }
      return
    }

    const isReaderRoute = pathname === '/reader' || pathname.startsWith('/reader/')
    const title = isReaderRoute ? (readerState.manga?.title ?? 'Moku') : 'Moku'
    const chapter = isReaderRoute && readerState.chapter
      ? `Chapter ${readerState.chapter.chapterNumber}`
      : 'Browsing library'

    const nextKey = `${title}|${chapter}`
    if (nextKey === lastPresenceKey) return

    lastPresenceKey = nextKey
    void setDiscordPresence({
      title,
      chapter,
      startTimestamp: Date.now(),
    }).catch(() => {})
  })

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
    mountSystemThemeSync()

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

    const DOWNLOAD_POLL_MS = 8_000
    let downloadPollId: ReturnType<typeof setInterval> | null = null

    function startDownloadPolling() {
      if (downloadPollId !== null) return
      void loadDownloads()
      downloadPollId = setInterval(() => {
        void loadDownloads()
      }, DOWNLOAD_POLL_MS)
    }

    function stopDownloadPolling() {
      if (downloadPollId !== null) {
        clearInterval(downloadPollId)
        downloadPollId = null
      }
    }

    if (appState.status === 'ready') {
      startDownloadPolling()
    }

    const stopStatusWatch = $effect.root(() => {
      $effect(() => {
        if (appState.status === 'ready') {
          startDownloadPolling()
        } else {
          stopDownloadPolling()
        }
      })
      return () => {}
    })

    return () => {
      appState.idle = false
      stopZoomKey()
      stopIdleDetection()
      stopDownloadPolling()
      stopStatusWatch()
      window.removeEventListener('resize', handleResize)
      unmountSystemThemeSync()
      stopTauriScale?.()
    }
  })
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

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
          <TitleBar onClose={handleClose} />
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

{#if closeDialogOpen}
  <div class="close-dialog-backdrop" role="presentation" onclick={() => (closeDialogOpen = false)}>
    <div class="close-dialog" role="dialog" aria-modal="true" aria-labelledby="close-dialog-title">
      <p id="close-dialog-title" class="close-dialog-title">Close Moku?</p>
      <p class="close-dialog-desc">Choose what to do when closing the window.</p>
      <div class="close-dialog-actions">
        <button type="button" class="settings-button" onclick={confirmTray}>Minimize to tray</button>
        <button type="button" class="settings-button danger" onclick={confirmQuit}>Quit</button>
        <button type="button" class="settings-button" onclick={() => (closeDialogOpen = false)}>Cancel</button>
      </div>
    </div>
  </div>
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

  .reader-main {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-base);
  }

  .close-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-dialog {
    background: var(--bg-overlay);
    border: 1px solid var(--border-base);
    border-radius: var(--radius-xl);
    padding: var(--sp-5) var(--sp-6);
    min-width: 280px;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .close-dialog-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-dialog-desc {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .close-dialog-actions {
    display: flex;
    gap: var(--sp-2);
    justify-content: flex-end;
    margin-top: var(--sp-1);
  }
</style>