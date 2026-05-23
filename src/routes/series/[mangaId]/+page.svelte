<script lang="ts">
  import { page } from '$app/state'

  const mangaId = $derived(page.params.mangaId)
</script>

<section class="series-placeholder">
  <h1>Series</h1>
  <p>Selected manga id: {mangaId}</p>
  <p>Series detail UI will be implemented in Phase 4.</p>
</section>

<style>
  .series-placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    height: 100%;
    padding: var(--sp-6);
  }

  h1 {
    margin: 0;
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: var(--text-2xl);
  }

  p {
    margin: 0;
    color: var(--text-muted);
  }
</style>
