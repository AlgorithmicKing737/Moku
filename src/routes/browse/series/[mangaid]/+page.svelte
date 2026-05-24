<script lang="ts">
  import { page } from '$app/stores'
  import { loadManga, fetchManga } from '$lib/request-manager/manga'
  import { loadChapters } from '$lib/request-manager/chapters'
  import { seriesState } from '$lib/state/series.svelte'

  const mangaId = $derived($page.params.mangaId)

  $effect(() => {
    loadManga(mangaId)
    loadChapters(mangaId)
  })
</script>

<p>Series {$page.params.mangaId} — stub</p>