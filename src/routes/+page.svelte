<script lang="ts">
	import { onMount } from 'svelte'
	import { BookOpen, Books, ClockCounterClockwise, DownloadSimple } from 'phosphor-svelte'
	import { loadLibrary } from '$lib/request-manager/manga'
	import { downloadCount as getDownloadCount } from '$lib/state/downloads.svelte'
	import { historyState, initHistoryState } from '$lib/state/history.svelte'
	import { libraryState } from '$lib/state/library.svelte'

	const recentHistory = $derived(historyState.history.slice(0, 8))
	const downloadCount = $derived(getDownloadCount())

	const stats = $derived.by(() => [
		{
			label: 'Library Manga',
			value: libraryState.items.length,
			icon: Books,
		},
		{
			label: 'Chapters Read',
			value: historyState.readingStats.totalChaptersRead,
			icon: BookOpen,
		},
		{
			label: 'Active Downloads',
			value: downloadCount,
			icon: DownloadSimple,
		},
		{
			label: 'Current Streak',
			value: historyState.readingStats.currentStreakDays,
			icon: ClockCounterClockwise,
			suffix: 'days',
		},
	])

	onMount(async () => {
		await initHistoryState()

		if (libraryState.items.length === 0) {
			await loadLibrary({ inLibrary: true })
		}
	})

	function formatTimestamp(value: number): string {
		if (!value) return 'Unknown'
		return new Date(value).toLocaleString()
	}
</script>

<section class="home-page">
	<header class="hero">
		<div>
			<p class="eyebrow">Dashboard</p>
			<h1>Welcome back</h1>
			<p class="subtitle">Quick read stats and recent progress across your library.</p>
		</div>
		<div class="shortcuts">
			<a href="/library">Open Library</a>
			<a href="/browse">Browse Sources</a>
			<a href="/history">View History</a>
		</div>
	</header>

	<section class="stats-grid" aria-label="Reading stats">
		{#each stats as stat (stat.label)}
			<article class="stat-card">
				<div class="stat-icon"><stat.icon size={16} weight="bold" /></div>
				<p class="stat-label">{stat.label}</p>
				<p class="stat-value">
					{stat.value}
					{#if stat.suffix}
						<span>{stat.suffix}</span>
					{/if}
				</p>
			</article>
		{/each}
	</section>

	<section class="recent-panel">
		<div class="section-head">
			<h2>Recent Activity</h2>
			<a href="/history">Open full history</a>
		</div>

		{#if recentHistory.length === 0}
			<div class="empty-state">No recent reading activity yet.</div>
		{:else}
			<ul class="recent-list">
				{#each recentHistory as entry (`${entry.chapterId}-${entry.readAt}`)}
					<li>
						<a class="recent-row" href={`/series/${entry.mangaId}`}>
							<div class="row-main">
								<p class="title">{entry.mangaTitle}</p>
								<p class="meta">{entry.chapterName}</p>
							</div>
							<span class="time">{formatTimestamp(entry.readAt)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</section>

<style>
	.home-page {
		display: flex;
		flex-direction: column;
		gap: var(--sp-4);
		height: 100%;
		padding: var(--sp-6);
		overflow: auto;
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--sp-4);
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-xl);
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent 58%),
			var(--bg-raised);
		padding: var(--sp-5);
	}

	.eyebrow {
		margin: 0;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	.hero h1 {
		margin: var(--sp-1) 0 0;
		color: var(--text-primary);
		font-family: var(--font-display);
		font-size: clamp(var(--text-2xl), 2.2vw, var(--text-3xl));
	}

	.subtitle {
		margin: var(--sp-2) 0 0;
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		max-width: 60ch;
	}

	.shortcuts {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: var(--sp-2);
	}

	.shortcuts a,
	.section-head a {
		display: inline-flex;
		align-items: center;
		height: 32px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-overlay);
		color: var(--text-muted);
		padding: 0 10px;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: var(--text-xs);
	}

	.stats-grid {
		display: grid;
		gap: var(--sp-3);
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-lg);
		background: var(--bg-raised);
		padding: var(--sp-3);
	}

	.stat-icon {
		color: var(--accent-fg);
	}

	.stat-label {
		margin: 0;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.stat-value {
		margin: 0;
		color: var(--text-primary);
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		line-height: 1;
	}

	.stat-value span {
		margin-left: 6px;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.recent-panel {
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
		min-height: 0;
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-xl);
		background: var(--bg-raised);
		padding: var(--sp-4);
	}

	.section-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--sp-2);
		align-items: center;
	}

	.section-head h2 {
		margin: 0;
		color: var(--text-primary);
		font-family: var(--font-display);
		font-size: var(--text-xl);
	}

	.recent-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}

	.recent-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-2);
		padding: var(--sp-3);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-dim);
		background: var(--bg-overlay);
		text-decoration: none;
	}

	.row-main {
		min-width: 0;
	}

	.title,
	.meta,
	.time {
		margin: 0;
		font-family: var(--font-ui);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title {
		color: var(--text-primary);
		font-size: var(--text-sm);
	}

	.meta,
	.time {
		color: var(--text-faint);
		font-size: var(--text-xs);
	}

	.empty-state {
		display: grid;
		place-items: center;
		min-height: 120px;
		border: 1px dashed var(--border-dim);
		border-radius: var(--radius-lg);
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}
</style>