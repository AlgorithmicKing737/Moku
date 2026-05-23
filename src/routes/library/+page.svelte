<script lang="ts">
	import { onMount } from 'svelte'
	import { Funnel, ArrowsDownUp, SquaresFour, ListBullets, X } from 'phosphor-svelte'
	import { loadLibrary } from '$lib/request-manager/manga'
	import { libraryState, filteredItems } from '$lib/state/library.svelte'
	import type { LibrarySortOption } from '$lib/state/library.svelte'
	import type { MangaStatus } from '$lib/server-adapters/types'
	import MangaCard from '$lib/ui/manga/MangaCard.svelte'

	const sortOptions: Array<{ value: LibrarySortOption; label: string }> = [
		{ value: 'alphabetical', label: 'Alphabetical' },
		{ value: 'unread', label: 'Unread chapters' },
		{ value: 'lastRead', label: 'Last read' },
		{ value: 'dateAdded', label: 'Date added' },
	]

	const statusOptions: Array<{ value: MangaStatus | 'all'; label: string }> = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'ONGOING', label: 'Ongoing' },
		{ value: 'COMPLETED', label: 'Completed' },
		{ value: 'ON_HIATUS', label: 'On hiatus' },
		{ value: 'CANCELLED', label: 'Cancelled' },
		{ value: 'LICENSED', label: 'Licensed' },
		{ value: 'PUBLISHING_FINISHED', label: 'Publishing finished' },
	]

	let filtersOpen = $state(false)

	const availableTags = $derived.by(() => {
		const tags: string[] = []
		for (const manga of libraryState.items) {
			for (const tag of manga.tags ?? []) {
				const normalized = tag.trim()
				if (normalized && !tags.includes(normalized)) tags.push(normalized)
			}
		}
		return tags.sort((a, b) => a.localeCompare(b))
	})

	const activeFilterCount = $derived.by(() => {
		let count = 0
		if (libraryState.filter.unread) count += 1
		if (libraryState.filter.status !== 'all') count += 1
		if (libraryState.filter.tags.length > 0) count += 1
		if (libraryState.filter.query.trim()) count += 1
		return count
	})

	const hasResults = $derived(filteredItems.length > 0)

	onMount(async () => {
		if (libraryState.items.length === 0) {
			await loadLibrary({ inLibrary: true })
		}
	})

	function toggleTag(tag: string) {
		if (libraryState.filter.tags.includes(tag)) {
			libraryState.filter.tags = libraryState.filter.tags.filter(t => t !== tag)
			return
		}
		libraryState.filter.tags = [...libraryState.filter.tags, tag]
	}

	function clearFilters() {
		libraryState.filter.status = 'all'
		libraryState.filter.tags = []
		libraryState.filter.unread = false
		libraryState.filter.query = ''
	}
</script>

