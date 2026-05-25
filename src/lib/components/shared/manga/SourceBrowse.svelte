<script lang="ts">
  import { ArrowLeft, MagnifyingGlass, ArrowLeft as Prev, ArrowRight as Next, BookmarkSimple, FolderSimplePlus, Folder } from "phosphor-svelte";
  import Thumbnail   from "$lib/components/manga/Thumbnail.svelte";
  import { appState } from "$lib/state/app.svelte";
  import { requestManager } from "$lib/request-manager/index";
  import { toast } from "$lib/state/notifications.svelte";
  import type { Manga, Category } from "$lib/types/index";
  import ContextMenu, { type MenuEntry } from "$lib/components/common/ContextMenu.svelte";

  type BrowseType = "POPULAR" | "LATEST" | "SEARCH";

  let mangas: Manga[]        = $state([]);
  let loading                = $state(true);
  let page                   = $state(1);
  let hasNextPage            = $state(false);
  let browseType: BrowseType = $state("POPULAR");
  let search                 = $state("");
  let searchInput            = $state("");
  let ctx: { x: number; y: number; manga: Manga } | null = $state(null);
  let categories: Category[] = $state([]);
  let catsLoaded             = false;

  async function fetchMangas(type: BrowseType, p: number, q: string) {
    if (!appState.activeSource) return;
    loading = true; mangas = [];
    requestManager.fetchSourceManga(appState.activeSource.id, type, p, q || null)
      .then((d) => { mangas = d.mangas; hasNextPage = d.hasNextPage; })
      .catch(console.error)
      .finally(() => loading = false);
  }

  $effect(() => { if (appState.activeSource) fetchMangas(browseType, page, search); });

  function submitSearch() { search = searchInput.trim(); browseType = "SEARCH"; page = 1; }

  function setMode(mode: BrowseType) {
    if (mode === browseType) return;
    browseType = mode; search = ""; searchInput = ""; page = 1;
  }

  function openCtx(e: MouseEvent, m: Manga) {
    e.preventDefault(); e.stopPropagation();
    ctx = { x: e.clientX, y: e.clientY, manga: m };
    if (!catsLoaded) {
      catsLoaded = true;
      requestManager.getCategories()
        .then(d => { categories = d.filter((c: Category) => c.id !== 0); })
        .catch(console.error);
    }
  }

  function buildCtxItems(m: Manga): MenuEntry[] {
    return [
      {
        label: m.inLibrary ? "In Library" : "Add to library",
        icon: BookmarkSimple,
        disabled: m.inLibrary,
        onClick: () => requestManager.updateManga(m.id, { inLibrary: true })
          .then(() => {
            mangas = mangas.map((x) => x.id === m.id ? { ...x, inLibrary: true } : x);
            toast({ kind: "success", title: "Added to library", body: m.title });
          })
          .catch((e) => {
            toast({ kind: "error", title: "Failed to add to library", body: m.title });
            console.error(e);
          }),
      },
      ...(categories.length > 0 ? [
        { separator: true } as MenuEntry,
        ...categories.map((cat): MenuEntry => ({
          label: (cat.mangas?.nodes ?? []).some((x: Manga) => x.id === m.id) ? `✓ ${cat.name}` : cat.name,
          icon: Folder,
          onClick: () => requestManager.updateMangaCategories(m.id, [cat.id], []).catch(console.error),
        })),
      ] : []),
      { separator: true },
      {
        label: "New folder & add",
        icon: FolderSimplePlus,
        onClick: async () => {
          const name = prompt("Folder name:");
          if (!name?.trim()) return;
          const cat = await requestManager.createCategory(name.trim()).catch(console.error);
          if (cat) {
            categories = [...categories, cat];
            await requestManager.updateMangaCategories(m.id, [cat.id], []).catch(console.error);
          }
        },
      },
    ];
  }
</script>

