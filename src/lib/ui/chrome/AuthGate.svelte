<script lang="ts">
  import logoUrl from '$lib/assets/moku-icon-splash.svg'
  import { appState } from '$lib/state/app.svelte'
  import { loginUI, loginBasic, configureAuth } from '$lib/core/auth'

  let loginUser  = $state('')
  let loginPass  = $state('')
  let loginBusy  = $state(false)
  let loginError = $state<string | null>(null)

  async function handleLogin() {
    if (!loginUser.trim() || !loginPass.trim()) return
    loginBusy  = true
    loginError = null
    try {
      if (appState.authMode === 'UI_LOGIN') {
        await loginUI(loginUser.trim(), loginPass.trim())
      } else {
        await loginBasic(loginUser.trim(), loginPass.trim())
      }
      appState.authenticated = true
      appState.status        = 'ready'
    } catch (e) {
      loginError = e instanceof Error ? e.message : String(e)
    } finally {
      loginBusy = false
    }
  }

  function handleBypass() {
    appState.authenticated = false
    appState.status        = 'ready'
  }
</script>

{#if appState.status === 'auth'}
  <div class="overlay">
    <div class="card anim-scale-in">
      <img src={logoUrl} alt="Moku" class="logo" />
      <p class="title">moku</p>
      <span class="mode-badge">
        {appState.authMode === 'UI_LOGIN' ? 'UI Login' : 'Basic Auth'}
      </span>
      <p class="host">{appState.serverUrl || 'localhost:4567'}</p>

      {#if loginError}
        <p class="error">{loginError}</p>
      {/if}

      <div class="fields">
        <input
          class="input"
          type="text"
          placeholder="Username"
          bind:value={loginUser}
          disabled={loginBusy}
          autocomplete="username"
          onkeydown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <input
          class="input"
          type="password"
          placeholder="Password"
          bind:value={loginPass}
          disabled={loginBusy}
          autocomplete="current-password"
          onkeydown={(e) => e.key === 'Enter' && handleLogin()}
        />
      </div>

      <button
        class="btn"
        onclick={handleLogin}
        disabled={loginBusy || !loginUser.trim() || !loginPass.trim()}
      >
        {loginBusy ? 'Signing in…' : 'Sign in'}
      </button>
      <button class="btn btn--ghost" onclick={handleBypass}>Skip</button>
    </div>
  </div>
{/if}

<style>
  .overlay   { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; pointer-events:none; }
  .card      { pointer-events:auto; width:min(280px, calc(100vw - 48px)); background:var(--bg-surface); border:1px solid var(--border-base); border-radius:var(--radius-xl); padding:var(--sp-6) var(--sp-5); display:flex; flex-direction:column; align-items:center; gap:var(--sp-3); box-shadow:0 32px 80px rgba(0,0,0,0.75); text-align:center; }

  .logo       { width:56px; height:56px; border-radius:14px; display:block; }
  .title      { font-family:var(--font-ui); font-size:11px; font-weight:500; letter-spacing:0.26em; text-transform:uppercase; color:var(--text-secondary); margin:-6px 0 0; user-select:none; }
  .mode-badge { font-family:var(--font-ui); font-size:var(--text-2xs); letter-spacing:var(--tracking-wider); text-transform:uppercase; color:var(--accent-fg); background:var(--accent-muted); border:1px solid var(--accent-dim); border-radius:var(--radius-full); padding:2px 10px; }
  .host       { font-family:var(--font-ui); font-size:var(--text-xs); color:var(--text-faint); letter-spacing:var(--tracking-wide); margin:-4px 0 0; }
  .error      { font-family:var(--font-ui); font-size:var(--text-xs); color:var(--color-error); background:var(--color-error-bg); border:1px solid var(--color-error); border-radius:var(--radius-sm); padding:var(--sp-2) var(--sp-3); width:100%; box-sizing:border-box; }

  .fields { display:flex; flex-direction:column; gap:var(--sp-2); width:100%; }
  .input  { width:100%; background:var(--bg-raised); border:1px solid var(--border-strong); border-radius:var(--radius-md); padding:8px 12px; font-size:var(--text-sm); color:var(--text-primary); outline:none; box-sizing:border-box; transition:border-color var(--t-base), box-shadow var(--t-base); font-family:inherit; }
  .input:focus    { border-color:var(--border-focus); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
  .input:disabled { opacity:0.5; }

  .btn               { width:100%; padding:9px; border-radius:var(--radius-md); background:var(--accent); border:1px solid var(--accent); color:var(--accent-fg); font-size:var(--text-sm); font-family:var(--font-ui); letter-spacing:var(--tracking-wide); cursor:pointer; transition:opacity var(--t-base); }
  .btn:hover:not(:disabled) { opacity:0.85; }
  .btn:disabled      { opacity:0.35; cursor:default; }
  .btn--ghost        { background:none; border-color:transparent; color:var(--text-faint); font-size:var(--text-xs); padding:4px; }
  .btn--ghost:hover:not(:disabled) { color:var(--text-muted); opacity:1; }
</style>