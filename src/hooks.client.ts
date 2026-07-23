import { detectAdapter }                        from '$lib/platform-adapters'
import { initPlatformService }                  from '$lib/platform-service'
import { initRequestManager }                   from '$lib/request-manager'
import { appState }                             from '$lib/state/app.svelte'
import { loadSettings }                         from '$lib/core/persistence/persist'
import { loadSettingsIntoState }                from '$lib/state/settings.svelte'

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

    const settingsData = await loadSettings()
    await loadSettingsIntoState(settingsData.settings)

    const raw = (settingsData?.settings ?? {}) as Record<string, unknown>

    const savedUrl = (raw.serverUrl as string) ?? 'http://127.0.0.1:4567'
    const rawMode  = (raw.serverAuthMode as string) ?? 'NONE'
    const authMode = rawMode === 'SIMPLE_LOGIN' ? 'UI_LOGIN' : (rawMode as 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN')
    const authUser = (raw.serverAuthUser as string) || undefined
    const authPass = (raw.serverAuthPass as string) || undefined

    await serverAdapter.connect({
      baseUrl: savedUrl,
      credentials:
        authMode === 'BASIC_AUTH' && authUser && authPass
          ? { username: authUser, password: authPass }
          : undefined,
    })
  } catch (e) {
    appState.error  = String(e)
    appState.status = 'error'
  }
}

boot()