<script lang="ts">
  import { onMount } from 'svelte'
  import logoUrl from '$lib/assets/moku-icon-splash.svg'
  import { mountCardCanvas, ringGeometry, animateRingProgress } from '$lib/components/chrome/splashCanvas'

  interface Props {
    mode?:          'loading' | 'idle'
    ringFull?:      boolean
    failed?:        boolean
    notConfigured?: boolean
    showCards?:     boolean
    onReady?:       () => void
    onRetry?:       () => void
    onBypass?:      () => void
    onDismiss?:     () => void
  }

  let {
    mode = 'loading',
    ringFull = false,
    failed = false,
    notConfigured = false,
    showCards = true,
    onReady,
    onRetry,
    onBypass,
    onDismiss,
  }: Props = $props()

  const EXIT_MS  = 320
  const RING_R   = 70
  const RING_PAD = 12
  const { size: ringSize, c: ringC, circ: ringCirc } = ringGeometry(RING_R, RING_PAD)

  const LOGO_LOADING = 140
  const LOGO_IDLE    = 128

  let dots        = $state('')
  let ringProg    = $state(0.025)
  let exiting     = $state(false)
  let exitLock    = false
  let pinEntry    = $state('')
  let pinShake    = $state(false)
  let pinVisible  = $state(false)
  let pinUnlocked = $state(false)

  const ringArc = $derived(ringCirc * Math.min(Math.max(ringProg, 0.025), 0.999))

  function triggerExit(cb?: () => void) {
    if (exitLock) return
    exitLock = true
    exiting  = true
    setTimeout(() => cb?.(), EXIT_MS)
  }

  function submitPin(correctPin: string) {
    if (pinEntry === correctPin) {
      pinUnlocked = true
      pinEntry    = ''
      if (mode === 'idle') triggerExit(onDismiss)
    } else {
      pinShake = true
      pinEntry = ''
      setTimeout(() => (pinShake = false), 500)
    }
  }

  function onPinKey(e: KeyboardEvent, correctPin: string, pinLen: number) {
    if (e.key === 'Enter')     { submitPin(correctPin); return }
    if (e.key === 'Backspace') { pinEntry = pinEntry.slice(0, -1); return }
    if (/^\d$/.test(e.key)) {
      pinEntry = (pinEntry + e.key).slice(0, 8)
      if (pinEntry.length >= pinLen) submitPin(correctPin)
    }
  }

  $effect(() => {
    if (!ringFull) {
      exitLock = false
      exiting  = false
      return
    }
    if (failed || notConfigured) return
    triggerExit(onReady)
  })

  $effect(() => {
    if (pinUnlocked && mode !== 'idle') triggerExit(onReady)
  })

  onMount(() => {
    const stopDots = setInterval(() => {
      dots = dots.length >= 3 ? '' : dots + '.'
    }, 420)

    if (mode === 'loading' && !failed && !notConfigured) {
      const stopAnim = animateRingProgress(p => (ringProg = p))
      return () => { clearInterval(stopDots); stopAnim() }
    }

    if (mode === 'idle' && onDismiss) {
      const handler = () => triggerExit(onDismiss)
      const t = setTimeout(() => {
        window.addEventListener('keydown',    handler, { once: true })
        window.addEventListener('mousedown',  handler, { once: true })
        window.addEventListener('touchstart', handler, { once: true })
      }, 200)
      return () => {
        clearTimeout(t)
        clearInterval(stopDots)
        window.removeEventListener('keydown',    handler)
        window.removeEventListener('mousedown',  handler)
        window.removeEventListener('touchstart', handler)
      }
    }

    return () => clearInterval(stopDots)
  })
</script>

