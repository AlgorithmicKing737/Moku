<script lang="ts">
  import { page } from '$app/stores'
  import { loadChapterPages } from '$lib/request-manager/chapters'
  import { readerState } from '$lib/state/reader.svelte'

  const mangaId   = $derived($page.params.mangaId)
  const chapterId = $derived($page.params.chapterId)

  let controller = $state<AbortController | null>(null)

  $effect(() => {
    controller?.abort()
    controller = new AbortController()
    loadChapterPages(chapterId, controller.signal)
    return () => controller?.abort()
  })
</script>

<p>Reader {$page.params.mangaId} / {$page.params.chapterId} — stub</p>