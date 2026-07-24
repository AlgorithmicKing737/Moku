import { detectAdapter }      from '$lib/platform-adapters'
import { initPlatformService, platformService } from '$lib/platform-service'
import { probeServer, loginBasic, loginUI, verifyBasicAuth, configureAuth } from '$lib/core/auth'
import { authVerifiedState }   from '$lib/state/auth.svelte'
import { appState }            from '$lib/state/app.svelte'
import { settingsState, updateSettings } from '$lib/state/settings.svelte'

const MAX_ATTEMPTS     = 40
const WEB_MAX_ATTEMPTS = 1
const BG_MAX_ATTEMPTS  = 120

export const boot = $state({
  failed:         false,
  notConfigured:  false,
  loginRequired:  false,
  loginError:     null as string | null,
  loginBusy:      false,
  loginUser:      '',
  loginPass:      '',
  loginMode:      'BASIC_AUTH' as 'BASIC_AUTH' | 'UI_LOGIN',
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
  const pin = settingsState.settings.appLockPin
  return typeof pin === 'string' && pin.length >= 4
}

function handleProbeSuccess(gen: number) {
  if (gen !== probeGeneration) return
  boot.failed             = false
  boot.skipped            = false
  boot.serverProbeOk      = true
  authVerifiedState.value = true
  appState.authenticated  = true
  appState.status         = pinLockEnabled() ? 'locked' : 'ready'
}

function showLoginForm(
  gen:      number,
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  user:     string,
) {
  if (gen !== probeGeneration) return
  boot.loginUser          = user
  boot.loginMode          = authMode === 'UI_LOGIN' ? 'UI_LOGIN' : 'BASIC_AUTH'
  boot.loginRequired      = true
  authVerifiedState.value = false
  appState.authRequired   = true
  appState.status         = 'ready'
}

function handleAuthRequired(
  gen:      number,
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  user:     string,
  pass:     string,
) {
  if (gen !== probeGeneration) return
  if (boot.skipped) return
  boot.failed       = false
  appState.authMode = authMode

  if (authMode === 'BASIC_AUTH' && user && pass) {
    loginBasic(user, pass)
    handleProbeSuccess(gen)
    return
  }

  if (authMode === 'UI_LOGIN' && user && pass) {
    loginUI(user, pass)
      .then(() => handleProbeSuccess(gen))
      .catch(() => showLoginForm(gen, authMode, user))
    return
  }

  showLoginForm(gen, authMode, user)
}

export async function startProbe(
  authMode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN' = 'NONE',
  user = '',
  pass = '',
  initialDelay = 100,
): Promise<void> {
  const gen = ++probeGeneration
  boot.failed             = false
  boot.loginRequired      = false
  boot.skipped            = false
  boot.serverProbeOk      = false
  authVerifiedState.value = false
  appState.status         = 'booting'
  appState.authMode       = authMode

  const baseUrl = settingsState.settings.serverUrl ?? 'http://127.0.0.1:4567'
  configureAuth(baseUrl, authMode, user || undefined, pass || undefined)

  let tries = 0

  async function probe() {
    if (gen !== probeGeneration) return
    tries++
    const result = await probeServer()
    if (gen !== probeGeneration) return

    if (result === 'ok')            { handleProbeSuccess(gen); return }
    if (result === 'auth_required') { handleAuthRequired(gen, authMode, user, pass); return }
    const maxAttempts = appState.platform === 'tauri' ? MAX_ATTEMPTS : WEB_MAX_ATTEMPTS
    if (tries >= maxAttempts)       { boot.failed = true; appState.status = 'error'; startBackgroundProbe(gen, authMode, user, pass); return }

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
  const user = boot.loginUser.trim()
  const pass = boot.loginPass.trim()
  try {
    if (boot.loginMode === 'UI_LOGIN') {
      await loginUI(user, pass)
    } else {
      await verifyBasicAuth(user, pass)
    }

    updateSettings({
      serverAuthMode: boot.loginMode,
      serverAuthUser: user,
      serverAuthPass: pass,
    })
    appState.authMode = boot.loginMode

    boot.loginRequired      = false
    boot.sessionExpired     = false
    boot.skipped            = false
    boot.loginPass          = ''
    boot.loginError         = null
    boot.serverProbeOk      = true
    authVerifiedState.value = true
    appState.authenticated  = true
    appState.authRequired   = false
    appState.status         = pinLockEnabled() ? 'locked' : 'ready'
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
  boot.loginRequired      = false
  boot.sessionExpired     = false
  boot.skipped            = true
  authVerifiedState.value = true
  appState.authRequired   = false
  appState.status         = 'ready'
  startBackgroundProbe(probeGeneration, authMode, user, pass)
}