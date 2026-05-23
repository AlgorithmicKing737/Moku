<script lang="ts">
	import { onMount } from 'svelte'
	import { ArrowsClockwise, DownloadSimple, TrashSimple, XCircle } from 'phosphor-svelte'
	import { clearDownloads, dequeueDownload, loadDownloads } from '$lib/request-manager/downloads'
	import { activeDownloads, downloadCount, downloadsState, queuedDownloads } from '$lib/state/downloads.svelte'

	let busy = $state(false)

	onMount(async () => {
		await loadDownloads()
	})

	async function refresh() {
		busy = true
		try {
			await loadDownloads()
		} finally {
			busy = false
		}
	}

	async function removeItem(chapterId: string) {
		busy = true
		try {
			await dequeueDownload(chapterId)
		} finally {
			busy = false
		}
	}

	async function clearAll() {
		busy = true
		try {
			await clearDownloads()
		} finally {
			busy = false
		}
	}

	function progressLabel(progress: number): string {
		const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100)
		return `${pct}%`
	}
</script>

<section class="downloads-page">
	<header class="toolbar">
		<div class="title-wrap">
			<h1>Downloads</h1>
			<p>{downloadCount} total · {activeDownloads.length} active · {queuedDownloads.length} queued</p>
		</div>

		<div class="actions">
			<button type="button" onclick={refresh} disabled={busy}>
				<ArrowsClockwise size={14} weight="bold" /> Refresh
			</button>
			<button type="button" class="danger" onclick={clearAll} disabled={busy || downloadCount === 0}>
				<TrashSimple size={14} weight="bold" /> Clear all
			</button>
		</div>
	</header>

	{#if downloadsState.error}
		<div class="empty-state error-state">
			<p>Unable to load downloads.</p>
			<small>{downloadsState.error}</small>
			<button type="button" onclick={refresh} disabled={busy}>Retry</button>
		</div>
	{:else if downloadsState.items.length === 0}
		<div class="empty-state">
			<DownloadSimple size={16} weight="light" />
			Nothing in the queue.
		</div>
	{:else}
		<ul class="downloads-list">
			{#each downloadsState.items as item (item.chapterId)}
				<li class="download-row" class:done={item.state === 'finished'} class:failed={item.state === 'error'}>
					<div class="row-main">
						<p class="title">{item.mangaTitle}</p>
						<p class="meta">{item.chapterName}</p>
					</div>

					<div class="row-right">
						<span class="state-pill">{item.state}</span>
						<span class="progress-text">{progressLabel(item.progress)}</span>
						<button
							type="button"
							class="icon-btn"
							aria-label="Remove from queue"
							onclick={() => removeItem(item.chapterId)}
							disabled={busy}
						>
							<XCircle size={16} weight="bold" />
						</button>
					</div>

					<div class="progress-track">
						<div class="progress-fill" style={`width: ${progressLabel(item.progress)}`}></div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.downloads-page {
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

	.actions {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
	}

	.actions button,
	.error-state button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-muted);
		padding: 0 12px;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: var(--text-xs);
	}

	.actions .danger {
		color: var(--color-error);
		border-color: color-mix(in srgb, var(--color-error) 32%, var(--border-dim));
	}

	.actions button:disabled,
	.icon-btn:disabled,
	.error-state button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.downloads-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}

	.download-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--sp-2) var(--sp-3);
		padding: var(--sp-3);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
	}

	.download-row.done {
		border-color: color-mix(in srgb, var(--accent) 40%, var(--border-dim));
	}

	.download-row.failed {
		border-color: color-mix(in srgb, var(--color-error) 40%, var(--border-dim));
	}

	.row-main {
		min-width: 0;
	}

	.title,
	.meta {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.row-right {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
	}

	.state-pill {
		border-radius: 999px;
		border: 1px solid var(--border-dim);
		padding: 3px 8px;
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.progress-text {
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		min-width: 34px;
		text-align: right;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-overlay);
		color: var(--text-faint);
		cursor: pointer;
	}

	.progress-track {
		grid-column: 1 / -1;
		height: 6px;
		border-radius: 999px;
		background: var(--bg-overlay);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: var(--accent);
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 220px;
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-xl);
		background: var(--bg-raised);
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}

	.error-state {
		flex-direction: column;
		text-align: center;
		padding: var(--sp-4);
	}

	.error-state p,
	.error-state small {
		margin: 0;
	}
</style>