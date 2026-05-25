<script lang="ts">
  import { appState, app } from '$lib/state/app.svelte'
  import { notifications } from '$lib/state/notifications.svelte'
  import SplashScreen  from '$lib/components/chrome/SplashScreen.svelte'
  import AuthGate      from '$lib/components/chrome/AuthGate.svelte'
  import Sidebar       from '$lib/components/chrome/Sidebar.svelte'
  import TitleBar      from '$lib/components/chrome/TitleBar.svelte'
  import Toaster       from '$lib/components/chrome/Toaster.svelte'
  import Settings      from '$lib/components/settings/Settings.svelte'
  import ThemeEditor   from '$lib/components/settings/ThemeEditor.svelte'
  import '../app.css'

  let { children } = $props()

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
  <ThemeEditor onclose={() => themeEditorOpen = false} editId={themeEditorId} />
{/if}

<AuthGate />
<Toaster toasts={notifications.toasts} />

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