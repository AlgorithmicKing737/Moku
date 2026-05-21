<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ArrowsClockwise, BookOpen, CircleNotch } from "phosphor-svelte";
  import { gql } from "@api/client";
  import { GET_RECENTLY_UPDATED, GET_CHAPTERS } from "@api/queries";
  import { store, openReader, setActiveManga, addToast } from "@store/state.svelte";
  import { dayLabel } from "@core/util";
  import { buildReaderChapterList } from "@features/series/lib/chapterList";
  import Thumbnail from "@shared/manga/Thumbnail.svelte";
  import type { Chapter, Manga } from "@types";

  interface RecentUpdate extends Pick<Chapter, "id" | "name" | "chapterNumber" | "sourceOrder" | "isRead" | "lastPageRead" | "mangaId" | "fetchedAt"> {
    manga: { id: number; title: string; thumbnailUrl: string; inLibrary: boolean } | null;
  }

  interface UpdateGroup {
    label: string;
    items: RecentUpdate[];
  }

  let updates   = $state<RecentUpdate[]>([]);
  let loading   = $state(true);
  let error     = $state<string | null>(null);
  let openingId = $state<number | null>(null);

  let ctrl: AbortController | null = null;

  onMount(() => {
    void loadUpdates();
  });

  onDestroy(() => {
    ctrl?.abort();
  });

  function fetchedAtMs(item: Pick<RecentUpdate, "fetchedAt">): number {
    const ts = item.fetchedAt ? new Date(item.fetchedAt).getTime() : Date.now();
    return Number.isFinite(ts) ? ts : Date.now();
  }

  const groups = $derived.by(() => {
    const map = new Map<string, RecentUpdate[]>();
    for (const item of updates) {
      const label = dayLabel(fetchedAtMs(item));
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items })) as UpdateGroup[];
  });

  const lastUpdatedTs = $derived(
    store.lastLibraryRefresh > 0
      ? store.lastLibraryRefresh
      : (updates.length > 0 ? fetchedAtMs(updates[0]) : null)
  );

  const lastUpdatedLabel = $derived(
    lastUpdatedTs
      ? new Date(lastUpdatedTs).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Never"
  );

  function mangaStub(item: RecentUpdate): Manga {
    return {
      id: item.manga?.id ?? item.mangaId,
      title: item.manga?.title ?? "Unknown series",
      thumbnailUrl: item.manga?.thumbnailUrl ?? "",
      inLibrary: item.manga?.inLibrary ?? true,
    };
  }

  function chapterLabel(item: RecentUpdate): string {
    if (item.name?.trim()) return item.name;
    if (Number.isFinite(item.chapterNumber)) return `Chapter ${item.chapterNumber}`;
    return "Chapter";
  }

  async function loadUpdates() {
    ctrl?.abort();
    const nextCtrl = new AbortController();
    ctrl = nextCtrl;
    loading = true;
    error = null;

    try {
      const res = await gql<{ chapters: { nodes: RecentUpdate[] } }>(GET_RECENTLY_UPDATED, {}, nextCtrl.signal);
      if (nextCtrl.signal.aborted) return;

      updates = res.chapters.nodes
        .filter(item => item.manga?.inLibrary)
        .sort((a, b) => fetchedAtMs(b) - fetchedAtMs(a));
    } catch (e: any) {
      if (nextCtrl.signal.aborted) return;
      error = e?.message ?? "Failed to load updates";
      updates = [];
    } finally {
      if (!nextCtrl.signal.aborted) loading = false;
    }
  }

  async function openUpdate(item: RecentUpdate) {
    if (openingId !== null) return;
    openingId = item.id;
    const manga = mangaStub(item);

    try {
      const res = await gql<{ chapters: { nodes: Chapter[] } }>(GET_CHAPTERS, { mangaId: item.mangaId });
      const raw = [...res.chapters.nodes].sort((a, b) => a.sourceOrder - b.sourceOrder);
      const list = buildReaderChapterList(raw, store.settings.mangaPrefs?.[item.mangaId]);
      const target = list.find(ch => ch.id === item.id);

      if (target) {
        setActiveManga(manga);
        openReader(target, list);
      } else {
        setActiveManga(manga);
      }
    } catch {
      setActiveManga(manga);
      addToast({ kind: "error", title: "Couldn't open chapter", body: "Opened the series instead." });
    } finally {
      openingId = null;
    }
  }
</script>

