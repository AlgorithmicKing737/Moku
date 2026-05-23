<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLButtonAttributes, 'children'> {
    children?: Snippet
    variant?: 'solid' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
  }

  let {
    children,
    class: className = '',
    variant = 'solid',
    size = 'md',
    block = false,
    type = 'button',
    ...rest
  }: Props = $props()
</script>

<button class={`button ${variant} ${size} ${block ? 'block' : ''} ${className}`.trim()} {type} {...rest}>
  {@render children?.()}
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    font-family: var(--font-ui);
    letter-spacing: var(--tracking-wide);
    transition: background var(--t-base), border-color var(--t-base), color var(--t-base), opacity var(--t-base), transform var(--t-fast);
  }

  .button.sm { min-height: 30px; padding: 0 var(--sp-3); font-size: var(--text-2xs); }
  .button.md { min-height: 36px; padding: 0 var(--sp-4); font-size: var(--text-xs); }
  .button.lg { min-height: 42px; padding: 0 var(--sp-5); font-size: var(--text-sm); }

  .button.solid {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg);
  }

  .button.ghost {
    background: var(--bg-raised);
    border-color: var(--border-dim);
    color: var(--text-secondary);
  }

  .button.danger {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
    color: var(--color-error);
  }

  .button.block {
    display: flex;
    width: 100%;
  }

  .button:hover:not(:disabled) {
    opacity: 0.92;
  }

  .button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .button:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>