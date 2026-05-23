<script lang="ts">
  let { children } = $props()
</script>

<div class="reader-shell">
  {@render children()}
</div>

<style>
  .reader-shell {
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at top, color-mix(in srgb, var(--accent) 16%, transparent), transparent 42%),
      var(--bg-base);
    overflow: hidden;
  }
</style>