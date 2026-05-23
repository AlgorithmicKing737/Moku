<script lang="ts">
  interface Option {
    label: string
    value: string
    disabled?: boolean
  }

  interface Props {
    value?: string
    options: Option[]
    label?: string
    disabled?: boolean
    class?: string
  }

  let {
    value = $bindable(''),
    options,
    label = '',
    disabled = false,
    class: className = '',
  }: Props = $props()
</script>

<label class={`field ${className}`.trim()}>
  {#if label}
    <span class="label">{label}</span>
  {/if}

  <div class="frame">
    <select bind:value {disabled}>
      {#each options as option (option.value)}
        <option value={option.value} disabled={option.disabled}>{option.label}</option>
      {/each}
    </select>
  </div>
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

  .frame {
    position: relative;
    border: 1px solid var(--border-base);
    border-radius: var(--radius-md);
    background: var(--bg-raised);
  }

  .frame::after {
    content: '▾';
    position: absolute;
    right: var(--sp-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-faint);
    pointer-events: none;
  }

  select {
    width: 100%;
    min-height: 38px;
    padding: 0 calc(var(--sp-5) + var(--sp-2)) 0 var(--sp-3);
    border: 0;
    outline: 0;
    background: transparent;
    appearance: none;
  }

  select:disabled {
    opacity: 0.5;
  }
</style>