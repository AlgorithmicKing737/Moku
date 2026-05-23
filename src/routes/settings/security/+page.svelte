<script lang="ts">
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'

  const authModes = [
    ['NONE', 'Disabled'],
    ['BASIC_AUTH', 'Basic auth'],
    ['SIMPLE_LOGIN', 'Simple login'],
    ['UI_LOGIN', 'UI login'],
  ] as const

  const proxyVersions = [
    [4, 'SOCKS4'],
    [5, 'SOCKS5'],
  ] as const
</script>

<svelte:head>
  <title>Settings - Security</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Security</p>
    <h2>Server access and proxy settings</h2>
    <p>Authentication, SOCKS proxy, FlareSolverr, and app lock options.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Server auth mode</div>
        <select class="settings-select" value={settingsState.serverAuthMode} onchange={(event) => updateSettings({serverAuthMode: (event.currentTarget as HTMLSelectElement).value as 'NONE' | 'BASIC_AUTH' | 'SIMPLE_LOGIN' | 'UI_LOGIN'})}>
          {#each authModes as [value, label]}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>

      <label>
        <div class="settings-label">Username</div>
        <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.serverAuthUser} oninput={(event) => updateSettings({serverAuthUser: (event.currentTarget as HTMLInputElement).value})} />
      </label>
    </div>

    <div class="settings-row settings-grid-2">
      <label>
        <div class="settings-label">Password</div>
        <input class="settings-input settings-input-wide" type="password" value={settingsState.serverAuthPass} oninput={(event) => updateSettings({serverAuthPass: (event.currentTarget as HTMLInputElement).value})} />
      </label>

      <label>
        <div class="settings-label">App lock PIN</div>
        <input class="settings-input settings-input-wide" type="password" value={settingsState.appLockPin} oninput={(event) => updateSettings({appLockPin: (event.currentTarget as HTMLInputElement).value})} />
      </label>
    </div>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">App lock</div>
        <div class="settings-desc">Require the PIN when opening the app.</div>
      </div>
      <input type="checkbox" checked={settingsState.appLockEnabled} onchange={() => updateSettings({appLockEnabled: !settingsState.appLockEnabled})} />
    </label>

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">SOCKS proxy</div>
        <div class="settings-desc">Route server requests through a SOCKS proxy.</div>
      </div>
      <input type="checkbox" checked={settingsState.socksProxyEnabled} onchange={() => updateSettings({socksProxyEnabled: !settingsState.socksProxyEnabled})} />
    </label>

    {#if settingsState.socksProxyEnabled}
      <div class="settings-row settings-grid-2">
        <label>
          <div class="settings-label">Proxy host</div>
          <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.socksProxyHost} oninput={(event) => updateSettings({socksProxyHost: (event.currentTarget as HTMLInputElement).value})} />
        </label>
        <label>
          <div class="settings-label">Proxy port</div>
          <input class="settings-input settings-input-narrow" spellcheck="false" value={settingsState.socksProxyPort} oninput={(event) => updateSettings({socksProxyPort: (event.currentTarget as HTMLInputElement).value})} />
        </label>
      </div>

      <div class="settings-row settings-grid-2">
        <label>
          <div class="settings-label">Proxy version</div>
          <select class="settings-select" value={String(settingsState.socksProxyVersion)} onchange={(event) => updateSettings({socksProxyVersion: Number((event.currentTarget as HTMLSelectElement).value)})}>
            {#each proxyVersions as [value, label]}
              <option value={String(value)}>{label}</option>
            {/each}
          </select>
        </label>
        <label>
          <div class="settings-label">Proxy username</div>
          <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.socksProxyUsername} oninput={(event) => updateSettings({socksProxyUsername: (event.currentTarget as HTMLInputElement).value})} />
        </label>
      </div>

      <label class="settings-row">
        <div>
          <div class="settings-label">Proxy password</div>
          <div class="settings-desc">Stored locally and used for outgoing requests.</div>
        </div>
        <input class="settings-input settings-input-wide" type="password" value={settingsState.socksProxyPassword} oninput={(event) => updateSettings({socksProxyPassword: (event.currentTarget as HTMLInputElement).value})} />
      </label>
    {/if}

    <label class="settings-row settings-toggle-row">
      <div>
        <div class="settings-label">FlareSolverr</div>
        <div class="settings-desc">Use FlareSolverr for sites protected by anti-bot challenges.</div>
      </div>
      <input type="checkbox" checked={settingsState.flareSolverrEnabled} onchange={() => updateSettings({flareSolverrEnabled: !settingsState.flareSolverrEnabled})} />
    </label>

    {#if settingsState.flareSolverrEnabled}
      <div class="settings-row settings-grid-2">
        <label>
          <div class="settings-label">FlareSolverr URL</div>
          <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.flareSolverrUrl} oninput={(event) => updateSettings({flareSolverrUrl: (event.currentTarget as HTMLInputElement).value})} />
        </label>
        <label>
          <div class="settings-label">Timeout</div>
          <input class="settings-input settings-input-narrow" type="number" min="1" value={settingsState.flareSolverrTimeout} oninput={(event) => updateSettings({flareSolverrTimeout: Number((event.currentTarget as HTMLInputElement).value) || 1})} />
        </label>
      </div>

      <div class="settings-row settings-grid-2">
        <label>
          <div class="settings-label">Session name</div>
          <input class="settings-input settings-input-wide" spellcheck="false" value={settingsState.flareSolverrSessionName} oninput={(event) => updateSettings({flareSolverrSessionName: (event.currentTarget as HTMLInputElement).value})} />
        </label>
        <label>
          <div class="settings-label">Session TTL</div>
          <input class="settings-input settings-input-narrow" type="number" min="1" value={settingsState.flareSolverrSessionTtl} oninput={(event) => updateSettings({flareSolverrSessionTtl: Number((event.currentTarget as HTMLInputElement).value) || 1})} />
        </label>
      </div>

      <label class="settings-row settings-toggle-row">
        <div>
          <div class="settings-label">Fallback to response mode</div>
          <div class="settings-desc">Use FlareSolverr responses directly when needed.</div>
        </div>
        <input type="checkbox" checked={settingsState.flareSolverrAsResponseFallback} onchange={() => updateSettings({flareSolverrAsResponseFallback: !settingsState.flareSolverrAsResponseFallback})} />
      </label>
    {/if}
  </div>
</section>