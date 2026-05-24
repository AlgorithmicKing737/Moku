import { initRequestManager } from '$lib/request-manager'
import { initPlatformService } from '$lib/platform-service'
import { appState } from '$lib/state/app.svelte'
import { configureAuth, probeServer } from '$lib/core/auth'

const KEY_URL  = 'moku_server_url'
const KEY_AUTH = 'moku_auth_config'

interface SavedAuth {
  mode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN'
  user?: string
  pass?: string
}

function isTauri():     boolean { return '__TAURI_INTERNALS__' in window }
function isCapacitor(): boolean { return 'Capacitor' in window }

function detectPlatform(): 'tauri' | 'capacitor' | 'web' {
  if (isTauri())     return 'tauri'
  if (isCapacitor()) return 'capacitor'
  return 'web'
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

    appState.platform = detectPlatform()
    appState.version  = await platformAdapter.getVersion()

    const savedUrl     = (await platformAdapter.getCredential(KEY_URL)) ?? 'http://127.0.0.1:4567'
    const savedAuthRaw = await platformAdapter.getCredential(KEY_AUTH)
    const savedAuth: SavedAuth = savedAuthRaw ? JSON.parse(savedAuthRaw) : { mode: 'NONE' }

    appState.serverUrl = savedUrl
    appState.authMode  = savedAuth.mode

    if (isTauri() && platformAdapter.isSupported('server-management')) {
      // jarPath/port/dataPath come from persisted server config; omitted here
      // until settings UI writes them — server auto-launch handled by Tauri side
    }

    configureAuth(savedUrl, savedAuth.mode, savedAuth.user, savedAuth.pass)

    await serverAdapter.connect({
      baseUrl: savedUrl,
      credentials:
        savedAuth.mode === 'BASIC_AUTH' && savedAuth.user && savedAuth.pass
          ? { username: savedAuth.user, password: savedAuth.pass }
          : undefined,
    })

    const probe = await probeServer()

    if (probe === 'auth_required') { appState.status = 'auth';  return }
    if (probe === 'unreachable')   {
      appState.error  = `Could not reach server at ${savedUrl}`
      appState.status = 'error'
      return
    }

    appState.authenticated = true
    appState.status        = 'ready'
  } catch (e) {
    appState.error  = String(e)
    appState.status = 'error'
  }
}

boot()