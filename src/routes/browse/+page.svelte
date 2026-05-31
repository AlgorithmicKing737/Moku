<script lang="ts">
  import { page }         from '$app/stores'
  import { goto }         from '$app/navigation'
  import Search           from '$lib/components/browse/Search.svelte'
  import GenreDrillPage   from '$lib/components/browse/GenreDrillPage.svelte'

  const genre = $derived($page.url.searchParams.get('genre') ?? '')
</script>

{#if genre}
  <GenreDrillPage
    {genre}
    onBack={() => goto('/browse')}
  />
{:else}
  <Search />
{/if}