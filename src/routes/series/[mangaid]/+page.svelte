<script lang="ts">
  import { page }             from '$app/stores'
  import { setActiveMangaId } from '$lib/state/series.svelte'
  import SeriesDetail         from '$lib/components/series/SeriesDetail.svelte'

  $effect(() => {
    setActiveMangaId(Number($page.params.mangaid) || null)
    return () => setActiveMangaId(null)
  })
</script>

<SeriesDetail />