<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
  import { requestManager } from '$lib/request-manager'
  import { retryBoot } from '$lib/state/boot.svelte'
  import { authSession, configureAuth } from '$lib/core/auth'
  import { invoke } from '@tauri-apps/api/core'

  interface Props { selectOpen: string | null; toggleSelect: (id: string) => void }
  let { selectOpen, toggleSelect }: Props = $props()

  let showAuthPass  = $state(false)
  let showSocksPass = $state(false)
  let secLoading    = $state(false)
  let secError      = $state<string | null>(null)
  let secSaved      = $state<string | null>(null)
  let secLoaded     = $state(false)

  function normalizeForUI(mode: string | undefined): 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN' {
    if (mode === 'BASIC_AUTH' || mode === 'UI_LOGIN') return mode
    return 'NONE'
  }

  let authMode     = $state(normalizeForUI(settingsState.settings.serverAuthMode))
  let authUsername = $state(settingsState.settings.serverAuthUser ?? '')
  let authPassword = $state('')
  let authDirty    = $state(false)

  let socksEnabled  = $state(settingsState.settings.socksProxyEnabled ?? false)
  let socksHost     = $state(settingsState.settings.socksProxyHost ?? '')
  let socksPort     = $state(settingsState.settings.socksProxyPort ?? '1080')
  let socksVersion  = $state(settingsState.settings.socksProxyVersion ?? 5)
  let socksUsername = $state(settingsState.settings.socksProxyUsername ?? '')
  let socksPassword = $state(settingsState.settings.socksProxyPassword ?? '')

  let flareEnabled  = $state(settingsState.settings.flareSolverrEnabled ?? false)
  let flareUrl      = $state(settingsState.settings.flareSolverrUrl ?? 'http://localhost:8191')
  let flareTimeout  = $state(settingsState.settings.flareSolverrTimeout ?? 60)
  let flareSession  = $state(settingsState.settings.flareSolverrSessionName ?? 'moku')
  let flareTtl      = $state(settingsState.settings.flareSolverrSessionTtl ?? 15)
  let flareFallback = $state(settingsState.settings.flareSolverrAsResponseFallback ?? false)

  let lockEnabled = $state(settingsState.settings.appLockEnabled ?? false)
  let lockPin     = $state(settingsState.settings.appLockEnabled ? (settingsState.settings.appLockPin ?? '') : '')
  let lockPinVis  = $state(false)
  let lockError   = $state<string | null>(null)
  let lockSaved   = $state(false)

  function onLockToggle() {
    lockEnabled = !lockEnabled
    lockError   = null
    lockSaved   = false
    if (!lockEnabled) {
      lockPin = ''
      updateSettings({ appLockEnabled: false, appLockPin: '' })
    }
  }

  function onLockPinInput() {
    lockPin   = lockPin.replace(/\D/g, '')
    lockError = null
    lockSaved = false
  }

  function saveLockPin() {
    if (lockPin.length < 4) { lockError = 'PIN must be at least 4 digits'; return }
    updateSettings({ appLockEnabled: true, appLockPin: lockPin })
    lockSaved = true
    setTimeout(() => lockSaved = false, 2000)
  }

  function showSaved(key: string) {
    secSaved = key; secError = null
    setTimeout(() => { if (secSaved === key) secSaved = null }, 2000)
  }

  $effect(() => {
    if (!secLoaded) { secLoaded = true; loadServerSecurity() }
  })

  async function loadServerSecurity() {
    try {
      const s = await requestManager.extensions.getServerSecurity()
      if (!authDirty) {
        authMode     = normalizeForUI(s.authMode)
        authUsername = s.authUsername || ''
        updateSettings({ serverAuthMode: authMode, serverAuthUser: authUsername })
      }
      socksEnabled = s.socksProxyEnabled; socksHost = s.socksProxyHost
      socksPort = s.socksProxyPort; socksVersion = s.socksProxyVersion
      socksUsername = s.socksProxyUsername
      flareEnabled = s.flareSolverrEnabled; flareUrl = s.flareSolverrUrl
      flareTimeout = s.flareSolverrTimeout; flareSession = s.flareSolverrSessionName
      flareTtl = s.flareSolverrSessionTtl; flareFallback = s.flareSolverrAsResponseFallback
      updateSettings({
        socksProxyEnabled: socksEnabled, socksProxyHost: socksHost, socksProxyPort: socksPort,
        socksProxyVersion: socksVersion, socksProxyUsername: socksUsername,
        flareSolverrEnabled: flareEnabled, flareSolverrUrl: flareUrl,
        flareSolverrTimeout: flareTimeout, flareSolverrSessionName: flareSession,
        flareSolverrSessionTtl: flareTtl, flareSolverrAsResponseFallback: flareFallback,
      })
    } catch (e: any) {
      console.warn('[SecuritySettings] loadServerSecurity failed:', e?.message ?? e)
    }
  }

  async function saveAuth() {
    if (authMode === 'NONE') { await clearAuth(); return }
    if (!authUsername.trim() || !authPassword.trim()) { secError = 'Username and password are required'; return }
    secLoading = true; secError = null
    try {
      const newUser = authUsername.trim()
      const newPass = authPassword.trim()
      await requestManager.extensions.setServerAuth({ authMode, authUsername: newUser, authPassword: newPass })
      authSession.clearTokens()
      updateSettings({ serverAuthMode: authMode as any, serverAuthUser: newUser, serverAuthPass: newPass })
      configureAuth(settingsState.settings.serverUrl ?? '', authMode as any, newUser, authMode === 'BASIC_AUTH' ? newPass : undefined)
      authPassword = ''
      authDirty    = false
      showSaved('auth')
      retryBoot(authMode as any, newUser, newPass)
    } catch (e: any) {
      secError = e?.message ?? 'Failed to save authentication settings'
    } finally { secLoading = false }
  }

  async function clearAuth() {
    secLoading = true; secError = null
    const prev = { mode: settingsState.settings.serverAuthMode, user: settingsState.settings.serverAuthUser, pass: settingsState.settings.serverAuthPass }
    try {
      await requestManager.extensions.setServerAuth({ authMode: 'NONE', authUsername: '', authPassword: '' })
      authSession.clearTokens()
      configureAuth(settingsState.settings.serverUrl ?? '', 'NONE')
      updateSettings({ serverAuthMode: 'NONE', serverAuthUser: '', serverAuthPass: '' })
      authMode = 'NONE'; authUsername = ''; authPassword = ''; authDirty = false
      showSaved('auth')
    } catch (e: any) {
      updateSettings({ serverAuthMode: prev.mode, serverAuthUser: prev.user, serverAuthPass: prev.pass })
      secError = e?.message ?? 'Failed to disable authentication'
    } finally { secLoading = false }
  }

  async function saveSocksProxy() {
    secLoading = true; secError = null
    try {
      await requestManager.extensions.setSocksProxy({
        socksProxyEnabled: socksEnabled, socksProxyHost: socksHost.trim(),
        socksProxyPort: socksPort.trim(), socksProxyVersion: socksVersion,
        socksProxyUsername: socksUsername.trim(), socksProxyPassword: socksPassword.trim(),
      })
      updateSettings({
        socksProxyEnabled: socksEnabled, socksProxyHost: socksHost,
        socksProxyPort: socksPort, socksProxyVersion: socksVersion,
        socksProxyUsername: socksUsername, socksProxyPassword: socksPassword,
      })
      showSaved('socks')
    } catch (e: any) {
      secError = e?.message ?? 'Failed to save SOCKS proxy'
    } finally { secLoading = false }
  }

  async function saveFlareSolverr() {
    secLoading = true; secError = null
    try {
      await requestManager.extensions.setFlareSolverr({
        flareSolverrEnabled: flareEnabled, flareSolverrUrl: flareUrl.trim(),
        flareSolverrTimeout: flareTimeout, flareSolverrSessionName: flareSession.trim(),
        flareSolverrSessionTtl: flareTtl, flareSolverrAsResponseFallback: flareFallback,
      })
      updateSettings({
        flareSolverrEnabled: flareEnabled, flareSolverrUrl: flareUrl,
        flareSolverrTimeout: flareTimeout, flareSolverrSessionName: flareSession,
        flareSolverrSessionTtl: flareTtl, flareSolverrAsResponseFallback: flareFallback,
      })
      showSaved('flare')
    } catch (e: any) {
      secError = e?.message ?? 'Failed to save FlareSolverr'
    } finally { secLoading = false }
  }

  async function pickFlareSolverrBinary() {
    const path = await invoke<string | null>('pick_flaresolverr_binary')
    if (path) updateSettings({ flareSolverrBinary: path })
  }

  function forceResetAuth() {
    authSession.clearTokens()
    authMode = 'NONE'
    authUsername = ''
    authPassword = ''
    authDirty = false
    updateSettings({ serverAuthMode: 'NONE', serverAuthUser: '', serverAuthPass: '' })
    showSaved('auth')
  }

  const EyeOpen  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
  const EyeClose = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
