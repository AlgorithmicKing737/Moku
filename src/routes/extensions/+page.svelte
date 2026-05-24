<script lang="ts">
	import { onMount } from 'svelte'
	import { ArrowsClockwise, DownloadSimple, TrashSimple, ArrowFatUp, MagnifyingGlass } from 'phosphor-svelte'
	import {
		installExtension,
		loadExtensions,
		uninstallExtension,
		updateExtension,
	} from '$lib/request-manager/extensions'
	import { extensionsState, filteredExtensions as getFilteredExtensions } from '$lib/state/extensions.svelte'

	let busyIds = $state<string[]>([])

	const filteredExtensions = $derived(getFilteredExtensions())

	const languageOptions = $derived.by(() => {
		const values: string[] = []
		for (const extension of extensionsState.items) {
			if (!values.includes(extension.lang)) values.push(extension.lang)
		}
		return values.sort((a, b) => a.localeCompare(b))
	})

	onMount(async () => {
		await loadExtensions()
	})

	function isBusy(id: string): boolean {
		return busyIds.includes(id)
	}

	function addBusy(id: string) {
		if (busyIds.includes(id)) return
		busyIds = [...busyIds, id]
	}

	function removeBusy(id: string) {
		busyIds = busyIds.filter(value => value !== id)
	}

	async function refresh() {
		await loadExtensions()
	}

	async function install(id: string) {
		addBusy(id)
		try {
			await installExtension(id)
		} finally {
			removeBusy(id)
		}
	}

	async function uninstall(id: string) {
		addBusy(id)
		try {
			await uninstallExtension(id)
		} finally {
			removeBusy(id)
		}
	}

	async function update(id: string) {
		addBusy(id)
		try {
			await updateExtension(id)
		} finally {
			removeBusy(id)
		}
	}

	function clearFilters() {
		extensionsState.filter.query = ''
		extensionsState.filter.installed = false
		extensionsState.filter.language = 'all'
	}
</script>

<section class="extensions-page">
	<header class="toolbar">
		<div class="title-wrap">
			<h1>Extensions</h1>
			<p>{filteredExtensions.length} shown · {extensionsState.items.length} total</p>
		</div>

		<div class="controls">
			<label class="search">
				<span><MagnifyingGlass size={14} weight="light" /> Search</span>
				<input type="search" placeholder="Find extension" bind:value={extensionsState.filter.query} />
			</label>

			<label class="select-control">
				<span>Language</span>
				<select bind:value={extensionsState.filter.language}>
					<option value="all">All</option>
					{#each languageOptions as lang (lang)}
						<option value={lang}>{lang.toUpperCase()}</option>
					{/each}
				</select>
			</label>

			<label class="checkbox-control">
				<input type="checkbox" bind:checked={extensionsState.filter.installed} />
				<span>Installed only</span>
			</label>

			<button type="button" onclick={clearFilters}>Clear</button>
			<button type="button" onclick={refresh} disabled={extensionsState.loading}>
				<ArrowsClockwise size={14} weight="bold" />
			</button>
		</div>
	</header>

	{#if extensionsState.error}
		<div class="empty-state error-state">
			<p>Unable to load extensions.</p>
			<small>{extensionsState.error}</small>
			<button type="button" onclick={refresh}>Retry</button>
		</div>
	{:else if extensionsState.loading && extensionsState.items.length === 0}
		<div class="empty-state">Loading extensions...</div>
	{:else if filteredExtensions.length === 0}
		<div class="empty-state">No extensions match the current filters.</div>
	{:else}
		<ul class="extensions-list">
			{#each filteredExtensions as extension (extension.id)}
				<li class="extension-row">
					<div class="row-main">
						<p class="title">{extension.name}</p>
						<p class="meta">
							{extension.lang.toUpperCase()} · v{extension.versionName}
							{#if extension.isObsolete}
								· Obsolete
							{/if}
						</p>
					</div>

					<div class="row-actions">
						{#if extension.hasUpdate}
							<button type="button" onclick={() => update(extension.id)} disabled={isBusy(extension.id)}>
								<ArrowFatUp size={14} weight="bold" /> Update
							</button>
						{/if}

						{#if extension.isInstalled}
							<button type="button" class="danger" onclick={() => uninstall(extension.id)} disabled={isBusy(extension.id)}>
								<TrashSimple size={14} weight="bold" /> Remove
							</button>
						{:else}
							<button type="button" onclick={() => install(extension.id)} disabled={isBusy(extension.id)}>
								<DownloadSimple size={14} weight="bold" /> Install
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.extensions-page {
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

	.checkbox-control {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-raised);
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
	}

	.extensions-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}

	.extension-row {
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
	.error-state button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-dim);
		background: var(--bg-overlay);
		color: var(--text-muted);
		padding: 0 10px;
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		cursor: pointer;
	}

	.row-actions .danger {
		color: var(--color-error);
		border-color: color-mix(in srgb, var(--color-error) 32%, var(--border-dim));
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