<script lang="ts">
  let {
    blur    = 8,
    dim     = 0.6,
    zIndex  = 'var(--z-settings)',
    animate = true,
  }: {
    blur?:    number
    dim?:     number
    zIndex?:  string | number
    animate?: boolean
  } = $props()
</script>

<div
  class="modal-blur"
  class:animate
  style="--blur:{blur}px; --dim:{dim}; --z:{zIndex}"
></div>

<style>
  .modal-blur {
    position: fixed;
    inset: 0;
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    background: rgba(0, 0, 0, var(--dim));
    pointer-events: none;
    z-index: var(--z);
  }

  .modal-blur.animate {
    animation: blur-in 0.14s ease both;
  }

  @keyframes blur-in {
    from { opacity: 0 }
    to   { opacity: 1 }
  }
</style>