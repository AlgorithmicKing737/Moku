<script lang="ts">
  import {
    X, CaretLeft, CaretRight, CaretUp, CaretDown,
    MagnifyingGlassMinus, MagnifyingGlassPlus,
    Bookmark, MapPin, Download, Check, GearSix, Sliders,
    ArrowsOut, ArrowsIn,
  } from "phosphor-svelte";
  import { readerState, MARKER_COLORS, MARKER_COLOR_HEX, ZOOM_STEP, ZOOM_MIN, ZOOM_MAX } from "$lib/state/reader.svelte";
  import { settingsState }  from "$lib/state/settings.svelte";
  import { fly }               from "svelte/transition";
  import { cubicOut, cubicIn } from "svelte/easing";
  import type { Chapter }      from "$lib/types";
  import type { Snippet }      from "svelte";
  import type { ReaderSettings } from "$lib/state/reader.svelte";

  interface Props {
    displayChapter:       Chapter | null;
    adjacent:             { prev: Chapter | null; next: Chapter | null; remaining: Chapter[] };
    visibleChunkLastPage: number;
    zoom:                 number;
    zoomPct:              number;
    isFullscreen:         boolean;
    isBookmarked:         boolean;
    hasMarkerOnPage:      boolean;
    currentPageMarkers:   { id: string; color: import("$lib/types/history").MarkerColor; note: string }[];
    uiVisible:            boolean;
    barPosition:          "top" | "left" | "right";
    progressBar?:         Snippet;
    onCaptureZoomAnchor:  () => void;
    onRestoreZoomAnchor:  () => void;
    onMaybeMarkRead:      () => void;
    onToggleBookmark:     () => void;
    onCommitMarker:       () => void;
    onDeleteMarker:       () => void;
    onClampZoom:          (z: number) => number;
    onApplySettings:      (patch: Partial<ReaderSettings>) => void;
    onSettingsOpen:       () => void;
    perMangaEnabled:      boolean;
  }

  const {
    displayChapter, adjacent, visibleChunkLastPage,
    zoom, zoomPct, isFullscreen,
    isBookmarked, hasMarkerOnPage, currentPageMarkers,
    uiVisible,
    barPosition, progressBar,
    onCaptureZoomAnchor, onRestoreZoomAnchor,
    onMaybeMarkRead, onToggleBookmark, onCommitMarker, onDeleteMarker,
    onClampZoom, onApplySettings, onSettingsOpen,
    perMangaEnabled,
  }: Props = $props();

  const queueable = $derived(adjacent.remaining.filter(c => !c.downloaded));

  async function gqlMutation(query: string, variables: Record<string, unknown>): Promise<void> {
    const base = settingsState.settings.serverUrl ?? "http://localhost:4567";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const mode = settingsState.settings.serverAuthMode ?? "NONE";
    if (mode === "BASIC_AUTH") {
      const u = settingsState.settings.serverAuthUser?.trim() ?? "";
      const p = settingsState.settings.serverAuthPass?.trim() ?? "";
      if (u && p) headers["Authorization"] = `Basic ${btoa(`${u}:${p}`)}`;
    }
    const res = await fetch(`${base}/api/graphql`, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
  }

  const ENQUEUE_ONE  = `mutation EnqueueOne($id: Int!) { fetchChapterPages(input: { chapterId: $id }) { chapter { id } } }`;
  const ENQUEUE_MANY = `mutation EnqueueMany($ids: [Int!]!) { enqueueChaptersDownloads(input: { ids: $ids }) { downloadStatus { queue { chapter { id } } } } }`;

  async function runDl(fn: () => Promise<void>) {
    readerState.dlBusy = true;
    try { await fn(); } catch (e) { console.error(e); }
    readerState.dlBusy = false;
    readerState.dlOpen = false;
  }

  const isVertical  = $derived(barPosition === "left" || barPosition === "right");
  const popoverSide = $derived(
    barPosition === "left"  ? "right" :
    barPosition === "right" ? "left"  :
    "bottom"
  );

  function adjustZoom(delta: number) {
    onCaptureZoomAnchor();
    onApplySettings({ readerZoom: onClampZoom(zoom + delta) });
    onRestoreZoomAnchor();
  }

  function resetZoom() {
    onCaptureZoomAnchor();
    onApplySettings({ readerZoom: 1.0 });
    onRestoreZoomAnchor();
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }

  function closeAllPopovers() {
    readerState.actionsOpen = false;
    readerState.markerOpen  = false;
    readerState.zoomOpen    = false;
    readerState.dlOpen      = false;
  }

  function openMarkerPopover() {
    closeAllPopovers();
    if (currentPageMarkers.length > 0) {
      const first = currentPageMarkers[0];
      readerState.openMarker(first.id, first.note, first.color);
    } else {
      readerState.openMarker("", "", "yellow");
    }
  }

  let chapterHover      = $state(false);
  let chapterHoverTimer: ReturnType<typeof setTimeout> | null = null;

  function showChapterPopover() {
    if (chapterHoverTimer) clearTimeout(chapterHoverTimer);
    chapterHover = true;
  }

  function hideChapterPopover() {
    chapterHoverTimer = setTimeout(() => { chapterHover = false; }, 120);
  }
</script>

<div
  class="bar"
  class:bar-top={barPosition === "top"}
  class:bar-left={barPosition === "left"}
  class:bar-right={barPosition === "right"}
  class:hidden={!uiVisible}
>
  <div class="bar-start">
    <button class="icon-btn close-btn" onclick={() => readerState.closeReader()} title="Close reader">
      <X size={14} weight="regular" />
    </button>

    <div class="bar-divider"></div>

    <button class="icon-btn"
      onclick={() => { if (adjacent.prev) { onMaybeMarkRead(); readerState.openReader(adjacent.prev, readerState.activeChapterList); } }}
      disabled={!adjacent.prev}
      title="Previous chapter">
      {#if isVertical}<CaretUp size={13} weight="regular" />{:else}<CaretLeft size={13} weight="regular" />{/if}
    </button>

    <div
      class="ch-hover-wrap"
      onmouseenter={showChapterPopover}
      onmouseleave={hideChapterPopover}
      role="presentation"
    >
      <div class="ch-pill">
        {#if isVertical}
          <span class="ch-info">&#xE2CE;</span>
        {:else}
          <span class="ch-marquee-track" onwheel={(e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).scrollLeft += e.deltaY; }}>
            <span class="ch-marquee-content">
              <span class="ch-title">{readerState.activeManga?.title}</span>
              <span class="ch-sep">/</span>
              <span class="ch-name">{displayChapter?.name}</span>
            </span>
          </span>
        {/if}
      </div>
      {#if !isVertical}
        <span class="ch-page">{readerState.pageNumber}<span class="ch-page-sep">/</span>{visibleChunkLastPage}</span>
      {/if}

      {#if chapterHover && isVertical}
        <div class="ch-popover ch-popover-{popoverSide}">
          <span class="ch-pop-title">{readerState.activeManga?.title}</span>
          <span class="ch-pop-sep">/</span>
          <span class="ch-pop-name">{displayChapter?.name}</span>
          <span class="ch-pop-page">{readerState.pageNumber} / {visibleChunkLastPage}</span>
        </div>
      {/if}
    </div>

    <button class="icon-btn"
      onclick={() => { if (adjacent.next) { onMaybeMarkRead(); readerState.openReader(adjacent.next, readerState.activeChapterList); } }}
      disabled={!adjacent.next}
      title="Next chapter">
      {#if isVertical}<CaretDown size={13} weight="regular" />{:else}<CaretRight size={13} weight="regular" />{/if}
    </button>
  </div>

  {#if isVertical && progressBar}
    <div class="bar-middle">
      {@render progressBar()}
    </div>
  {/if}

  {#if !isVertical}
    <div class="bar-drag-gap" data-tauri-drag-region></div>
  {/if}

  <div class="bar-end">

    <div class="zoom-cluster">
      <button class="icon-btn zoom-step-btn" onclick={() => adjustZoom(-ZOOM_STEP)} title="Zoom out" disabled={zoom <= ZOOM_MIN}>
        <MagnifyingGlassMinus size={13} weight="regular" />
      </button>
      <button class="zoom-pct-btn" onclick={() => { readerState.zoomOpen = !readerState.zoomOpen; readerState.actionsOpen = false; readerState.markerOpen = false; }} title="Adjust zoom">
        {zoomPct}%
      </button>
      <button class="icon-btn zoom-step-btn" onclick={() => adjustZoom(ZOOM_STEP)} title="Zoom in" disabled={zoom >= ZOOM_MAX}>
        <MagnifyingGlassPlus size={13} weight="regular" />
      </button>

      {#if readerState.zoomOpen}
        <div class="popover zoom-popover popover-{popoverSide}" role="presentation" onclick={(e) => e.stopPropagation()}>
          <div class="zoom-row">
            <button class="zoom-step-sm" onclick={() => adjustZoom(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>−</button>
            <input type="range" class="zoom-slider" min={10} max={200} step={5} value={zoomPct}
              oninput={(e) => { onCaptureZoomAnchor(); onApplySettings({ readerZoom: onClampZoom(Number(e.currentTarget.value) / 100) }); onRestoreZoomAnchor(); }} />
            <button class="zoom-step-sm" onclick={() => adjustZoom(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>+</button>
          </div>
          <div class="zoom-footer">
            <span class="zoom-readout">{zoomPct}%</span>
            <button class="zoom-reset" onclick={resetZoom} disabled={zoom === 1.0}>Reset</button>
          </div>
        </div>
      {/if}
    </div>

    <div class="bar-divider"></div>

    <div class="marker-wrap">
      <button
        class="icon-btn"
        class:active={hasMarkerOnPage}
        class:marker-btn-has={hasMarkerOnPage}
        onclick={openMarkerPopover}
        title={hasMarkerOnPage ? "Edit marker" : "Add marker"}
        style={hasMarkerOnPage ? `--marker-color:${MARKER_COLOR_HEX[currentPageMarkers[0].color]}` : ""}
      >
        <MapPin size={14} weight={hasMarkerOnPage ? "fill" : "regular"} />
      </button>

      {#if readerState.markerOpen}
        <div class="popover marker-popover popover-{popoverSide}" role="presentation" onclick={(e) => e.stopPropagation()}>
          <div class="marker-pop-header">
            <span class="marker-pop-title">{readerState.markerEditId ? "Edit marker" : "New marker"} · p.{readerState.pageNumber}</span>
            {#if readerState.markerEditId}
              <button class="marker-delete-btn" onclick={onDeleteMarker} title="Delete marker"><X size={12} weight="light" /></button>
            {/if}
          </div>
          <div class="marker-color-row">
            {#each MARKER_COLORS as c}
              <button class="marker-swatch" class:marker-swatch-active={readerState.markerColor === c}
                style="--swatch:{MARKER_COLOR_HEX[c]}" onclick={() => readerState.markerColor = c} title={c}>
                <span class="swatch-dot"></span>
                <span class="swatch-label">{c}</span>
              </button>
            {/each}
          </div>
          <textarea class="marker-textarea" style="--accent-marker:{MARKER_COLOR_HEX[readerState.markerColor]}"
            rows={3} placeholder="Note (optional)…" bind:value={readerState.markerNote}
            onkeydown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onCommitMarker(); }
              if (e.key === "Escape") readerState.markerOpen = false;
            }}></textarea>
          <div class="marker-pop-actions">
            <button class="marker-save-btn" style="--accent-marker:{MARKER_COLOR_HEX[readerState.markerColor]}" onclick={onCommitMarker}>
              <Check size={12} weight="bold" />
              {readerState.markerEditId ? "Update" : "Save"}
            </button>
            <button class="marker-cancel-btn" onclick={() => readerState.markerOpen = false}>Cancel</button>
          </div>
        </div>
      {/if}
    </div>

    <button class="icon-btn" class:active={isBookmarked} onclick={onToggleBookmark}
      title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}>
      <Bookmark size={14} weight={isBookmarked ? "fill" : "regular"} />
    </button>

    <div class="bar-divider"></div>

    <button class="icon-btn" class:active={perMangaEnabled}
      onclick={() => { readerState.presetOpen = true; closeAllPopovers(); }}
      title="Reader settings">
      <Sliders size={13} weight="regular" />
    </button>

    <div class="actions-wrap">
      <button
        class="icon-btn"
        class:active={readerState.actionsOpen}
        onclick={() => { readerState.actionsOpen = !readerState.actionsOpen; readerState.markerOpen = false; readerState.zoomOpen = false; }}
        title="More actions"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="2"    cy="6.5" r="1.3" fill="currentColor"/>
          <circle cx="6.5"  cy="6.5" r="1.3" fill="currentColor"/>
          <circle cx="11"   cy="6.5" r="1.3" fill="currentColor"/>
        </svg>
      </button>

      {#if readerState.actionsOpen}
        <div
          class="popover actions-popover popover-{popoverSide}"
          role="presentation"
          onclick={(e) => e.stopPropagation()}
          in:fly={isVertical
            ? (barPosition === "left" ? { x: -8, duration: 160, easing: cubicOut } : { x: 8, duration: 160, easing: cubicOut })
            : { y: -6, duration: 160, easing: cubicOut }}
          out:fly={isVertical
            ? (barPosition === "left" ? { x: -8, duration: 120, easing: cubicIn } : { x: 8, duration: 120, easing: cubicIn })
            : { y: -6, duration: 120, easing: cubicIn }}
        >
          <button class="action-row" onclick={() => { readerState.dlOpen = !readerState.dlOpen; readerState.actionsOpen = false; }}>
            <Download size={13} weight="regular" />
            <span>Download</span>
          </button>
          <button class="action-row" onclick={() => { onSettingsOpen(); readerState.actionsOpen = false; }}>
            <GearSix size={13} weight="regular" />
            <span>Settings</span>
          </button>
          <div class="action-divider"></div>
          <button class="action-row" onclick={async () => { readerState.actionsOpen = false; await toggleFullscreen(); }}>
            {#if isFullscreen}
              <ArrowsIn size={13} weight="regular" />
              <span>Exit fullscreen</span>
            {:else}
              <ArrowsOut size={13} weight="regular" />
              <span>Fullscreen</span>
            {/if}
          </button>
        </div>
      {/if}

      {#if readerState.dlOpen && readerState.activeChapter}
        {@const chapter = readerState.activeChapter}
        <div class="popover dl-popover popover-{popoverSide}" role="presentation" onclick={(e) => e.stopPropagation()}>
          <p class="dl-title">Download</p>
          <button class="dl-option" disabled={readerState.dlBusy || !!chapter.downloaded}
            onclick={() => runDl(() => gqlMutation(ENQUEUE_ONE, { id: chapter.id }))}>
            This chapter
            <span class="dl-sub">{chapter.downloaded ? "Already downloaded" : chapter.name}</span>
          </button>
          <div class="dl-row">
            <button class="dl-option" disabled={readerState.dlBusy || queueable.length === 0}
              onclick={() => runDl(() => gqlMutation(ENQUEUE_MANY, { ids: queueable.slice(0, readerState.nextN).map(c => c.id) }))}>
              Next chapters
              <span class="dl-sub">{Math.min(readerState.nextN, queueable.length)} not yet downloaded</span>
            </button>
            <div class="dl-stepper" role="presentation" onclick={(e) => e.stopPropagation()}>
              <button class="dl-step-btn" onclick={() => readerState.nextN = Math.max(1, readerState.nextN - 1)} disabled={readerState.nextN <= 1}>−</button>
              <span class="dl-step-val">{readerState.nextN}</span>
              <button class="dl-step-btn" onclick={() => readerState.nextN = Math.min(queueable.length || 1, readerState.nextN + 1)} disabled={readerState.nextN >= queueable.length}>+</button>
            </div>
          </div>
          <button class="dl-option" disabled={readerState.dlBusy || queueable.length === 0}
            onclick={() => runDl(() => gqlMutation(ENQUEUE_MANY, { ids: queueable.map(c => c.id) }))}>
            All remaining
            <span class="dl-sub">{queueable.length} not yet downloaded</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 2px;
    background: color-mix(in srgb, var(--bg-void) 92%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    flex-shrink: 0;
    position: relative;
    z-index: 2;
    transition: opacity 0.2s ease;
    overflow: visible;
    user-select: none;
  }
  .bar.hidden { opacity: 0; pointer-events: none; }

  .bar-top {
    flex-direction: row;
    padding: 0 var(--sp-2);
    height: 44px;
    border-bottom: 1px solid var(--border-dim);
  }

  .bar-left, .bar-right {
    flex-direction: column;
    justify-content: space-between;
    padding: var(--sp-3) 0;
    width: 44px;
    position: fixed;
    top: 0;
    bottom: 0;
    z-index: 2;
    border-bottom: none;
    gap: 0;
  }
  .bar-left  { left: 0;  border-right: 1px solid var(--border-dim); }
  .bar-right { right: 0; border-left:  1px solid var(--border-dim); }

  .bar-drag-gap { flex: 1; height: 100%; cursor: grab; }
  .bar-drag-gap:active { cursor: grabbing; }

  .bar-start, .bar-end {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  .bar-top .bar-start { overflow: hidden; min-width: 0; }
  .bar-left .bar-start,  .bar-left .bar-end,
  .bar-right .bar-start, .bar-right .bar-end { flex-direction: column; }

  .bar-middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-height: 0;
    padding: var(--sp-1) 0;
    overflow: visible;
  }

  .bar-divider {
    flex-shrink: 0;
    background: var(--border-dim);
    border-radius: 1px;
  }
  .bar-top .bar-divider  { width: 1px; height: 18px; margin: 0 var(--sp-1); }
  .bar-left .bar-divider,
  .bar-right .bar-divider { height: 1px; width: 20px; margin: var(--sp-1) 0; }

  .icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    flex-shrink: 0;
    transition: color var(--t-fast), background var(--t-fast);
  }
  .icon-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-raised); }
  .icon-btn:disabled { opacity: 0.2; cursor: default; }
  .icon-btn.active { color: var(--accent-fg); }
  .marker-btn-has { color: var(--marker-color, var(--accent-fg)) !important; }

  .close-btn:hover { color: var(--text-primary); background: color-mix(in srgb, #c0392b 15%, transparent); }

  .ch-hover-wrap {
    position: relative;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .ch-pill {
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--text-muted);
    overflow: hidden;
    white-space: nowrap;
    min-width: 0;
    padding: 3px 6px;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    transition: border-color var(--t-fast), background var(--t-fast);
  }
  .ch-hover-wrap:hover .ch-pill {
    border-color: var(--border-dim);
    background: var(--bg-raised);
  }
  .bar-left .ch-pill, .bar-right .ch-pill {
    width: 30px; height: 30px; justify-content: center; padding: 0; border: none;
  }
  .ch-info { font-size: 15px; line-height: 1; color: var(--text-faint); flex-shrink: 0; }

  .ch-marquee-track { overflow-x: auto; min-width: 0; flex: 1; scrollbar-width: none; }
  .ch-marquee-track::-webkit-scrollbar { display: none; }
  .ch-marquee-content { display: inline-flex; align-items: center; gap: var(--sp-2); white-space: nowrap; }
  .ch-title { color: var(--text-secondary); font-weight: var(--weight-medium); }
  .ch-sep   { color: var(--text-faint); flex-shrink: 0; }
  .ch-name  { color: var(--text-muted); }

  .ch-page {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;
    color: var(--text-faint);
    letter-spacing: var(--tracking-wide);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .ch-page-sep { color: var(--border-strong); }

  .ch-popover {
    position: absolute;
    background: var(--bg-raised);
    border: 1px solid var(--border-base);
    border-radius: var(--radius-lg);
    padding: var(--sp-2) var(--sp-3);
    display: flex; align-items: center; gap: var(--sp-2);
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    font-size: var(--text-sm);
    pointer-events: none;
    animation: scaleIn 0.1s ease both;
  }
  .ch-popover-right { left: calc(100% + 8px); top: 50%; translate: 0 -50%; transform-origin: left center; }
  .ch-popover-left  { right: calc(100% + 8px); top: 50%; translate: 0 -50%; transform-origin: right center; }
  .ch-pop-title { color: var(--text-secondary); font-weight: var(--weight-medium); }
  .ch-pop-sep   { color: var(--text-faint); }
  .ch-pop-name  { color: var(--text-muted); }
  .ch-pop-page  { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); font-variant-numeric: tabular-nums; }

  .zoom-cluster {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--bg-overlay);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    overflow: visible;
    flex-shrink: 0;
  }
  .bar-left .zoom-cluster, .bar-right .zoom-cluster { flex-direction: column; }

  .zoom-step-btn {
    width: 26px; height: 26px;
    border-radius: calc(var(--radius-md) - 1px);
    color: var(--text-faint);
    flex-shrink: 0;
  }
  .zoom-step-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-raised); }
  .zoom-step-btn:disabled { opacity: 0.2; cursor: default; }

  .zoom-pct-btn {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--tracking-wide);
    color: var(--text-secondary);
    height: 26px;
    min-width: 36px;
    padding: 0 2px;
    text-align: center;
    transition: color var(--t-fast), background var(--t-fast);
    border-radius: 0;
    border-left: 1px solid var(--border-dim);
    border-right: 1px solid var(--border-dim);
  }
  .bar-left .zoom-pct-btn, .bar-right .zoom-pct-btn {
    height: 22px; min-width: unset; width: 26px;
    writing-mode: vertical-rl; font-size: 9px;
    rotate: 270deg;
    border-left: none; border-right: none;
    border-top: 1px solid var(--border-dim);
    border-bottom: 1px solid var(--border-dim);
  }
  .zoom-pct-btn:hover { color: var(--text-primary); background: var(--bg-raised); }

  .popover {
    position: absolute;
    background: var(--bg-raised);
    border: 1px solid var(--border-base);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 32px rgba(0,0,0,0.55);
    z-index: 100;
    animation: scaleIn 0.12s ease both;
  }
  .popover-bottom { top: calc(100% + 8px); left: 50%; translate: -50% 0; transform-origin: top center; }
  .popover-right  { left: calc(100% + 8px); top: 50%; translate: 0 -50%; transform-origin: left center; }
  .popover-left   { right: calc(100% + 8px); top: 50%; translate: 0 -50%; transform-origin: right center; }
  .actions-wrap .popover-bottom { left: auto; right: 0; translate: none; transform-origin: top right; }
  .actions-wrap .popover-right  { top: auto; bottom: 0; translate: none; transform-origin: bottom left; }
  .actions-wrap .popover-left   { top: auto; bottom: 0; translate: none; transform-origin: bottom right; }

  .zoom-popover { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); min-width: 200px; }
  .zoom-row { display: flex; align-items: center; gap: var(--sp-2); }
  .zoom-step-sm {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; flex-shrink: 0;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-dim);
    background: var(--bg-overlay);
    color: var(--text-muted);
    font-size: var(--text-base); line-height: 1;
    transition: color var(--t-fast), background var(--t-fast);
  }
  .zoom-step-sm:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-raised); }
  .zoom-step-sm:disabled { opacity: 0.25; cursor: default; }
  .zoom-slider { flex: 1; height: 3px; appearance: none; -webkit-appearance: none; background: var(--border-strong); border-radius: 2px; outline: none; cursor: pointer; }
  .zoom-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--accent-fg); cursor: pointer; }
  .zoom-footer { display: flex; align-items: center; justify-content: space-between; }
  .zoom-readout { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); font-variant-numeric: tabular-nums; }
  .zoom-reset { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted); letter-spacing: var(--tracking-wide); padding: 3px var(--sp-2); border-radius: var(--radius-sm); border: 1px solid var(--border-dim); transition: color var(--t-fast), background var(--t-fast), border-color var(--t-fast); }
  .zoom-reset:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-overlay); border-color: var(--border-strong); }
  .zoom-reset:disabled { opacity: 0.3; cursor: default; }

  .marker-wrap     { position: relative; flex-shrink: 0; }
  .marker-popover  { width: 240px; padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-3); }
  .marker-pop-header { display: flex; align-items: center; justify-content: space-between; }
  .marker-pop-title  { font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint); letter-spacing: var(--tracking-wider); text-transform: uppercase; }
  .marker-delete-btn { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: var(--radius-sm); border: none; background: none; color: var(--text-faint); cursor: pointer; transition: color var(--t-fast), background var(--t-fast); }
  .marker-delete-btn:hover { color: var(--color-error); background: var(--color-error-bg); }
  .marker-color-row  { display: flex; align-items: center; gap: var(--sp-2); }
  .marker-swatch     { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 4px; border-radius: var(--radius-sm); background: none; border: none; cursor: pointer; flex: 1; transition: background var(--t-fast); }
  .marker-swatch:hover { background: var(--bg-overlay); }
  .swatch-dot        { width: 14px; height: 14px; border-radius: 50%; background: var(--swatch); transition: box-shadow var(--t-fast), transform var(--t-fast); flex-shrink: 0; }
  .marker-swatch:hover .swatch-dot { transform: scale(1.15); }
  .marker-swatch-active .swatch-dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--swatch) 30%, transparent); transform: scale(1.1); }
  .swatch-label      { font-family: var(--font-ui); font-size: 9px; letter-spacing: var(--tracking-wide); color: var(--text-faint); text-transform: capitalize; line-height: 1; }
  .marker-swatch-active .swatch-label { color: var(--text-muted); }
  .marker-textarea   { width: 100%; background: var(--bg-raised); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 7px 9px; font-size: var(--text-xs); color: var(--text-secondary); outline: none; resize: none; font-family: inherit; line-height: var(--leading-snug); transition: border-color var(--t-base), box-shadow var(--t-base); }
  .marker-textarea:focus { border-color: var(--accent-marker, var(--border-focus)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-marker, var(--accent)) 18%, transparent); }
  .marker-pop-actions { display: flex; align-items: center; gap: var(--sp-2); }
  .marker-save-btn   { display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid color-mix(in srgb, var(--accent-marker, var(--accent)) 50%, transparent); background: color-mix(in srgb, var(--accent-marker, var(--accent)) 15%, transparent); color: var(--accent-marker, var(--accent-fg)); font-family: var(--font-ui); font-size: var(--text-2xs); letter-spacing: var(--tracking-wide); cursor: pointer; transition: filter var(--t-fast); }
  .marker-save-btn:hover { filter: brightness(1.2); }
  .marker-cancel-btn { flex: 1; padding: 6px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-dim); background: none; color: var(--text-faint); font-family: var(--font-ui); font-size: var(--text-2xs); letter-spacing: var(--tracking-wide); cursor: pointer; transition: color var(--t-base), border-color var(--t-base); text-align: center; }
  .marker-cancel-btn:hover { color: var(--text-muted); border-color: var(--border-strong); }

  .actions-wrap { position: relative; flex-shrink: 0; }
  .actions-popover {
    min-width: 160px;
    padding: var(--sp-1);
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .action-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    width: 100%;
    padding: 7px var(--sp-2);
    border-radius: var(--radius-md);
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    cursor: pointer;
    text-align: left;
    transition: background var(--t-fast), color var(--t-fast);
  }
  .action-row:hover { background: var(--bg-overlay); color: var(--text-primary); }
  .action-row svg, .action-row :global(svg) { flex-shrink: 0; color: var(--text-faint); }
  .action-row:hover svg, .action-row:hover :global(svg) { color: var(--text-muted); }

  .action-divider { height: 1px; background: var(--border-dim); margin: var(--sp-1) 0; }

  .dl-popover { min-width: 220px; padding: var(--sp-2); display: flex; flex-direction: column; gap: 1px; }
  .dl-title { font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint); letter-spacing: var(--tracking-wider); text-transform: uppercase; padding: 2px var(--sp-2) var(--sp-2); border-bottom: 1px solid var(--border-dim); margin-bottom: var(--sp-1); }
  .dl-option { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 7px var(--sp-2); border-radius: var(--radius-md); font-size: var(--text-sm); color: var(--text-secondary); background: none; border: none; cursor: pointer; text-align: left; transition: background var(--t-fast), color var(--t-fast); }
  .dl-option:hover:not(:disabled) { background: var(--bg-overlay); color: var(--text-primary); }
  .dl-option:disabled { opacity: 0.3; cursor: default; }
  .dl-sub { font-size: var(--text-xs); color: var(--text-faint); }
  .dl-row { display: flex; align-items: center; gap: var(--sp-2); }
  .dl-stepper { display: flex; align-items: center; gap: 2px; background: var(--bg-overlay); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0; }
  .dl-step-btn { display: flex; align-items: center; justify-content: center; width: 22px; height: 28px; font-size: var(--text-base); color: var(--text-muted); background: none; border: none; cursor: pointer; line-height: 1; transition: color var(--t-fast), background var(--t-fast); }
  .dl-step-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-raised); }
  .dl-step-btn:disabled { opacity: 0.25; cursor: default; }
  .dl-step-val { font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-secondary); min-width: 24px; text-align: center; letter-spacing: var(--tracking-wide); }

  @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
</style>