import { detectAdapter }                          from '$lib/platform-adapters'
import { initPlatformService }                    from '$lib/platform-service'
import { initRequestManager }                     from '$lib/request-manager'
import { appState }                               from '$lib/state/app.svelte'
import { configureAuth, probeServer }             from '$lib/core/auth'
import { loadSettings, loadLibrary }              from '$lib/core/persistence/persist'
import { loadSettingsIntoState, settingsState }   from '$lib/state/settings.svelte'
import { historyState }                           from '$lib/state/history.svelte'
import { readerState }                            from '$lib/state/reader.svelte'
import { seriesState }                            from '$lib/state/series.svelte'

async function boot() {
  try {
    const platformAdapter = detectAdapter()
    initPlatformService(platformAdapter)

    const { SuwayomiAdapter } = await import('$lib/server-adapters/suwayomi')
    const serverAdapter = new SuwayomiAdapter()
    initRequestManager(serverAdapter)

    await platformAdapter.init()

    appState.platform = platformAdapter.platform
    appState.version  = await platformAdapter.getVersion()

    // Apply settings the moment they're read (a fast local-store load) — BEFORE the library load.
    // loadLibrary blocks on the Suwayomi server, which can take ~15s to cold-start; gating settings
    // behind it delayed everything driven by settings (Discord presence, theme, …) until the
    // server answered. Settings don't depend on the library, so there's no reason to wait.
    const settingsData = await loadSettings()
    await loadSettingsIntoState(settingsData.settings)

    const [libraryData] = await Promise.all([
      loadLibrary(),
    ])

    seriesState.bookmarks = libraryData.bookmarks
    readerState.markers   = libraryData.markers
    historyState.load(libraryData.sessions, libraryData.dailyReadCounts)

    const savedUrl  = settingsState.settings.serverUrl      ?? 'http://127.0.0.1:4567'
    const authMode  = settingsState.settings.serverAuthMode ?? 'NONE'
    const authUser  = settingsState.settings.serverAuthUser || undefined
    const authPass  = settingsState.settings.serverAuthPass || undefined

    appState.serverUrl = savedUrl
    appState.authMode  = authMode === 'SIMPLE_LOGIN' ? 'UI_LOGIN' : authMode

    configureAuth(savedUrl, authMode, authUser, authPass)

    await serverAdapter.connect({
      baseUrl: savedUrl,
      credentials:
        authMode === 'BASIC_AUTH' && authUser && authPass
          ? { username: authUser, password: authPass }
          : undefined,
    })

    const isTauri         = platformAdapter.platform === 'tauri'
    const autoStartServer = settingsState.settings.autoStartServer

    if (isTauri && autoStartServer) {
      appState.status = 'booting'
      return
    }

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