<section class="library-page">
	<header class="toolbar">
		<div class="title-wrap">
			<h1>Library</h1>
			<p>{filteredItems.length} manga</p>
		</div>

		<div class="controls">
			<label class="search">
				<span>Search</span>
				<input
					type="search"
					placeholder="Search titles"
					bind:value={libraryState.filter.query}
				/>
			</label>

			<label class="select-control">
				<span><ArrowsDownUp size={14} weight="bold" /> Sort</span>
				<select bind:value={libraryState.sort}>
					{#each sortOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<button
				class="icon-toggle"
				type="button"
				aria-label="Toggle sort direction"
				title={libraryState.sortDesc ? 'Descending' : 'Ascending'}
				onclick={() => (libraryState.sortDesc = !libraryState.sortDesc)}
			>
				{libraryState.sortDesc ? 'DESC' : 'ASC'}
			</button>

			<button
				class="icon-toggle"
				type="button"
				aria-label="Toggle filters"
				title="Filters"
				onclick={() => (filtersOpen = !filtersOpen)}
			>
				<Funnel size={14} weight="bold" />
				{#if activeFilterCount > 0}
					<span class="badge">{activeFilterCount}</span>
				{/if}
			</button>

			<div class="view-toggle" role="group" aria-label="View mode">
				<button
					class:active={libraryState.view === 'grid'}
					type="button"
					onclick={() => (libraryState.view = 'grid')}
					aria-label="Grid view"
				>
					<SquaresFour size={14} weight="bold" />
				</button>
				<button
					class:active={libraryState.view === 'list'}
					type="button"
					onclick={() => (libraryState.view = 'list')}
					aria-label="List view"
				>
					<ListBullets size={14} weight="bold" />
				</button>
			</div>
		</div>
	</header>

	{#if filtersOpen}
		<aside class="filters-panel">
			<div class="panel-heading-row">
				<h2>Filters</h2>
				<div class="panel-actions">
					<button type="button" onclick={clearFilters}>Clear</button>
					<button type="button" aria-label="Close filters" onclick={() => (filtersOpen = false)}>
						<X size={14} weight="bold" />
					</button>
				</div>
			</div>

			<div class="filters-grid">
				<label class="select-control">
					<span>Status</span>
					<select bind:value={libraryState.filter.status}>
						{#each statusOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>

				<label class="checkbox-control">
					<input type="checkbox" bind:checked={libraryState.filter.unread} />
					<span>Unread only</span>
				</label>
			</div>

			{#if availableTags.length > 0}
				<div class="tags-row">
					<p>Tags</p>
					<div class="tags-list">
						{#each availableTags as tag (tag)}
							<button
								type="button"
								class:active={libraryState.filter.tags.includes(tag)}
								onclick={() => toggleTag(tag)}
							>
								{tag}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</aside>
	{/if}

	{#if libraryState.loading}
		<div class="empty-state">Loading library...</div>
	{:else if libraryState.error}
		<div class="empty-state error-state">
			<p>Failed to load library.</p>
			<small>{libraryState.error}</small>
			<button type="button" onclick={() => loadLibrary({ inLibrary: true })}>Retry</button>
		</div>
	{:else if !hasResults}
		<div class="empty-state">No manga match the current filters.</div>
	{:else}
		<div class="results" class:list-view={libraryState.view === 'list'}>
			{#each filteredItems as manga (manga.id)}
				<MangaCard manga={manga} href={`/series/${manga.id}`} compact={libraryState.view === 'list'} />
			{/each}
		</div>
	{/if}
</section>

<style>
	.library-page {
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
		gap: var(--sp-4);
	}

	.title-wrap h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		color: var(--text-primary);
	}

	.title-wrap p {
		margin: var(--sp-1) 0 0;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-wider);
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
		min-width: 180px;
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

	input,
	select {
		height: 34px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-primary);
		padding: 0 10px;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}

	.icon-toggle {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 44px;
		height: 34px;
		padding: 0 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wide);
		cursor: pointer;
	}

	.badge {
		position: absolute;
		top: -6px;
		right: -6px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-fg);
		font-size: 10px;
		line-height: 16px;
	}

	.view-toggle {
		display: inline-flex;
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-raised);
	}

	.view-toggle button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 34px;
		border: 0;
		background: transparent;
		color: var(--text-faint);
		cursor: pointer;
	}

	.view-toggle button.active {
		background: var(--accent-muted);
		color: var(--accent-fg);
	}

	.filters-panel {
		border: 1px solid var(--border-dim);
		border-radius: var(--radius-xl);
		background: var(--bg-raised);
		padding: var(--sp-4);
		display: flex;
		flex-direction: column;
		gap: var(--sp-4);
	}

	.panel-heading-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.panel-heading-row h2 {
		margin: 0;
		color: var(--text-secondary);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.panel-actions {
		display: inline-flex;
		gap: var(--sp-2);
	}

	.panel-actions button,
	.tags-list button,
	.empty-state button {
		border: 1px solid var(--border-dim);
		background: var(--bg-overlay);
		color: var(--text-muted);
		border-radius: var(--radius-md);
		height: 30px;
		padding: 0 10px;
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		cursor: pointer;
	}

	.filters-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-4);
		align-items: end;
	}

	.checkbox-control {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		color: var(--text-secondary);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}

	.checkbox-control input {
		width: 16px;
		height: 16px;
		margin: 0;
	}

	.tags-row p {
		margin: 0 0 var(--sp-2);
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	.tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
	}

	.tags-list button.active {
		border-color: var(--accent-dim);
		background: var(--accent-muted);
		color: var(--accent-fg);
	}

	.results {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: var(--sp-3);
	}

	.results.list-view {
		grid-template-columns: 1fr;
	}

	.empty-state {
		min-height: 240px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--sp-2);
		border: 1px dashed var(--border-dim);
		border-radius: var(--radius-xl);
		color: var(--text-muted);
		text-align: center;
		padding: var(--sp-5);
	}

	.error-state small {
		max-width: 80ch;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	@media (max-width: 860px) {
		.library-page {
			padding: var(--sp-4);
		}

		.controls {
			width: 100%;
		}

		.search,
		.select-control {
			min-width: min(220px, 100%);
			flex: 1;
		}
	}
</style>