<div class="splash" class:exiting>
  {#if showCards}
    <canvas
      style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%"
      use:mountCardCanvas
    ></canvas>
  {/if}

  {#if mode === 'idle'}
    <div class="center">
      <div class="logo-wrap" style="width:{LOGO_IDLE}px;height:{LOGO_IDLE}px;margin-bottom:32px">
        <div class="logo-glow"></div>
        <img src={logoUrl} alt="Moku" class="logo-breathe" style="width:{LOGO_IDLE}px;height:{LOGO_IDLE}px;border-radius:28px" />
      </div>
      <p class="hint">press any key to continue</p>
    </div>

  {:else}
    <div style="position:relative;width:{ringSize}px;height:{ringSize}px;margin-bottom:20px;display:flex;align-items:center;justify-content:center">
      {#if !failed && !notConfigured}
        <svg
          width={ringSize}
          height={ringSize}
          class="ring"
          class:ring-hide={pinVisible}
          style="position:absolute;top:0;left:0;pointer-events:none"
        >
          <circle cx={ringC} cy={ringC} r={RING_R} fill="none" stroke="var(--border-base)" stroke-width="2"/>
          <circle cx={ringC} cy={ringC} r={RING_R} fill="none" stroke="var(--accent)" stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray="{ringArc} {ringCirc}"
            transform="rotate(-90 {ringC} {ringC})"
            style="transition: stroke-dasharray 0.4s cubic-bezier(0.4,0,0.2,1)"
          />
        </svg>
      {/if}
      <img src={logoUrl} alt="Moku" style="width:{LOGO_LOADING}px;height:{LOGO_LOADING}px;border-radius:32px;display:block;position:relative"/>
    </div>

    <div class="bottom-area">
      <div class="status-slot" class:status-slot-hide={pinVisible}>
        {#if failed || notConfigured}
          <div class="error-box anim-fade-up">
            <p class="error-label">{failed ? 'Could not reach server' : 'Server not configured'}</p>
            <div class="error-actions">
              <button class="err-btn" onclick={() => onRetry?.()}>Retry</button>
              <button class="err-btn err-btn--primary" onclick={() => onBypass?.()}>Enter app</button>
            </div>
          </div>
        {:else}
          <p class="status-text">{ringFull ? '' : `Initializing server${dots}`}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--bg-base);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: spIn 0.35s cubic-bezier(0,0,0.2,1) both;
  }
  .splash.exiting { animation: spOut 320ms cubic-bezier(0.4,0,1,1) both; }

  @keyframes spIn        { from { opacity:0; transform:scale(1.015) } to { opacity:1; transform:scale(1) } }
  @keyframes spOut       { from { opacity:1; transform:scale(1) }     to { opacity:0; transform:scale(0.96) } }
  @keyframes logoBreathe { 0%,100% { transform:scale(1); filter:drop-shadow(0 0 0px rgba(255,255,255,0)) } 50% { transform:scale(1.04); filter:drop-shadow(0 0 18px rgba(255,255,255,0.12)) } }
  @keyframes hintFade    { 0%,100% { opacity:0.35 } 50% { opacity:0.7 } }

  .center { z-index:1; display:flex; flex-direction:column; align-items:center; }

  .logo-wrap    { position:relative; }
  .logo-glow    { position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%); animation:logoBreathe 4s ease-in-out infinite; }
  .logo-breathe { animation:logoBreathe 4s ease-in-out infinite; display:block; position:relative; }
  .hint         { font-family:var(--font-ui); font-size:10px; color:var(--text-faint); letter-spacing:0.22em; text-transform:uppercase; margin:0; user-select:none; animation:hintFade 3.5s ease-in-out infinite; }

  .ring      { transition:opacity 0.5s ease; }
  .ring-hide { opacity:0; }

  .bottom-area      { display:flex; align-items:center; justify-content:center; min-height:48px; position:relative; }
  .status-slot      { display:flex; align-items:center; justify-content:center; transition:opacity 0.35s ease; position:absolute; }
  .status-slot-hide { opacity:0; pointer-events:none; }
  .status-text      { font-family:var(--font-ui); font-size:10px; color:var(--text-faint); letter-spacing:0.12em; margin:0; min-width:160px; text-align:center; }

  .error-box     { display:flex; flex-direction:column; align-items:center; gap:12px; padding:16px 20px; border-radius:var(--radius-lg); background:var(--bg-surface); border:1px solid var(--border-base); min-width:200px; text-align:center; }
  .error-label   { font-family:var(--font-ui); font-size:11px; font-weight:500; color:var(--text-muted); letter-spacing:0.06em; margin:0; }
  .error-actions { display:flex; gap:6px; }
  .err-btn       { padding:5px 14px; border-radius:var(--radius-md); border:1px solid var(--border-base); background:transparent; color:var(--text-muted); cursor:pointer; font-family:var(--font-ui); font-size:11px; letter-spacing:0.04em; transition:border-color 0.15s, color 0.15s; }
  .err-btn:hover { border-color:var(--border-strong); color:var(--text-secondary); }
  .err-btn--primary       { border-color:var(--accent-dim); color:var(--accent-fg); background:var(--accent-muted); }
  .err-btn--primary:hover { border-color:var(--accent); color:var(--accent-bright); }
</style>