<script lang="ts">
	import { onMount } from 'svelte'
	import { ArrowsClockwise, MagnifyingGlass } from 'phosphor-svelte'
	import { loadTrackers, syncTracking } from '$lib/request-manager/tracking'
	import { trackingState } from '$lib/state/tracking.svelte'
	import type { Tracker, TrackRecord } from '$lib/types/tracking'

	let query = $state('')
	let trackerFilter = $state<'all' | 'connected'>('all')

	const visibleTrackers = $derived.by(() => {
		if (trackerFilter === 'connected') {
			return trackingState.trackers.filter(tracker => tracker.isLoggedIn)
		}
		return trackingState.trackers
	})

	const records = $derived.by(() => {
		const q = query.trim().toLowerCase()
		const list: Array<{ tracker: Tracker; record: TrackRecord }> = []

		for (const tracker of visibleTrackers) {
			for (const record of tracker.trackRecords?.nodes ?? []) {
				if (
					q &&
					!record.title.toLowerCase().includes(q) &&
					!tracker.name.toLowerCase().includes(q)
				) {
					continue
				}
				list.push({ tracker, record })
			}
		}

		return list.sort((a, b) => a.record.title.localeCompare(b.record.title))
	})

	onMount(async () => {
		await loadTrackers()
	})

	async function refresh() {
		await loadTrackers()
	}

	async function syncRecord(record: TrackRecord) {
		if (!record.libraryId) return
		await syncTracking(record.libraryId)
	}

	function statusLabel(tracker: Tracker, statusValue: number): string {
		return tracker.statuses.find(status => status.value === statusValue)?.name ?? 'Unknown'
	}
</script>

<section class="tracking-page">
	<header class="toolbar">
		<div class="title-wrap">
			<h1>Tracking</h1>
			<p>{visibleTrackers.length} trackers · {records.length} records</p>
		</div>

		<div class="controls">
			<label class="search">
				<span><MagnifyingGlass size={14} weight="light" /> Search</span>
				<input type="search" placeholder="Find tracked title" bind:value={query} />
			</label>

			<label class="select-control">
				<span>View</span>
				<select bind:value={trackerFilter}>
					<option value="all">All trackers</option>
					<option value="connected">Connected only</option>
				</select>
			</label>

			<button type="button" onclick={refresh} disabled={trackingState.loading || trackingState.syncing}>
				<ArrowsClockwise size={14} weight="bold" />
			</button>
		</div>
	</header>

	{#if trackingState.error}
		<div class="empty-state error-state">
			<p>Unable to load tracking data.</p>
			<small>{trackingState.error}</small>
			<button type="button" onclick={refresh}>Retry</button>
		</div>
	{:else if trackingState.loading && trackingState.trackers.length === 0}
		<div class="empty-state">Loading trackers...</div>
	{:else if records.length === 0}
		<div class="empty-state">No tracked entries match the current filters.</div>
	{:else}
		<ul class="records-list">
			{#each records as item (`${item.tracker.id}:${item.record.id}`)}
				<li class="record-row">
					<div class="row-main">
						<p class="title">{item.record.title}</p>
						<p class="meta">
							{item.tracker.name} · {statusLabel(item.tracker, item.record.status)}
							· {item.record.lastChapterRead}/{item.record.totalChapters || '?'}
						</p>
					</div>

					<div class="row-actions">
						{#if item.record.remoteUrl}
							<a class="link-btn" href={item.record.remoteUrl} target="_blank" rel="noreferrer">Open</a>
						{/if}
						<button
							type="button"
							onclick={() => syncRecord(item.record)}
							disabled={!item.record.libraryId || trackingState.syncing}
						>
							Sync
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.tracking-page {
		display: flex;
		flex-direction: column;
		gap: var(--sp-4);
		height: 100%;
		padding: var(--sp-6);
		overflow: auto;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--sp-3);
	}

	.title-wrap h1 {
		margin: 0;
		color: var(--text-primary);
		font-family: var(--font-display);
		font-size: var(--text-2xl);
	}

	.title-wrap p {
		margin: var(--sp-1) 0 0;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--sp-2);
	}

	.search,
	.select-control {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.search span,
	.select-control span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	.search input,
	.select-control select,
	.controls button {
		height: 34px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-muted);
		padding: 0 10px;
		font-family: var(--font-ui);
		font-size: var(--text-xs);
	}

	.search input {
		min-width: 180px;
		color: var(--text-primary);
	}

	.controls button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.records-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}

	.record-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-2);
		padding: var(--sp-3);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
	}

	.row-main {
		min-width: 0;
	}

	.title,
	.meta {
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.title {
		color: var(--text-primary);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}

	.meta {
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
	}

	.row-actions {
		display: inline-flex;
		gap: var(--sp-2);
		flex-shrink: 0;
	}

	.row-actions button,
	.row-actions .link-btn,
	.error-state button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 30px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-overlay);
		color: var(--text-muted);
		padding: 0 10px;
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		text-decoration: none;
	}

	.row-actions button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.empty-state {
		display: grid;
		place-items: center;
		min-height: 220px;
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-xl);
		background: var(--bg-raised);
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}

	.error-state {
		gap: 8px;
		padding: var(--sp-4);
		text-align: center;
	}

	.error-state p,
	.error-state small {
		margin: 0;
	}
</style>