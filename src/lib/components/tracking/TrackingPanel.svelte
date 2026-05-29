<script lang="ts">
  let { onClose, ...rest }: { onClose?: () => void; [k: string]: any } = $props()
</script>

<div class="stub-panel">
  <button class="stub-close" onclick={onClose}>✕</button>
  <p class="stub-label">TrackingPanel</p>
</div>

<style>
  .stub-panel  { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px; min-width: 240px; }
  .stub-close  { align-self: flex-end; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; }
  .stub-label  { color: var(--text-faint); font-size: var(--text-sm); }
</style>