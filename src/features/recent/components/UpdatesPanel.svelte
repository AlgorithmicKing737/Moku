<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { BookOpen, CircleNotch } from "phosphor-svelte";
  import { gql } from "@api/client";
  import { GET_RECENTLY_UPDATED, GET_CHAPTERS } from "@api/queries";
  import { store, openReader, setActiveManga, addToast } from "@store/state.svelte";
  import { dayLabel } from "@core/util";
  import { buildReaderChapterList } from "@features/series/lib/chapterList";
  import Thumbnail from "@shared/manga/Thumbnail.svelte";
  import type { Chapter, Manga } from "@types";

  interface Props {
    loading?: boolean;
    onRegisterRefresh?: (fn: () => Promise<void>) => void;
  }

  let { loading = $bindable(true), onRegisterRefresh }: Props = $props();

  interface RecentUpdate extends Pick<Chapter, "id" | "name" | "chapterNumber" | "sourceOrder" | "isRead" | "lastPageRead" | "mangaId" | "fetchedAt"> {
    manga: { id: number; title: string; thumbnailUrl: string; inLibrary: boolean } | null;
  }

  interface UpdateGroup {
    label: string;
    items: RecentUpdate[];
  }

  let updates   = $state<RecentUpdate[]>([]);
  let error     = $state<string | null>(null);
  let openingId = $state<number | null>(null);

  let ctrl: AbortController | null = null;

  onMount(() => {
    onRegisterRefresh?.(loadUpdates);
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

  const lastCheckedTs = $derived(
    updates.length > 0 ? fetchedAtMs(updates[0]) : null
  );

  const lastCheckedLabel = $derived(
    lastCheckedTs
      ? new Date(lastCheckedTs).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null
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
  <div class="bar-wrap">
    <div class="status-bar">
      <div class="status-dot" class:active={loading}></div>
      <span class="status-text">
        {#if loading}Checking for updates…{:else if error}Update check failed{:else}Up to date{/if}
      </span>
      <div class="status-right">
        {#if !loading && lastCheckedLabel}
          <span class="status-detail">Last checked: {lastCheckedLabel}</span>
          <div class="bar-sep"></div>
        {/if}
        {#if !loading && updates.length > 0}
          <span class="status-count">{updates.length} chapter{updates.length === 1 ? "" : "s"}</span>
        {/if}
      </div>
    </div>
  </div>

  {#if loading && updates.length === 0}
    <div class="timeline" aria-hidden="true">
      <section class="day-group">
        <div class="day-header">
          <span class="day-label skeleton sk-day-label"></span>
          <div class="day-rule skeleton sk-day-rule"></div>
        </div>

        <div class="updates-list">
          {#each Array(8) as _, i (i)}
            <div class="update-row skeleton-row">
              <div class="thumb-skeleton skeleton"></div>

              <div class="info-skeleton">
                <div class="skeleton sk-title"></div>
                <div class="skeleton sk-chapter"></div>
                <div class="skeleton sk-meta"></div>
              </div>

              <div class="end-skeleton skeleton"></div>
            </div>
          {/each}
        </div>
      </section>
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
      {#each groups as { label, items } (label)}
        <section class="day-group">
          <div class="day-header">
            <span class="day-label">{label}</span>
            <div class="day-rule"></div>
          </div>

          <div class="updates-list">
            {#each items as item (item.id)}
              <div class="update-row" class:read={item.isRead}>
                <button class="thumb-btn" onclick={() => setActiveManga(mangaStub(item))} title="View series">
                  <Thumbnail src={item.manga?.thumbnailUrl ?? ""} alt={item.manga?.title ?? "Series cover"} class="thumb" />
                </button>

                <button class="info-btn" onclick={() => openUpdate(item)} disabled={openingId === item.id}>
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
              </div>
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

  .bar-wrap { padding: var(--sp-3) var(--sp-6); flex-shrink: 0; }

  .status-bar { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); background: var(--bg-surface, var(--bg-raised)); border: 1px solid var(--border-strong, var(--border-dim)); border-radius: var(--radius-md); box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-faint); flex-shrink: 0; transition: background var(--t-base); }
  .status-dot.active { background: var(--accent); animation: pulse 1.6s ease infinite; }
  .status-text { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); flex: 1; letter-spacing: var(--tracking-wide); }
  .status-right { display: flex; align-items: center; gap: var(--sp-2); margin-left: auto; }
  .status-detail { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); }
  .status-count { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); }
  .bar-sep { width: 1px; height: 12px; background: var(--border-dim); flex-shrink: 0; }

  .timeline {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-4) var(--sp-6) var(--sp-6);
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

  @keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }
  .skeleton {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--bg-overlay, var(--bg-elevated)) 90%, var(--text-primary) 6%) 20%,
      color-mix(in srgb, var(--bg-elevated, var(--bg-overlay)) 76%, var(--text-primary) 16%) 50%,
      color-mix(in srgb, var(--bg-overlay, var(--bg-elevated)) 90%, var(--text-primary) 6%) 80%
    );
    background-size: 220% 100%;
    animation: shimmer 1.45s ease-in-out infinite;
  }

  .update-row {
    display: flex;
    align-items: stretch;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-dim);
    background: var(--bg-raised);
    overflow: hidden;
    transition: border-color var(--t-fast), opacity var(--t-base), background var(--t-fast);
  }
  .update-row:has(.info-btn:hover:not(:disabled)),
  .update-row:has(.thumb-btn:hover) {
    border-color: var(--border-strong);
    background: var(--bg-elevated);
  }
  .update-row.read { opacity: 0.5; }

  .skeleton-row {
    min-height: 74px;
    pointer-events: none;
  }

  .thumb-skeleton {
    width: 34px;
    aspect-ratio: 2 / 3;
    margin: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    align-self: center;
  }

  .info-skeleton {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3) var(--sp-2) 0;
  }

  .sk-title { height: 12px; width: clamp(140px, 42%, 340px); }
  .sk-chapter { height: 10px; width: clamp(100px, 30%, 260px); }
  .sk-meta { height: 8px; width: clamp(70px, 18%, 180px); }

  .end-skeleton {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    margin: auto var(--sp-4) auto 0;
    opacity: 0.85;
    flex-shrink: 0;
  }

  .sk-day-label {
    display: block;
    width: 74px;
    height: 10px;
    border-radius: var(--radius-sm);
  }

  .sk-day-rule {
    opacity: 0.7;
  }

  .thumb-btn {
    width: 52px;
    flex-shrink: 0;
    padding: var(--sp-2);
    background: none;
    border: none;
    border-right: 1px solid var(--border-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background var(--t-base);
  }
  .thumb-btn:hover { background: none; }

  :global(.thumb) {
    width: 100%;
    aspect-ratio: 2 / 3;
    display: block;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  .info-btn {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background var(--t-base);
  }
  .info-btn:hover:not(:disabled) { background: none; }
  .info-btn:disabled { cursor: default; opacity: 0.8; }

  .update-info {
    flex: 1;
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
    flex-shrink: 0;
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

  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
</style>