<div class="root anim-fade-in">
  <div class="header">
    <div class="heading-group">
      <ArrowsClockwise size={13} weight="light" class="heading-icon" />
      <span class="heading">Library updates</span>
      <span class="last-updated">Last updated: {lastUpdatedLabel}</span>
    </div>
    <button class="icon-btn" onclick={loadUpdates} disabled={loading} title="Refresh updates">
      {#if loading}<CircleNotch size={14} weight="light" class="anim-spin" />
      {:else}<ArrowsClockwise size={14} weight="bold" />{/if}
    </button>
  </div>

  {#if loading && updates.length === 0}
    <div class="empty">
      <div class="empty-icon-wrap">
        <CircleNotch size={22} weight="light" class="anim-spin" />
      </div>
      <p class="empty-text">Loading updates…</p>
    </div>
  {:else if error}
    <div class="empty">
      <div class="empty-icon-wrap">
        <BookOpen size={22} weight="light" />
      </div>
      <p class="empty-text">Couldn't load updates</p>
      <p class="empty-hint">{error}</p>
    </div>
  {:else if updates.length === 0}
    <div class="empty">
      <div class="empty-icon-wrap">
        <BookOpen size={22} weight="light" />
      </div>
      <p class="empty-text">No recent library updates</p>
      <p class="empty-hint">Run a library update to populate this page.</p>
    </div>
  {:else}
    <div class="timeline">
      {#each groups as { label, items }}
        <section class="day-group">
          <div class="day-header">
            <span class="day-label">{label}</span>
            <div class="day-rule"></div>
          </div>

          <div class="updates-list">
            {#each items as item (item.id)}
              <button class="update-row" onclick={() => openUpdate(item)} disabled={openingId === item.id}>
                <div class="thumb-wrap">
                  <Thumbnail src={item.manga?.thumbnailUrl ?? ""} alt={item.manga?.title ?? "Series cover"} class="thumb" />
                </div>

                <div class="update-info">
                  <div class="title-row">
                    <span class="series-title">{item.manga?.title ?? "Unknown series"}</span>
                    {#if !item.isRead}
                      <span class="pill">Unread</span>
                    {/if}
                  </div>

                  <span class="chapter-title">{chapterLabel(item)}</span>

                  {#if (item.lastPageRead ?? 0) > 0 && !item.isRead}
                    <div class="meta-row">
                      <span>Resume p.{item.lastPageRead}</span>
                    </div>
                  {/if}
                </div>

                <div class="row-end">
                  {#if openingId === item.id}
                    <CircleNotch size={14} weight="light" class="anim-spin" />
                  {:else}
                    <BookOpen size={14} weight="light" />
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-4) var(--sp-6);
    border-bottom: 1px solid var(--border-dim);
    flex-shrink: 0;
  }

  .heading-group {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  :global(.heading-icon) { color: var(--text-faint); }

  .heading {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }

  .last-updated {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    color: var(--text-faint);
    letter-spacing: var(--tracking-wide);
    text-transform: none;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
    color: var(--text-faint);
    cursor: pointer;
    transition: color var(--t-base), border-color var(--t-base), background var(--t-base);
  }
  .icon-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-strong); }
  .icon-btn:disabled { opacity: 0.45; cursor: default; }

  .timeline {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-5) var(--sp-6) var(--sp-6);
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  .day-group {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .day-header {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .day-label {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    color: var(--text-faint);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
    white-space: nowrap;
  }

  .day-rule {
    height: 1px;
    flex: 1;
    background: var(--border-dim);
  }

  .updates-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .update-row {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--sp-3);
    width: 100%;
    padding: var(--sp-2);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-dim);
    background: var(--bg-base);
    cursor: pointer;
    text-align: left;
    transition: background var(--t-base), border-color var(--t-base), transform var(--t-base);
  }
  .update-row:hover:not(:disabled) {
    background: var(--bg-raised);
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
  .update-row:disabled { cursor: default; opacity: 0.8; }

  .thumb-wrap {
    width: 52px;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--bg-overlay);
    border: 1px solid var(--border-dim);
  }
  :global(.thumb) {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .update-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }

  .series-title,
  .chapter-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .series-title {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .chapter-title {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .meta-row {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    color: var(--text-faint);
    letter-spacing: var(--tracking-wide);
  }

  .pill {
    padding: 2px 6px;
    border-radius: var(--radius-full);
    background: var(--accent-muted);
    color: var(--accent-fg);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wide);
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .row-end {
    color: var(--text-faint);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    color: var(--text-faint);
    padding: var(--sp-6);
    text-align: center;
  }

  .empty-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
  }

  .empty-text {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .empty-hint {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--text-faint);
  }
</style>
