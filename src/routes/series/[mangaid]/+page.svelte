<script lang="ts">
  import { page }       from '$app/stores'
  import SeriesDetail   from '$lib/components/series/SeriesDetail.svelte'

  const mangaId = $derived(Number($page.params.mangaid))
</script>

<SeriesDetail {mangaId} />