{#if appState.activeSource}
<div class="root">
  <div class="header">
    <button class="back" onclick={() => appState.activeSource = null}>
      <ArrowLeft size={13} weight="light" /><span>Sources</span>
    </button>
    <span class="source-name">{appState.activeSource.displayName}</span>
  </div>

  <div class="toolbar">
    <div class="tabs">
      {#each (["POPULAR", "LATEST"] as BrowseType[]) as mode}
        <button class="tab" class:active={browseType === mode && !search} onclick={() => setMode(mode)}>
          {mode.charAt(0) + mode.slice(1).toLowerCase()}
        </button>
      {/each}
      {#if search}<button class="tab active">Search</button>{/if}
    </div>
    <div class="search-wrap">
      <MagnifyingGlass size={12} class="search-icon" weight="light" />
      <input class="search" placeholder="Search source…" bind:value={searchInput}
        onkeydown={(e) => e.key === "Enter" && submitSearch()} />
    </div>
  </div>

  {#if loading}
    <div class="loading-grid">
      {#each Array(18) as _}
        <div class="card-skeleton"><div class="cover-skeleton skeleton"></div><div class="title-skeleton skeleton"></div></div>
      {/each}
    </div>
  {:else if mangas.length === 0}
    <div class="empty">No results.</div>
  {:else}
    <div class="grid">
      {#each mangas as m (m.id)}
        <button class="card" onclick={() => { appState.activeManga = m; appState.navPage = "library"; }}
          oncontextmenu={(e) => openCtx(e, m)}>
          <div class="cover-wrap">
            <Thumbnail src={m.thumbnailUrl} alt={m.title} class="cover" />
            {#if m.inLibrary}<span class="in-library-badge">In Library</span>{/if}
          </div>
          <p class="title">{m.title}</p>
        </button>
      {/each}
    </div>
  {/if}

  {#if !loading && (page > 1 || hasNextPage)}
    <div class="pagination">
      <button class="page-btn" onclick={() => page = Math.max(1, page - 1)} disabled={page === 1}>
        <Prev size={13} weight="light" /> Prev
      </button>
      <span class="page-num">{page}</span>
      <button class="page-btn" onclick={() => page++} disabled={!hasNextPage}>
        Next <Next size={13} weight="light" />
      </button>
    </div>
  {/if}
</div>
{/if}

{#if ctx}
  <ContextMenu x={ctx.x} y={ctx.y} items={buildCtxItems(ctx.manga)} onClose={() => ctx = null} />
{/if}

<style>
  .root { display: flex; flex-direction: column; height: 100%; overflow: hidden; animation: fadeIn 0.14s ease both; }
  .header { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-4) var(--sp-6); border-bottom: 1px solid var(--border-dim); flex-shrink: 0; }
  .back { display: flex; align-items: center; gap: var(--sp-2); color: var(--text-muted); font-size: var(--text-xs); font-family: var(--font-ui); letter-spacing: var(--tracking-wide); text-transform: uppercase; transition: color var(--t-base); flex-shrink: 0; }
  .back:hover { color: var(--text-secondary); }
  .source-name { font-size: var(--text-base); font-weight: var(--weight-medium); color: var(--text-secondary); letter-spacing: var(--tracking-tight); }
  .toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-3) var(--sp-6); border-bottom: 1px solid var(--border-dim); flex-shrink: 0; flex-wrap: wrap; }
  .tabs { display: flex; gap: 2px; }
  .tab { font-family: var(--font-ui); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); padding: 4px 10px; border-radius: var(--radius-md); border: none; background: none; color: var(--text-muted); cursor: pointer; transition: background var(--t-base), color var(--t-base); }
  .tab:hover { background: var(--bg-raised); color: var(--text-secondary); }
  .tab.active { background: var(--accent-muted); color: var(--accent-fg); }
  .search-wrap { position: relative; display: flex; align-items: center; }
  .search-wrap :global(.search-icon) { position: absolute; left: 9px; color: var(--text-faint); pointer-events: none; }
  .search { background: var(--bg-raised); border: 1px solid var(--border-dim); border-radius: var(--radius-md); padding: 5px 10px 5px 26px; color: var(--text-primary); font-size: var(--text-sm); width: 200px; outline: none; transition: border-color var(--t-base); }
  .search::placeholder { color: var(--text-faint); }
  .search:focus { border-color: var(--border-strong); }
  .grid, .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(clamp(100px,14vw,140px),1fr)); gap: var(--sp-4); padding: var(--sp-5) var(--sp-6); overflow-y: auto; flex: 1; align-content: start; will-change: scroll-position; -webkit-overflow-scrolling: touch; contain: layout style; }
  .card { background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
  .card:hover :global(.cover) { filter: brightness(1.06); }
  .card:hover .title { color: var(--text-primary); }
  .cover-wrap { position: relative; aspect-ratio: 2/3; overflow: hidden; border-radius: var(--radius-md); background: var(--bg-raised); border: 1px solid var(--border-dim); transform: translateZ(0); }
  :global(.cover) { width: 100%; height: 100%; object-fit: cover; transition: filter var(--t-base); will-change: filter; }
  .in-library-badge { position: absolute; bottom: var(--sp-1); left: var(--sp-1); font-family: var(--font-ui); font-size: var(--text-2xs); letter-spacing: var(--tracking-wide); text-transform: uppercase; background: var(--accent-muted); color: var(--accent-fg); border: 1px solid var(--accent-dim); padding: 2px 5px; border-radius: var(--radius-sm); }
  .title { margin-top: var(--sp-2); font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-snug); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; transition: color var(--t-base); }
  .card-skeleton { padding: 0; }
  .cover-skeleton { aspect-ratio: 2/3; border-radius: var(--radius-md); }
  .title-skeleton { height: 11px; margin-top: var(--sp-2); width: 75%; }
  .pagination { display: flex; align-items: center; justify-content: center; gap: var(--sp-4); padding: var(--sp-4); border-top: 1px solid var(--border-dim); flex-shrink: 0; }
  .page-btn { display: flex; align-items: center; gap: var(--sp-2); font-family: var(--font-ui); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); color: var(--text-muted); border: 1px solid var(--border-dim); border-radius: var(--radius-md); padding: 5px 12px; background: none; cursor: pointer; transition: color var(--t-base), border-color var(--t-base), background var(--t-base); }
  .page-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); background: var(--bg-raised); }
  .page-btn:disabled { opacity: 0.3; cursor: default; }
  .page-num { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); letter-spacing: var(--tracking-wider); min-width: 24px; text-align: center; }
  .empty { display: flex; align-items: center; justify-content: center; flex: 1; color: var(--text-muted); font-family: var(--font-ui); font-size: var(--text-xs); letter-spacing: var(--tracking-wide); }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>