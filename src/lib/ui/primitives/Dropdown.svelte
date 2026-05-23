<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    trigger?: Snippet
    children?: Snippet
    align?: 'left' | 'right'
    width?: string
  }

  let {
    trigger,
    children,
    align = 'left',
    width = '220px',
  }: Props = $props()

  let root = $state<HTMLElement | null>(null)
  let open = $state(false)

  function toggle() {
    open = !open
  }

  function close() {
    open = false
  }
</script>

<svelte:document
  onclick={(event) => {
    if (!open || !(event.target instanceof Node) || root?.contains(event.target)) return
    close()
  }}
  onkeydown={(event) => event.key === 'Escape' && close()}
/>

<div bind:this={root} class="dropdown">
  <button class="trigger" type="button" onclick={toggle} aria-expanded={open}>
    {@render trigger?.()}
  </button>

  {#if open}
    <div class={`panel ${align}`.trim()} role="menu" style={`width: ${width}`}>
      {@render children?.()}
    </div>
  {/if}
</div>

<style>
  .dropdown {
    position: relative;
    display: inline-flex;
  }

  .trigger {
    display: inline-flex;
  }

  .panel {
    position: absolute;
    top: calc(100% + var(--sp-2));
    z-index: var(--z-modal);
    border: 1px solid var(--border-base);
    border-radius: var(--radius-lg);
    background: var(--bg-raised);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
    padding: var(--sp-2);
  }

  .panel.left {
    left: 0;
  }

  .panel.right {
    right: 0;
  }
</style>