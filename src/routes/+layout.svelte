<script lang="ts">
  import { appState } from '$lib/state/app.svelte'
  import { notificationsState } from '$lib/state/notifications.svelte'
  import SplashScreen from '$lib/ui/chrome/SplashScreen.svelte'
  import AuthGate     from '$lib/ui/chrome/AuthGate.svelte'
  import Sidebar      from '$lib/ui/chrome/Sidebar.svelte'
  import TitleBar     from '$lib/ui/chrome/TitleBar.svelte'
  import Toaster      from '$lib/ui/chrome/Toaster.svelte'
  import '../app.css'

  let { children } = $props()

  const isTauri    = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const ringFull   = $derived(appState.status !== 'booting')
  const splashDone = $derived(
    appState.status === 'ready' ||
    appState.status === 'auth'  ||
    appState.status === 'error'
  )

  let bypassed = $state(false)
  const showApp = $derived(splashDone && (appState.status === 'ready' || appState.status === 'auth' || bypassed))
</script>

{#if !showApp}
  <SplashScreen
    mode="loading"
    {ringFull}
    failed={appState.status === 'error'}
    onReady={() => {}}
    onBypass={() => (bypassed = true)}
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

<AuthGate />
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
</style>