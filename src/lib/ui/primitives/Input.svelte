<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLInputAttributes, 'value'> {
    value?: string
    label?: string
    error?: string | null
    inputClass?: string
  }

  let {
    value = $bindable(''),
    label = '',
    error = null,
    class: className = '',
    inputClass = '',
    ...rest
  }: Props = $props()
</script>

<label class={`field ${className}`.trim()}>
  {#if label}
    <span class="label">{label}</span>
  {/if}
  <input class={`control ${inputClass}`.trim()} bind:value {...rest} />
  {#if error}
    <span class="error">{error}</span>
  {/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .label {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .control {
    width: 100%;
    min-height: 38px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-base);
    background: var(--bg-raised);
    color: var(--text-primary);
    padding: 0 var(--sp-3);
    transition: border-color var(--t-base), box-shadow var(--t-base), background var(--t-base);
  }

  .control:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .control:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .error {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    color: var(--color-error);
  }
</style>