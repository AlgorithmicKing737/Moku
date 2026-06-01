<script lang="ts">
  import { Books, ClockCounterClockwise, Clock, BookOpen, Fire, TrendUp } from 'phosphor-svelte'
  import Thumbnail from '$lib/components/shared/manga/Thumbnail.svelte'
  import { timeAgo, formatReadTime } from '$lib/core/util'
  import type { HistorySession, HistoryGroup } from './lib/recentHistory'

  interface Stats {
    currentStreakDays:  number
    totalChaptersRead: number
    totalMinutesRead:  number
    totalMangaRead:    number
  }

  interface Props {
    groups:        HistoryGroup[]
    hasHistory:    boolean
    historySearch: string
    stats:         Stats
    thumbFor:      (mangaId: number, fallback: string) => string
    onOpenSeries:  (session: HistorySession) => void
  }

  let { groups, hasHistory, historySearch, stats, thumbFor, onOpenSeries }: Props = $props()
</script>

<div class="root">
  {#if !hasHistory}
    <div class="empty">
      <div class="empty-icon-wrap"><ClockCounterClockwise size={24} weight="light" /></div>
      <p class="empty-text">No reading history yet</p>
      <p class="empty-hint">Chapters you read will appear here</p>
    </div>

  {:else if groups.length === 0}
    <div class="empty">
      <div class="empty-icon-wrap"><Books size={20} weight="light" /></div>
      <p class="empty-text">No results for "{historySearch}"</p>
    </div>

  {:else}
    <div class="timeline">
      {#if stats.totalChaptersRead > 0}
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon-wrap fire"><Fire size={14} weight="fill" /></div>
            <div class="stat-body">
              <span class="stat-val">{stats.currentStreakDays}</span>
              <span class="stat-label">Day streak</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap accent"><BookOpen size={14} weight="light" /></div>
            <div class="stat-body">
              <span class="stat-val">{stats.totalChaptersRead}</span>
              <span class="stat-label">Chapters read</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap neutral"><Clock size={14} weight="light" /></div>
            <div class="stat-body">
              <span class="stat-val">{formatReadTime(stats.totalMinutesRead)}</span>
              <span class="stat-label">Read time</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap neutral"><TrendUp size={14} weight="light" /></div>
            <div class="stat-body">
              <span class="stat-val">{stats.totalMangaRead}</span>
              <span class="stat-label">Series read</span>
            </div>
          </div>
        </div>
      {/if}

      {#each groups as { label, items } (label)}
        <div class="day-group">
          <div class="day-header">
            <span class="day-label">{label}</span>
            <div class="day-rule"></div>
          </div>
          <div class="session-list">
            {#each items as session (session.latestChapterId)}
              <button class="session-row" onclick={() => onOpenSeries(session)}>
                <div class="thumb-wrap">
                  <Thumbnail
                    src={thumbFor(session.mangaId, session.thumbnailUrl)}
                    alt={session.mangaTitle}
                    class="thumb"
                  />
                  {#if session.chapterCount > 1}
                    <span class="session-count">{session.chapterCount}</span>
                  {/if}
                </div>
                <div class="session-info">
                  <span class="session-title">{session.mangaTitle}</span>
                  <span class="session-chapter">
                    {#if session.chapterCount > 1}
                      {session.firstChapterName}<span class="ch-arrow">→</span>{session.latestChapterName}
                    {:else}
                      {session.latestChapterName}
                      {#if session.latestPageNumber > 1}
                        <span class="ch-page">· p.{session.latestPageNumber}</span>
                      {/if}
                    {/if}
                  </span>
                </div>
                <span class="session-time">{timeAgo(session.readAt)}</span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .root { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

  .timeline {
    flex: 1; overflow-y: auto; scrollbar-width: thin;
    scrollbar-color: var(--border-dim) transparent;
    padding: var(--sp-4) var(--sp-6) var(--sp-6);
    display: flex; flex-direction: column; gap: var(--sp-5);
  }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: var(--sp-2); }

  .stat-card {
    display: flex; align-items: center; gap: var(--sp-3);
    background: var(--bg-raised); border: 1px solid var(--border-dim);
    border-radius: var(--radius-md); padding: var(--sp-3);
    transition: border-color var(--t-fast);
  }
  .stat-card:hover { border-color: var(--border-base); }
  .stat-icon-wrap {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: var(--radius-sm); flex-shrink: 0;
  }
  .fire    { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
  .accent  { background: var(--accent-muted); color: var(--accent-fg); }
  .neutral { background: var(--bg-overlay); color: var(--text-faint); }
  .stat-body  { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .stat-val   { font-family: var(--font-ui); font-size: var(--text-lg, 1.05rem); font-weight: var(--weight-medium); color: var(--text-secondary); line-height: 1; }
  .stat-label { font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint); letter-spacing: var(--tracking-wide); white-space: nowrap; }

  .day-group  { display: flex; flex-direction: column; gap: var(--sp-3); }
  .day-header { display: flex; align-items: center; gap: var(--sp-3); }
  .day-label  { font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint); letter-spacing: var(--tracking-wider); text-transform: uppercase; flex-shrink: 0; }
  .day-rule   { flex: 1; height: 1px; background: var(--border-dim); }
  .session-list { display: flex; flex-direction: column; gap: var(--sp-2); }

  .session-row {
    display: flex; align-items: center; gap: var(--sp-3);
    width: 100%; padding: var(--sp-3); border-radius: var(--radius-md);
    border: 1px solid var(--border-dim); background: var(--bg-raised);
    text-align: left; cursor: pointer;
    transition: border-color var(--t-fast), background var(--t-fast);
  }
  .session-row:hover { border-color: var(--border-strong); background: var(--bg-elevated); }

  .thumb-wrap { position: relative; flex-shrink: 0; }
  :global(.thumb) { width: 38px; height: 54px; object-fit: cover; display: block; border-radius: var(--radius-sm); border: 1px solid var(--border-dim); }
  .session-count {
    position: absolute; bottom: -4px; right: -6px;
    background: var(--accent-muted); border: 1px solid var(--accent-dim); color: var(--accent-fg);
    font-family: var(--font-ui); font-size: 8px; font-weight: 700;
    padding: 1px 3px; border-radius: var(--radius-sm); line-height: 1.3;
    pointer-events: none; letter-spacing: 0.02em;
  }

  .session-info    { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden; min-width: 0; }
  .session-title   { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
  .session-chapter {
    display: flex; align-items: center; gap: 4px;
    font-family: var(--font-ui); font-size: var(--text-xs); color: var(--text-muted);
    letter-spacing: var(--tracking-wide); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
  }
  .ch-arrow { color: var(--text-faint); opacity: 0.35; flex-shrink: 0; }
  .ch-page  { color: var(--text-faint); opacity: 0.5;  flex-shrink: 0; }
  .session-time {
    font-family: var(--font-ui); font-size: var(--text-2xs); color: var(--text-faint);
    letter-spacing: var(--tracking-wide); flex-shrink: 0; white-space: nowrap; opacity: 0.45;
  }

  .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-2); }
  .empty-icon-wrap {
    width: 44px; height: 44px; border-radius: var(--radius-lg);
    background: var(--bg-raised); border: 1px solid var(--border-dim);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-faint); opacity: 0.5; margin-bottom: var(--sp-1);
  }
  .empty-text { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-muted); }
  .empty-hint { font-size: var(--text-xs); color: var(--text-faint); }
</style>