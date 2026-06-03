import { detectAdapter }                              from '$lib/platform-adapters'
import { initPlatformService }                        from '$lib/platform-service'
import { initRequestManager }                         from '$lib/request-manager'
import { appState }                                   from '$lib/state/app.svelte'
import { configureAuth, probeServer }                 from '$lib/core/auth'
import { loadSettings, loadLibrary, loadUpdates }     from '$lib/core/persistence/persist'
import { loadSettingsIntoState }                      from '$lib/state/settings.svelte'
import { historyState }                               from '$lib/state/history.svelte'
import { readerState }                                from '$lib/state/reader.svelte'

const KEY_URL  = 'moku_server_url'
const KEY_AUTH = 'moku_auth_config'

interface SavedAuth {
  mode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN'
  user?: string
  pass?: string
}

async function resolveServerAdapter() {
  const { SuwayomiAdapter } = await import('$lib/server-adapters/suwayomi')
  return new SuwayomiAdapter()
}

async function boot() {
  try {
    const platformAdapter = detectAdapter()
    await platformAdapter.init()

    const serverAdapter = await resolveServerAdapter()

    initPlatformService(platformAdapter)
    initRequestManager(serverAdapter)

    appState.platform = platformAdapter.platform
    appState.version  = await platformAdapter.getVersion()

    const [settingsData, libraryData] = await Promise.all([
      loadSettings(),
      loadLibrary(),
      loadUpdates(),
    ])

    await loadSettingsIntoState(settingsData.settings)

    readerState.bookmarks = libraryData.bookmarks
    readerState.markers   = libraryData.markers
    historyState.load(libraryData.sessions, libraryData.dailyReadCounts)

    const savedUrl     = (await platformAdapter.getCredential(KEY_URL)) ?? 'http://127.0.0.1:4567'
    const savedAuthRaw = await platformAdapter.getCredential(KEY_AUTH)
    const savedAuth: SavedAuth = savedAuthRaw ? JSON.parse(savedAuthRaw) : { mode: 'NONE' }

    appState.serverUrl = savedUrl
    appState.authMode  = savedAuth.mode

    configureAuth(savedUrl, savedAuth.mode, savedAuth.user, savedAuth.pass)

    await serverAdapter.connect({
      baseUrl: savedUrl,
      credentials:
        savedAuth.mode === 'BASIC_AUTH' && savedAuth.user && savedAuth.pass
          ? { username: savedAuth.user, password: savedAuth.pass }
          : undefined,
    })

    const probe = await probeServer()

    if (probe === 'auth_required') { appState.status = 'auth'; return }
    if (probe === 'unreachable') {
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