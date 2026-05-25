<script lang="ts">
  import { goto } from '$app/navigation'
  import { app } from '$lib/state/app.svelte'
  import { onMount } from 'svelte'

  onMount(() => {
    app.setSettingsOpen(true)
    goto('/', { replaceState: true })
  })
</script>