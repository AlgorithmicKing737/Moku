<script lang="ts">
  import { Sparkle } from 'phosphor-svelte'
  import type { Manga } from '$lib/types'
  import type { HistoryEntry } from '$lib/state/home.svelte'

  let {
    libraryManga,
    history,
    onopenrecommended,
  }: {
    libraryManga:      Manga[]
    history:           HistoryEntry[]
    onopenrecommended: (m: Manga) => void
  } = $props()
</script>

<div class="col">
  <div class="col-header">
    <span class="col-title"><Sparkle size={10} weight="bold" /> Recommended</span>
  </div>
  <p class="stub">Recommendations coming soon</p>
</div>

<style>
  .col { display: flex; flex-direction: column; min-width: 0; height: 100%; }
  .col-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--sp-2); flex-shrink: 0; }
  .col-title {
    display: inline-flex; align-items: center; gap: var(--sp-2);
    font-family: var(--font-ui); font-size: var(--text-2xs);
    color: var(--text-faint); letter-spacing: var(--tracking-wider); text-transform: uppercase;
  }
  .stub { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); }
</style>