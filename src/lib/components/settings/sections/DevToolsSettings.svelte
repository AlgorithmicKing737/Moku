<script lang="ts">
  import ThreeDCard from '$lib/components/shared/manga/ThreeDCard.svelte'
  import { appState } from '$lib/state/app.svelte'
  import { addToast as toast } from '$lib/state/notifications.svelte'
  import { settingsState } from '$lib/state/settings.svelte'
  import { cache } from '$lib/core/cache/queryCache'
  import { getUiAuthDebugStatus, refreshUiAccessToken, type UiAuthDebugStatus } from '$lib/core/auth'
  import { invoke } from '@tauri-apps/api/core'

  interface PerfSnapshot { cacheEntries: number; cacheKeys: string[]; oldestEntryMs: number | null; newestEntryMs: number | null }

  let perfSnapshot    = $state<PerfSnapshot | null>(null)
  let splashTriggered = $state(false)
  let expOpen         = $state(false)
  let appVersion      = $state('…')
  let helloAvailable  = $state<boolean | null>(null)
  let helloBusy       = $state(false)
  let authStatus      = $state<UiAuthDebugStatus | null>(null)
  let authRefreshBusy = $state(false)

  $effect(() => {
    import('@tauri-apps/api/app').then(m => m.getVersion()).then(v => appVersion = v).catch(() => {})
    refreshPerfMetrics()
    refreshAuthStatus()
    invoke<boolean>('windows_hello_available').then(v => helloAvailable = v).catch(() => helloAvailable = false)
    const timer = setInterval(() => refreshAuthStatus(), 1000)
    return () => clearInterval(timer)
  })

  function refreshAuthStatus() { authStatus = getUiAuthDebugStatus() }

  function fmtCountdown(ms: number | null): string {
    if (ms === null) return '—'
    if (ms <= 0) return 'expired'
    const total = Math.floor(ms / 1000)
    const month = 30 * 24 * 60 * 60
    const day   = 24 * 60 * 60
    const hour  = 60 * 60
    const minute = 60
    const months = Math.floor(total / month)
    const days   = Math.floor((total % month) / day)
    const hours  = Math.floor(total / 3600)
    const remainingHours = Math.floor((total % day) / hour)
    const mins = Math.floor((total % hour) / minute)
    const secs = total % 60
    if (months > 0) return days > 0 ? `${months}mo ${days}d` : `${months}mo`
    if (days > 0) return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  function fmtTime(ts: number | null): string {
    if (ts === null) return '—'
    return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })
  }

  async function forceTokenRefresh() {
    authRefreshBusy = true
    try {
      const token = await refreshUiAccessToken(true)
      toast({
        kind: token ? 'success' : 'info',
        title: 'UI auth refresh',
        body: token ? 'Refresh succeeded' : 'No refreshed token available',
      })
    } catch (e: any) {
      toast({ kind: 'error', title: 'UI auth refresh', body: String(e?.message ?? e) })
    } finally {
      authRefreshBusy = false
      refreshAuthStatus()
    }
  }

  function refreshPerfMetrics() {
    let entries = 0, oldest: number | null = null, newest: number | null = null
    const foundKeys: string[] = []
    const checkKey = (k: string) => {
      const age = cache?.ageOf?.(k)
      if (age !== undefined) {
        entries++
        foundKeys.push(k)
        const ts = Date.now() - age
        if (oldest === null || ts < oldest) oldest = ts
        if (newest === null || ts > newest) newest = ts
      }
    }
    ['library', 'sources', 'popular'].forEach(checkKey);
    ['Action','Romance','Fantasy','Comedy','Drama','Horror','Sci-Fi','Adventure','Thriller',
     'Isekai','Supernatural','Historical','Psychological','Sports','Mystery','Mecha',
     'Slice of Life','School Life','Martial Arts','Magic','Military'].forEach(g => checkKey(`genre:${g}`))
    perfSnapshot = { cacheEntries: entries, cacheKeys: foundKeys, oldestEntryMs: oldest, newestEntryMs: newest }
  }

  function fmtAge(ts: number | null) {
    if (ts === null) return '—'
    const secs = Math.floor((Date.now() - ts) / 1000)
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  function triggerSplash() {
    if (appState.devSplash) return
    splashTriggered = true
    setTimeout(() => splashTriggered = false, 200)
    appState.devSplash = true
  }

  async function testWindowsHello() {
    helloBusy = true
    try {
      await invoke('windows_hello_authenticate', { reason: 'Moku devtools test' })
      toast({ kind: 'success', title: 'Windows Hello', body: 'Verified successfully' })
    } catch (e: any) {
      toast({ kind: 'error', title: 'Windows Hello', body: String(e) })
    } finally { helloBusy = false }
  }
</script>

<div class="s-panel">

  <div class="s-section">
    <p class="s-section-title">Toasts</p>
    <div class="s-section-body">
      <div class="s-row">
        <div class="s-row-info"><span class="s-label">Fire test toast</span><span class="s-desc">Triggers each kind with realistic content</span></div>
        <div class="s-dev-pill-group">
          {#each (['success', 'error', 'info', 'download'] as const) as kind (kind)}
            {@const label = kind === 'success' ? 'S' : kind === 'error' ? 'E' : kind === 'info' ? 'I' : 'D'}
            {@const title = kind === 'success' ? 'Library updated' : kind === 'error' ? 'Could not reach server' : kind === 'info' ? 'Already up to date' : 'Download complete'}
            {@const body  = kind === 'success' ? '3 new chapters across 2 series' : kind === 'error' ? 'Connection refused on port 4567' : kind === 'info' ? 'No new chapters found' : 'Berserk · Ch. 372 ready to read'}
            <button class="s-dev-pill {kind}" onclick={() => toast({ kind, title, body })}>{label}</button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="s-section">
    <p class="s-section-title">Previews</p>
    <div class="s-section-body">
      <div class="s-row">
        <div class="s-row-info"><span class="s-label">Idle splash</span><span class="s-desc">Dismiss with any click or key</span></div>
        <button class="s-btn" class:s-btn-accent={splashTriggered} onclick={triggerSplash}>Show</button>
      </div>
    </div>
  </div>

  <div class="s-section">
    <p class="s-section-title">Biometrics</p>
    <div class="s-section-body">
      <div class="s-row">
        <div class="s-row-info">
          <span class="s-label">Windows Hello</span>
          <span class="s-desc">Available: {helloAvailable === null ? '…' : helloAvailable ? 'yes' : 'no'}</span>
        </div>
        <button class="s-btn" disabled={!helloAvailable || helloBusy} onclick={testWindowsHello}>
          {helloBusy ? '…' : 'Test'}
        </button>
      </div>
    </div>
  </div>

  <div class="s-section">
    <button class="s-collapsible-trigger" onclick={() => expOpen = !expOpen} aria-expanded={expOpen}>
      <span class="s-label">Experimental</span>
      <svg class="s-collapsible-caret" class:open={expOpen} width="10" height="6" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6" fill="currentColor"/></svg>
    </button>
    {#if expOpen}
      <div class="s-collapsible-body">
        <div class="s-row" style="flex-direction:column;align-items:flex-start;gap:var(--sp-3)">
          <span class="s-desc">3D tilt cards — hover to preview</span>
          <div style="display:flex;gap:var(--sp-3)">
            {#each [{ title: 'Berserk', sub: 'Ch. 372', hue: '265' }, { title: 'Vinland Saga', sub: 'Ch. 208', hue: '200' }, { title: 'Dungeon Meshi', sub: 'Ch. 97', hue: '140' }] as card (card.title)}
              <ThreeDCard>
                <div style="width:72px;height:100px;border-radius:var(--radius-md);background:hsl({card.hue},40%,18%);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:var(--sp-2)">
                  <span style="font-size:var(--text-2xs);color:var(--text-secondary);text-align:center;line-height:1.2">{card.title}</span>
                  <span style="font-size:10px;color:var(--text-faint)">{card.sub}</span>
                </div>
              </ThreeDCard>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="s-section">
    <p class="s-section-title">Runtime</p>
    <div class="s-section-body">
      <div class="s-dev-grid">
        <span class="s-dev-key">Filter</span>  <span class="s-dev-val">{appState.libraryFilter}</span>
        <span class="s-dev-key">Folders</span> <span class="s-dev-val">{appState.categories.filter(c => c.id !== 0).map(c => c.name).join(', ') || 'none'}</span>
        <span class="s-dev-key">History</span> <span class="s-dev-val">{appState.history?.length ?? 0} entries</span>
        <span class="s-dev-key">Cache</span>   <span class="s-dev-val">{perfSnapshot?.cacheEntries ?? '—'} entries</span>
        <span class="s-dev-key">Toasts</span> <span class="s-dev-val">{appState.toasts.length} queued</span>
        <span class="s-dev-key">Version</span> <span class="s-dev-val">{appVersion} · {import.meta.env.MODE}</span>
      </div>
      <div class="s-row">
        <div class="s-row-info">
          {#if perfSnapshot && perfSnapshot.cacheEntries > 0}
            <span class="s-desc">{perfSnapshot.cacheKeys.join(', ')}</span>
            <span class="s-desc">Oldest: {fmtAge(perfSnapshot.oldestEntryMs)} · Newest: {fmtAge(perfSnapshot.newestEntryMs)}</span>
          {/if}
        </div>
        <button class="s-btn-icon" onclick={refreshPerfMetrics} title="Refresh cache stats">↺</button>
      </div>
    </div>
  </div>

  <div class="s-section">
    <p class="s-section-title">Auth (UI Login)</p>
    <div class="s-section-body">
      <div class="s-dev-grid">
        <span class="s-dev-key">Mode</span>               <span class="s-dev-val">{authStatus?.mode ?? '—'}</span>
        <span class="s-dev-key">Session</span>            <span class="s-dev-val">{authStatus?.hasSession ? 'present' : 'none'}</span>
        <span class="s-dev-key">Refresh token</span>      <span class="s-dev-val">{authStatus?.hasRefreshToken ? 'present' : 'none'}</span>
        <span class="s-dev-key">Access expires in</span>  <span class="s-dev-val">{fmtCountdown(authStatus?.accessExpiresInMs ?? null)}</span>
        <span class="s-dev-key">Refresh expires in</span> <span class="s-dev-val">{fmtCountdown(authStatus?.refreshExpiresInMs ?? null)}</span>
        <span class="s-dev-key">Refresh window</span>     <span class="s-dev-val">{authStatus?.shouldRefreshSoon ? 'open' : 'not yet'}</span>
        <span class="s-dev-key">Refresh in-flight</span>  <span class="s-dev-val">{authStatus?.refreshInFlight ? 'yes' : 'no'}</span>
      </div>
      <div class="s-row">
        <div class="s-row-info">
          <span class="s-desc">Access expiry at: {fmtTime(authStatus?.accessExpiresAt ?? null)}</span>
          <span class="s-desc">Refresh expiry at: {fmtTime(authStatus?.refreshExpiresAt ?? null)}</span>
          <span class="s-desc">Skew window: {Math.round((authStatus?.skewMs ?? 0) / 1000)}s before expiry</span>
        </div>
        <div class="s-btn-row">
          <button class="s-btn" onclick={refreshAuthStatus}>Refresh</button>
          <button class="s-btn s-btn-accent" onclick={forceTokenRefresh}
            disabled={authRefreshBusy || authStatus?.mode !== 'UI_LOGIN' || !authStatus?.hasRefreshToken}>
            {authRefreshBusy ? 'Refreshing…' : 'Force refresh'}
          </button>
        </div>
      </div>
    </div>
  </div>

</div>