</script>

<div class="s-panel">

  {#if secError}
    <div class="s-banner s-banner-error">{secError}</div>
  {/if}

  <div class="s-section">
    <p class="s-section-title">
      Server Authentication
      <span class="s-pill" class:on={settingsState.settings.serverAuthMode === 'BASIC_AUTH' || settingsState.settings.serverAuthMode === 'UI_LOGIN'}>
        {settingsState.settings.serverAuthMode === 'BASIC_AUTH' ? 'Basic Auth' :
         settingsState.settings.serverAuthMode === 'UI_LOGIN'   ? 'UI Login'  : 'Disabled'}
      </span>
    </p>
    <div class="s-section-body">
      <div class="s-row">
        <div class="s-row-info"><span class="s-label">Mode</span><span class="s-desc">How Moku authenticates with the server</span></div>
        <div class="s-segment">
          {#each [{ value: 'NONE', label: 'None' }, { value: 'BASIC_AUTH', label: 'Basic' }, { value: 'UI_LOGIN', label: 'UI Login' }] as opt}
            <button class="s-segment-btn" class:active={authMode === opt.value}
              onclick={() => { authMode = opt.value as any; authPassword = ''; authDirty = true }} disabled={secLoading}>{opt.label}</button>
          {/each}
        </div>
      </div>
      {#if authMode !== 'NONE'}
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Username</span></div>
          <input class="s-input" bind:value={authUsername} oninput={() => authDirty = true} placeholder="Username" autocomplete="off" spellcheck="false" disabled={secLoading} />
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Password</span></div>
          <div class="s-field-wrap">
            <input class="s-input" type={showAuthPass ? 'text' : 'password'} bind:value={authPassword} oninput={() => authDirty = true} placeholder="Password" autocomplete="off" spellcheck="false" disabled={secLoading} />
            <button class="s-eye-btn" onclick={() => showAuthPass = !showAuthPass} tabindex="-1" aria-label={showAuthPass ? 'Hide password' : 'Show password'}>{@html showAuthPass ? EyeClose : EyeOpen}</button>
          </div>
        </div>
      {/if}
      {#if authMode !== 'NONE' && settingsState.settings.serverAuthMode === authMode && !authPassword}
        <div class="s-row">
          <span class="s-desc" style="color: var(--text-muted)">Re-enter your password to update credentials.</span>
        </div>
      {/if}
      {#if settingsState.settings.serverAuthMode === 'BASIC_AUTH'}
        <div class="s-row">
          <span class="s-desc">Images are proxied through Tauri when Basic Auth is active, which reduces loading speed.</span>
        </div>
      {/if}
      <div class="s-row">
        <div class="s-row-info">
          <button class="s-ghost-btn" onclick={forceResetAuth} disabled={secLoading} title="Force reset local auth state">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
        </div>
        <div class="s-btn-row">
          {#if settingsState.settings.serverAuthMode !== 'NONE'}
            <button class="s-btn s-btn-danger" onclick={clearAuth} disabled={secLoading}>
              {secLoading ? 'Saving…' : 'Disable'}
            </button>
          {/if}
          <button class="s-btn s-btn-accent" onclick={saveAuth}
            disabled={secLoading || (authMode !== 'NONE' && (!authUsername.trim() || !authPassword.trim()))}>
            {#if secLoading}
              Saving…
            {:else if secSaved === 'auth'}
              Saved ✓
            {:else if authMode === 'NONE'}
              Save
            {:else}
              {authDirty ? 'Enable' : 'Save'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="s-section">
    <p class="s-section-title">SOCKS Proxy</p>
    <div class="s-section-body">
      <label class="s-row">
        <div class="s-row-info"><span class="s-label">Enable SOCKS proxy</span><span class="s-desc">Route Suwayomi traffic through a SOCKS4/5 proxy</span></div>
        <button role="switch" aria-checked={socksEnabled} aria-label="Enable SOCKS proxy" class="s-toggle" class:on={socksEnabled}
          onclick={() => { socksEnabled = !socksEnabled; saveSocksProxy() }}><span class="s-toggle-thumb"></span></button>
      </label>
      {#if socksEnabled}
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Version</span></div>
          <div class="s-select" id="socks-ver">
            <button class="s-select-btn" onclick={() => toggleSelect('socks-ver')}>
              <span>SOCKS{socksVersion}</span>
              <svg class="s-select-caret" class:open={selectOpen === 'socks-ver'} width="10" height="6" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6" fill="currentColor"/></svg>
            </button>
            {#if selectOpen === 'socks-ver'}
              <div class="s-select-menu">
                {#each [[4, 'SOCKS4'], [5, 'SOCKS5']] as [v, l]}
                  <button class="s-select-option" class:active={socksVersion === v} onclick={() => { socksVersion = v as number; toggleSelect('socks-ver') }}>{l}</button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Host</span></div>
          <input class="s-input" bind:value={socksHost} placeholder="127.0.0.1" autocomplete="off" spellcheck="false" />
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Port</span></div>
          <input class="s-input" style="width:80px" bind:value={socksPort} placeholder="1080" autocomplete="off" spellcheck="false" />
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Username</span><span class="s-desc">Optional</span></div>
          <input class="s-input" bind:value={socksUsername} placeholder="Username" autocomplete="off" spellcheck="false" />
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Password</span><span class="s-desc">Optional</span></div>
          <div class="s-field-wrap">
            <input class="s-input" type={showSocksPass ? 'text' : 'password'} bind:value={socksPassword} placeholder="Password" autocomplete="off" spellcheck="false" />
            <button class="s-eye-btn" onclick={() => showSocksPass = !showSocksPass} tabindex="-1" aria-label={showSocksPass ? 'Hide password' : 'Show password'}>{@html showSocksPass ? EyeClose : EyeOpen}</button>
          </div>
        </div>
        <div class="s-row">
          <div class="s-row-info"></div>
          <button class="s-btn s-btn-accent" onclick={saveSocksProxy} disabled={secLoading}>
            {secLoading ? 'Saving…' : secSaved === 'socks' ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div class="s-section">
    <p class="s-section-title">App Lock</p>
    <div class="s-section-body">
      <label class="s-row">
        <div class="s-row-info">
          <span class="s-label">Require PIN on launch</span>
          <span class="s-desc">Lock the app behind a numeric PIN when it opens</span>
        </div>
        <button role="switch" aria-checked={lockEnabled} aria-label="Enable app lock" class="s-toggle" class:on={lockEnabled}
          onclick={onLockToggle}><span class="s-toggle-thumb"></span></button>
      </label>
      {#if lockEnabled}
        {#if lockError}
          <div class="s-banner s-banner-error" style="margin: 0">{lockError}</div>
        {/if}
        <div class="s-row">
          <div class="s-row-info">
            <span class="s-label">PIN</span>
            <span class="s-desc">Minimum 4 digits</span>
          </div>
          <div class="s-pin-row">
            <div class="s-field-wrap">
              <input class="s-input" type={lockPinVis ? 'text' : 'password'} inputmode="numeric" pattern="\d*"
                bind:value={lockPin} oninput={onLockPinInput} placeholder="••••" autocomplete="off" spellcheck="false" maxlength="8" />
              <button class="s-eye-btn" onclick={() => lockPinVis = !lockPinVis} tabindex="-1" aria-label={lockPinVis ? 'Hide PIN' : 'Show PIN'}>{@html lockPinVis ? EyeClose : EyeOpen}</button>
            </div>
            <button class="s-btn s-btn-accent" onclick={saveLockPin} disabled={!lockPin}>
              {lockSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="s-section">
    <p class="s-section-title">FlareSolverr</p>
    <div class="s-section-body">
      <label class="s-row">
        <div class="s-row-info"><span class="s-label">Enable FlareSolverr</span><span class="s-desc">Bypass Cloudflare challenges for sources that require it</span></div>
        <button role="switch" aria-checked={flareEnabled} aria-label="Enable FlareSolverr" class="s-toggle" class:on={flareEnabled}
          onclick={() => { flareEnabled = !flareEnabled; saveFlareSolverr() }}><span class="s-toggle-thumb"></span></button>
      </label>
      {#if flareEnabled}
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">URL</span><span class="s-desc">FlareSolverr instance address</span></div>
          <input class="s-input" bind:value={flareUrl} placeholder="http://localhost:8191" autocomplete="off" spellcheck="false" />
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Timeout</span><span class="s-desc">Max wait per request, in seconds</span></div>
          <div class="s-stepper">
            <button class="s-step-btn" onclick={() => flareTimeout = Math.max(10, flareTimeout - 10)}>−</button>
            <span class="s-step-val">{flareTimeout}s</span>
            <button class="s-step-btn" onclick={() => flareTimeout = Math.min(300, flareTimeout + 10)}>+</button>
          </div>
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Session name</span><span class="s-desc">Reuse browser session across requests</span></div>
          <input class="s-input" bind:value={flareSession} placeholder="moku" autocomplete="off" spellcheck="false" />
        </div>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">Session TTL</span><span class="s-desc">Minutes before session is refreshed</span></div>
          <div class="s-stepper">
            <button class="s-step-btn" onclick={() => flareTtl = Math.max(1, flareTtl - 1)}>−</button>
            <span class="s-step-val">{flareTtl}m</span>
            <button class="s-step-btn" onclick={() => flareTtl = Math.min(60, flareTtl + 1)}>+</button>
          </div>
        </div>
        <label class="s-row">
          <div class="s-row-info"><span class="s-label">Response fallback</span><span class="s-desc">Use FlareSolverr's response when the direct request fails</span></div>
          <button role="switch" aria-checked={flareFallback} aria-label="Response fallback" class="s-toggle" class:on={flareFallback}
            onclick={() => flareFallback = !flareFallback}><span class="s-toggle-thumb"></span></button>
        </label>
        <div class="s-row">
          <div class="s-row-info"><span class="s-label">FlareSolverr binary</span><span class="s-desc">Path to the FlareSolverr executable — leave blank to manage it yourself</span></div>
          <div class="srv-file-group">
            <input class="s-input srv-path-input" value={settingsState.settings.flareSolverrBinary ?? ''}
              oninput={(e) => updateSettings({ flareSolverrBinary: e.currentTarget.value })}
              placeholder="flaresolverr.exe" spellcheck="false" />
            <button class="srv-file-btn" onclick={pickFlareSolverrBinary} title="Browse">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1.5 4.5h11v7a1 1 0 01-1 1h-9a1 1 0 01-1-1v-7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                <path d="M1.5 4.5l1.8-2.5h3.4l1.3 2.5" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        {#if settingsState.settings.flareSolverrBinary}
        <label class="s-row">
          <div class="s-row-info"><span class="s-label">Auto-start with Moku</span><span class="s-desc">Launch FlareSolverr on startup if it isn't already running</span></div>
          <button role="switch" aria-checked={settingsState.settings.flareSolverrAutoStart ?? false} aria-label="Auto-start FlareSolverr"
            class="s-toggle" class:on={settingsState.settings.flareSolverrAutoStart ?? false}
            onclick={() => updateSettings({ flareSolverrAutoStart: !(settingsState.settings.flareSolverrAutoStart ?? false) })}>
            <span class="s-toggle-thumb"></span>
          </button>
        </label>
        {/if}
        <div class="s-row">
          <div class="s-row-info"></div>
          <button class="s-btn s-btn-accent" onclick={saveFlareSolverr} disabled={secLoading}>
            {secLoading ? 'Saving…' : secSaved === 'flare' ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      {/if}
    </div>
  </div>

</div>

<style>
  .s-ghost-btn { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: var(--text-faint); font-family: var(--font-ui); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); cursor: pointer; padding: 2px 0; transition: color 0.15s; }
  .s-ghost-btn:hover:not(:disabled) { color: var(--color-error); }
  .s-ghost-btn:disabled { opacity: 0.35; cursor: default; }
  .s-pin-row { display: flex; align-items: center; gap: 8px; }
  .srv-file-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .srv-path-input { width: 160px; }
  .srv-file-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: var(--radius-md); border: 1px solid var(--border-dim); background: var(--bg-surface); color: var(--text-faint); cursor: pointer; transition: background var(--t-base), color var(--t-base), border-color var(--t-base); }
  .srv-file-btn:hover { background: var(--bg-overlay); color: var(--text-muted); border-color: var(--border-strong); }
</style>