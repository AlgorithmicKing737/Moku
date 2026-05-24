<script lang="ts">
	import { onMount } from 'svelte'
	import { MagnifyingGlass, ArrowSquareOut } from 'phosphor-svelte'
	import { loadSources } from '$lib/request-manager/extensions'
	import { extensionsState } from '$lib/state/extensions.svelte'
	import { settingsState } from '$lib/state/settings.svelte'
	import { shouldHideSource } from '$lib/core/util'

	let query = $state('')
	let language = $state('all')
	let includeNsfw = $state(false)

	const languages = $derived.by(() => {
		const values: string[] = []
		for (const source of extensionsState.sources) {
			if (!values.includes(source.lang)) values.push(source.lang)
		}
		return values.sort((a, b) => a.localeCompare(b))
	})

	const filteredSources = $derived.by(() => {
		const q = query.trim().toLowerCase()

		return extensionsState.sources.filter(source => {
			if (language !== 'all' && source.lang !== language) return false
			if (!includeNsfw && shouldHideSource(source, settingsState)) return false
			if (!q) return true

			return (
				source.displayName.toLowerCase().includes(q) ||
				source.name.toLowerCase().includes(q)
			)
		})
	})

	onMount(async () => {
		if (extensionsState.sources.length === 0) {
			await loadSources()
		}
	})
	</script>

<section class="browse-page">
	<header class="toolbar">
		<div class="title-wrap">
			<h1>Browse Sources</h1>
			<p>{filteredSources.length} available</p>
		</div>

		<div class="controls">
			<label class="search">
				<span><MagnifyingGlass size={14} weight="light" /> Search</span>
				<input type="search" placeholder="Find source" bind:value={query} />
			</label>

			<label class="select-control">
				<span>Language</span>
				<select bind:value={language}>
					<option value="all">All</option>
					{#each languages as lang (lang)}
						<option value={lang}>{lang.toUpperCase()}</option>
					{/each}
				</select>
			</label>

			<label class="checkbox-control">
				<input type="checkbox" bind:checked={includeNsfw} />
				<span>Include NSFW</span>
			</label>
		</div>
	</header>

	{#if extensionsState.error}
		<div class="empty-state error-state">
			<p>Unable to load sources.</p>
			<small>{extensionsState.error}</small>
			<button type="button" onclick={() => loadSources()}>Retry</button>
		</div>
	{:else if filteredSources.length === 0}
		<div class="empty-state">No sources match the current filters.</div>
	{:else}
		<ul class="sources-grid">
			{#each filteredSources as source (source.id)}
				<li>
					<a class="source-card" href={`/browse/${source.id}`}>
						<div>
							<p class="source-name">{source.displayName}</p>
							<p class="source-meta">{source.lang.toUpperCase()} · {source.isNsfw ? 'NSFW' : 'Safe'}</p>
						</div>
						<ArrowSquareOut size={14} weight="bold" />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.browse-page {
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
		color: var(--text-primary);
		font-family: var(--font-display);
		font-size: var(--text-2xl);
	}

	.title-wrap p {
		margin: var(--sp-1) 0 0;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
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

	.checkbox-control {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-secondary);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
	}

	.checkbox-control input {
		width: 16px;
		height: 16px;
		margin: 0;
	}

	.sources-grid {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: var(--sp-3);
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	}

	.source-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--sp-2);
		min-height: 72px;
		padding: var(--sp-3);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-muted);
		text-decoration: none;
		transition: border-color var(--t-base), transform var(--t-base), color var(--t-base);
	}

	.source-card:hover {
		border-color: var(--border-strong);
		color: var(--text-primary);
		transform: translateY(-1px);
	}

	.source-name {
		margin: 0;
		color: var(--text-primary);
		font-family: var(--font-ui);
		font-size: var(--text-sm);
	}

	.source-meta {
		margin: var(--sp-1) 0 0;
		color: var(--text-faint);
		font-family: var(--font-ui);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
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

	.error-state button {
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
</style>
