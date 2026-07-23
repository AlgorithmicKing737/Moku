<script lang="ts">
  import logoUrl                           from '$lib/assets/moku-icon-splash.svg'
  import { appState }                      from '$lib/state/app.svelte'
  import { authVerifiedState }             from '$lib/state/auth.svelte'
  import { boot, submitLogin, bypassBoot } from '$lib/state/boot.svelte'

  function handleBypass() {
    bypassBoot(appState.authMode, boot.loginUser, boot.loginPass)
  }

  function setMode(mode: 'BASIC_AUTH' | 'UI_LOGIN') {
    if (boot.loginBusy) return
    boot.loginMode  = mode
    boot.loginError = null
  }
</script>

{#if appState.authRequired && !authVerifiedState.value}
  <div class="overlay overlay--clear">
    <div class="card anim-scale-in">
      <img src={logoUrl} alt="Moku" class="logo" />
      <p class="title">moku</p>

      <div class="mode-toggle">
        <button
          class="mode-btn"
          class:active={boot.loginMode === 'BASIC_AUTH'}
          onclick={() => setMode('BASIC_AUTH')}
          disabled={boot.loginBusy}
        >Basic Auth</button>
        <button
          class="mode-btn"
          class:active={boot.loginMode === 'UI_LOGIN'}
          onclick={() => setMode('UI_LOGIN')}
          disabled={boot.loginBusy}
        >UI Login</button>
      </div>

      <p class="host">{appState.serverUrl || 'localhost:4567'}</p>

      {#if boot.loginError}
        <p class="error">{boot.loginError}</p>
      {/if}

      <div class="fields">
        <input
          class="input"
          type="text"
          placeholder="Username"
          bind:value={boot.loginUser}
          disabled={boot.loginBusy}
          autocomplete="username"
          onkeydown={(e) => e.key === 'Enter' && submitLogin()}
        />
        <input
          class="input"
          type="password"
          placeholder="Password"
          bind:value={boot.loginPass}
          disabled={boot.loginBusy}
          autocomplete="current-password"
          onkeydown={(e) => e.key === 'Enter' && submitLogin()}
        />
      </div>

      <button
        class="btn"
        onclick={submitLogin}
        disabled={boot.loginBusy || !boot.loginUser.trim() || !boot.loginPass.trim()}
      >
        {boot.loginBusy ? 'Signing in…' : 'Sign in'}
      </button>
      <button class="btn btn--ghost" onclick={handleBypass}>Skip</button>
    </div>
  </div>
{/if}

<style>
  .overlay       { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); animation:overlayIn 0.28s cubic-bezier(0,0,0.2,1) both; }
  .overlay--clear { background:transparent; backdrop-filter:none; pointer-events:none; }
  .overlay--clear .card { pointer-events:auto; }

  .card { width:min(280px, calc(100vw - 48px)); background:var(--bg-surface); border:1px solid var(--border-base); border-radius:var(--radius-xl); padding:var(--sp-6) var(--sp-5); display:flex; flex-direction:column; align-items:center; gap:var(--sp-3); box-shadow:0 32px 80px rgba(0,0,0,0.75); text-align:center; animation:cardIn 0.38s cubic-bezier(0.22,1,0.36,1) 0.06s both; }

  .logo         { width:56px; height:56px; border-radius:14px; display:block; position:relative; }

  .title      { font-family:var(--font-ui); font-size:11px; font-weight:500; letter-spacing:0.26em; text-transform:uppercase; color:var(--text-secondary); margin:-6px 0 0; user-select:none; }

  .mode-toggle { display:flex; gap:2px; background:var(--bg-raised); border:1px solid var(--border-strong); border-radius:var(--radius-full); padding:2px; }
  .mode-btn    { font-family:var(--font-ui); font-size:var(--text-2xs); letter-spacing:var(--tracking-wider); text-transform:uppercase; color:var(--text-faint); background:none; border:none; border-radius:var(--radius-full); padding:4px 10px; cursor:pointer; transition:color var(--t-base), background var(--t-base); }
  .mode-btn.active   { color:var(--accent-fg); background:var(--accent-muted); }
  .mode-btn:disabled { opacity:0.5; cursor:default; }

  .host       { font-family:var(--font-ui); font-size:var(--text-xs); color:var(--text-faint); letter-spacing:var(--tracking-wide); margin:-4px 0 0; }
  .error      { font-family:var(--font-ui); font-size:var(--text-xs); color:var(--color-error); background:var(--color-error-bg); border:1px solid var(--color-error); border-radius:var(--radius-sm); padding:var(--sp-2) var(--sp-3); width:100%; box-sizing:border-box; }

  .fields { display:flex; flex-direction:column; gap:var(--sp-2); width:100%; }
  .input  { width:100%; background:var(--bg-raised); border:1px solid var(--border-strong); border-radius:var(--radius-md); padding:8px 12px; font-size:var(--text-sm); color:var(--text-primary); outline:none; box-sizing:border-box; transition:border-color var(--t-base), box-shadow var(--t-base); font-family:inherit; }
  .input:focus    { border-color:var(--border-focus); box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
  .input:disabled { opacity:0.5; }

  .btn                              { width:100%; padding:9px; border-radius:var(--radius-md); background:var(--accent); border:1px solid var(--accent); color:var(--accent-fg); font-size:var(--text-sm); font-family:var(--font-ui); letter-spacing:var(--tracking-wide); cursor:pointer; transition:opacity var(--t-base); }
  .btn:hover:not(:disabled)         { opacity:0.85; }
  .btn:disabled                     { opacity:0.35; cursor:default; }
  .btn--ghost                       { background:none; border-color:transparent; color:var(--text-faint); font-size:var(--text-xs); padding:4px; }
  .btn--ghost:hover:not(:disabled)  { color:var(--text-muted); opacity:1; }

  @keyframes overlayIn { from { opacity:0 } to { opacity:1 } }
  @keyframes cardIn    { from { opacity:0; transform:translateY(28px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
  @keyframes anim-scale-in { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
  .anim-scale-in { animation:anim-scale-in 0.2s cubic-bezier(0,0,0.2,1) both; }
</style>