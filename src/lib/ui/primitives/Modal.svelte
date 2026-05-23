<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    open: boolean
    title?: string
    description?: string
    children?: Snippet
    actions?: Snippet
    onClose?: () => void
    closeOnBackdrop?: boolean
    width?: string
  }

  let {
    open,
    title = '',
    description = '',
    children,
    actions,
    onClose,
    closeOnBackdrop = true,
    width = 'min(520px, calc(100vw - 32px))',
  }: Props = $props()

  function close() {
    onClose?.()
  }
</script>

{#if open}
  <div
    class="backdrop"
    role="presentation"
    tabindex="-1"
    onclick={() => closeOnBackdrop && close()}
    onkeydown={(event) => event.key === 'Escape' && closeOnBackdrop && close()}
  >
    <div
      class="panel anim-scale-in"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      style={`width: ${width}`}
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => event.stopPropagation()}
    >
      {#if title || description}
        <header class="header">
          {#if title}
            <h2>{title}</h2>
          {/if}
          {#if description}
            <p>{description}</p>
          {/if}
        </header>
      {/if}

      <section class="content">
        {@render children?.()}
      </section>

      {#if actions}
        <footer class="actions">
          {@render actions()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(10px);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    max-height: calc(100vh - 32px);
    overflow: hidden;
    border: 1px solid var(--border-base);
    border-radius: var(--radius-xl);
    background: var(--bg-surface);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  }

  .header,
  .content,
  .actions {
    padding-inline: var(--sp-4);
  }

  .header {
    padding-top: var(--sp-4);
  }

  .header h2 {
    font-size: var(--text-lg);
    font-weight: var(--weight-semi);
    line-height: var(--leading-tight);
  }

  .header p {
    margin-top: var(--sp-2);
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .content {
    overflow: auto;
    padding-bottom: var(--sp-2);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
    padding-bottom: var(--sp-4);
  }
</style>