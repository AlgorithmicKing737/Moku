<script lang="ts">
  import { page }        from "$app/stores";
  import { goto }        from "$app/navigation";
  import { readerState } from "$lib/state/reader.svelte";
  import { getAdapter }  from "$lib/request-manager";
  import Reader          from "$lib/components/reader/Reader.svelte";

  const mangaId   = $derived(Number($page.params.mangaId));
  const chapterId = $derived(Number($page.params.chapterId));

  let booted = $state(false);
  let error  = $state<string | null>(null);

  $effect(() => {
    const mId = mangaId;
    const cId = chapterId;
    if (!mId || !cId) { error = "Invalid route params"; return; }

    const alreadyLoaded =
      readerState.activeChapter?.id      === cId &&
      readerState.activeManga?.id        === mId &&
      readerState.activeChapterList.length > 0;

    if (alreadyLoaded) { booted = true; return; }

    const adapter = getAdapter();
    let cancelled = false;

    (async () => {
      try {
        const [manga, chapterList] = await Promise.all([
          adapter.getManga(String(mId)),
          adapter.getChapters(String(mId)),
        ]);
        if (cancelled) return;

        const chapter = chapterList.find(c => c.id === cId);
        if (!chapter) throw new Error(`Chapter ${cId} not found in chapter list`);

        readerState.activeManga       = manga;
        readerState.activeChapter     = chapter;
        readerState.activeChapterList = chapterList;
        booted = true;
      } catch (e) {
        if (!cancelled) error = e instanceof Error ? e.message : String(e);
      }
    })();

    return () => { cancelled = true; };
  });
</script>

{#if error}
  <div class="error">
    <p>{error}</p>
    <button onclick={() => goto(-1 as any)}>Go back</button>
  </div>
{:else if booted}
  <Reader />
{:else}
  <div class="spinner" aria-label="Loading…" />
{/if}

<style>
  .error {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: #000;
    color: #fff;
    font-family: sans-serif;
  }

  .error button {
    padding: 0.5rem 1.25rem;
    border-radius: 6px;
    border: 1px solid #555;
    background: transparent;
    color: #fff;
    cursor: pointer;
  }

  .spinner {
    position: fixed;
    inset: 0;
    background: #000;
  }
</style>