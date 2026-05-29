<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    class?:   string;
    enabled?: boolean;
  }

  let { children, class: cls = "", enabled = true }: Props = $props();
</script>

{#if enabled}
  <div class="hover-3d {cls}">
    <div class="hover-3d-content">
      {@render children()}
    </div>
    <div></div><div></div><div></div>
    <div></div><div></div><div></div>
    <div></div><div></div>
  </div>
{:else}
  <div class={cls}>
    {@render children()}
  </div>
{/if}

<style>
  .hover-3d {
    display: inline-grid;
    perspective: 600px;
    --tx: 0; --ty: 0;
    --shadow-x: 0px; --shadow-y: 0px;
    --ease-out:   linear(0, 0.931 13.8%, 1.196 21.4%, 1.343 29.8%, 1.378 36%, 1.365 43.2%, 1.059 78%, 1);
    --ease-hover: linear(0, 0.708 15.2%, 0.927 23.6%, 1.067 33%, 1.12 41%, 1.13 50.2%, 1.019 83.2%, 1);
  }

  .hover-3d > :nth-child(n + 2) { isolation: isolate; z-index: 1; scale: 1.2; }
  .hover-3d > :nth-child(2) { grid-area: 1/1/2/2; }
  .hover-3d > :nth-child(3) { grid-area: 1/2/2/3; }
  .hover-3d > :nth-child(4) { grid-area: 1/3/2/4; }
  .hover-3d > :nth-child(5) { grid-area: 2/1/3/2; }
  .hover-3d > :nth-child(6) { grid-area: 2/3/3/4; }
  .hover-3d > :nth-child(7) { grid-area: 3/1/4/2; }
  .hover-3d > :nth-child(8) { grid-area: 3/2/4/3; }
  .hover-3d > :nth-child(9) { grid-area: 3/3/4/4; }

  .hover-3d-content {
    grid-area: 1/1/4/4;
    overflow: hidden;
    border-radius: inherit;
    position: relative;
    transform: rotate3d(var(--tx), var(--ty), 0, 12deg);
    transform-style: preserve-3d;
    transition:
      transform  var(--ease-out) 500ms,
      scale      var(--ease-out) 500ms,
      box-shadow ease-out 450ms;
    box-shadow:
      calc(var(--shadow-x) * 0.6) calc(var(--shadow-y) * 0.6) 8px  rgba(0,0,0,0.18),
      calc(var(--shadow-x) * 1.0) calc(var(--shadow-y) * 1.0) 18px rgba(0,0,0,0.14),
      calc(var(--shadow-x) * 1.6) calc(var(--shadow-y) * 1.6) 36px rgba(0,0,0,0.10),
      0 2px 6px rgba(0,0,0,0.12);
  }

  .hover-3d:hover > .hover-3d-content { --ease-out: var(--ease-hover); scale: 1.055; }

  .hover-3d:has(> :nth-child(2):hover)  { --tx: -1; --ty:  1; --shadow-x: -8px; --shadow-y: -8px; }
  .hover-3d:has(> :nth-child(3):hover)  { --tx: -1; --ty:  0; --shadow-x:  0px; --shadow-y: -8px; }
  .hover-3d:has(> :nth-child(4):hover)  { --tx: -1; --ty: -1; --shadow-x:  8px; --shadow-y: -8px; }
  .hover-3d:has(> :nth-child(5):hover)  { --tx:  0; --ty:  1; --shadow-x: -8px; --shadow-y:  0px; }
  .hover-3d:has(> :nth-child(6):hover)  { --tx:  0; --ty: -1; --shadow-x:  8px; --shadow-y:  0px; }
  .hover-3d:has(> :nth-child(7):hover)  { --tx:  1; --ty:  1; --shadow-x: -8px; --shadow-y:  8px; }
  .hover-3d:has(> :nth-child(8):hover)  { --tx:  1; --ty:  0; --shadow-x:  0px; --shadow-y:  8px; }
  .hover-3d:has(> :nth-child(9):hover)  { --tx:  1; --ty: -1; --shadow-x:  8px; --shadow-y:  8px; }
</style>