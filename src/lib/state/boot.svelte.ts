import { detectAdapter }      from '$lib/platform-adapters'
import { initPlatformService } from '$lib/platform-service'
import { platformService }     from '$lib/platform-service'
import { probeServer, loginBasic, loginUI } from '$lib/core/auth'
import { appState }            from '$lib/state/app.svelte'
import { settingsState }               from '$lib/state/settings.svelte'

const MAX_ATTEMPTS    = 40
const BG_MAX_ATTEMPTS = 120

export const boot = $state({
  failed:         false,
  notConfigured:  false,
  loginRequired:  false,
  loginError:     null as string | null,
  loginBusy:      false,
  loginUser:      '',
  loginPass:      '',
  sessionExpired: false,
  skipped:        false,
  serverProbeOk:  false,
})

let probeGeneration = 0

export async function initPlatform(): Promise<void> {
  const adapter = detectAdapter()
  initPlatformService(adapter)
  await adapter.init()
  appState.platform = adapter.platform
  appState.version  = await platformService.getVersion()
  appState.appDir   = await platformService.getAppDir()
}

function pinLockEnabled(): boolean {
  return (
    settingsState.settings.appLockEnabled === true &&
    typeof settingsState.settings.appLockPin === 'string' &&
    settingsState.settings.appLockPin.length >= 4
  )
}

function handleProbeSuccess(gen: number) {
  if (gen !== probeGeneration) return
  boot.failed        = false
  boot.skipped       = false
  boot.serverProbeOk = true
  appState.authenticated = true
  appState.status        = pinLockEnabled() ? 'locked' : 'ready'
}

function handleAuthRequired(
  gen:      number,
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  user:     string,
  pass:     string,
) {
  if (gen !== probeGeneration) return
  boot.failed = false

  if (authMode === 'BASIC_AUTH' && user && pass) {
    loginBasic(user, pass)
      .then(() => { if (gen === probeGeneration) handleProbeSuccess(gen) })
      .catch(() => {
        if (gen !== probeGeneration) return
        boot.loginUser     = user
        boot.loginRequired = true
        appState.status    = 'auth'
      })
    return
  }

  boot.loginUser     = user
  boot.loginRequired = true
  appState.status    = 'auth'
}

export function startProbe(
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN' = 'NONE',
  user = '',
  pass = '',
  initialDelay = 100,
) {
  const gen = ++probeGeneration
  boot.failed        = false
  boot.loginRequired = false
  boot.skipped       = false
  boot.serverProbeOk = false
  appState.status    = 'booting'

  if (appState.platform === 'web') {
    boot.failed = true
    appState.status = 'error'
    startBackgroundProbe(gen, authMode, user, pass)
    return
  }

  let tries = 0

  async function probe() {
    if (gen !== probeGeneration) return
    tries++
    const result = await probeServer()
    if (gen !== probeGeneration) return

    if (result === 'ok')            { handleProbeSuccess(gen); return }
    if (result === 'auth_required') { handleAuthRequired(gen, authMode, user, pass); return }
    if (tries >= MAX_ATTEMPTS)      { boot.failed = true; appState.status = 'error'; startBackgroundProbe(gen, authMode, user, pass); return }

    setTimeout(probe, Math.min(500 + tries * 200, 2000))
  }

  setTimeout(probe, initialDelay)
}

function startBackgroundProbe(
  gen:      number,
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  user:     string,
  pass:     string,
) {
  let bgTries = 0

  async function bgProbe() {
    if (gen !== probeGeneration) return
    bgTries++
    const result = await probeServer()
    if (gen !== probeGeneration) return

    if (result === 'ok')            { handleProbeSuccess(gen); return }
    if (result === 'auth_required') { handleAuthRequired(gen, authMode, user, pass); return }
    if (bgTries >= BG_MAX_ATTEMPTS) return

    setTimeout(bgProbe, 2000)
  }

  setTimeout(bgProbe, 2000)
}

export function stopProbe() {
  probeGeneration++
}

export async function submitLogin(): Promise<void> {
  if (!boot.loginUser.trim() || !boot.loginPass.trim()) {
    boot.loginError = 'Username and password are required'
    return
  }
  boot.loginBusy  = true
  boot.loginError = null
  try {
    if (appState.authMode === 'UI_LOGIN') {
      await loginUI(boot.loginUser.trim(), boot.loginPass.trim())
    } else {
      await loginBasic(boot.loginUser.trim(), boot.loginPass.trim())
    }
    boot.loginRequired  = false
    boot.sessionExpired = false
    boot.skipped        = false
    boot.loginPass      = ''
    boot.loginError     = null
    boot.serverProbeOk  = true
    appState.authenticated = true
    appState.status        = pinLockEnabled() ? 'locked' : 'ready'
  } catch (e: unknown) {
    boot.loginError = e instanceof Error ? e.message : 'Login failed'
  } finally {
    boot.loginBusy = false
  }
}

export function retryBoot(
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN' = 'NONE',
  user = '',
  pass = '',
) {
  boot.failed        = false
  boot.notConfigured = false
  boot.loginRequired = false
  boot.skipped       = false
  startProbe(authMode, user, pass)
}

export function bypassBoot(
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN' = 'NONE',
  user = '',
  pass = '',
) {
  const gen = probeGeneration
  boot.loginRequired  = false
  boot.sessionExpired = false
  boot.skipped        = true
  appState.status     = 'ready'
  startBackgroundProbe(gen, authMode, user, pass)
}