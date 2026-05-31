<script lang="ts">
  import { page } from '$app/stores'
  import Search   from '$lib/components/browse/Search.svelte'

  const sourceId = $derived($page.params.sourceId)
</script>

<Search initialTab="source" preselectedSourceId={sourceId} />