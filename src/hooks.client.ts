import { initRequestManager } from '$lib/request-manager'
import { initPlatformService } from '$lib/platform-service'
import { appState } from '$lib/state/app.svelte'

function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window
}

function isCapacitor(): boolean {
  return 'Capacitor' in window
}

async function resolvePlatformAdapter() {
  if (isTauri()) {
    const { TauriAdapter } = await import('$lib/platform-adapters/tauri')
    return new TauriAdapter()
  }
  if (isCapacitor()) {
    const { CapacitorAdapter } = await import('$lib/platform-adapters/capacitor')
    return new CapacitorAdapter()
  }
  const { WebAdapter } = await import('$lib/platform-adapters/web')
  return new WebAdapter()
}

async function resolveServerAdapter() {
  const { SuwayomiAdapter } = await import('$lib/server-adapters/suwayomi')
  return new SuwayomiAdapter()
}

async function boot() {
  try {
    const [serverAdapter, platformAdapter] = await Promise.all([
      resolveServerAdapter(),
      resolvePlatformAdapter(),
    ])

    initRequestManager(serverAdapter)
    initPlatformService(platformAdapter)

    appState.platform = isTauri() ? 'tauri' : isCapacitor() ? 'capacitor' : 'web'
    appState.version = await platformAdapter.getVersion()
    appState.status = 'ready'
  } catch (e) {
    appState.error = String(e)
    appState.status = 'error'
  }
}

boot()
