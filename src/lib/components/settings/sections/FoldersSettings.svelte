<script lang="ts">
  import { FolderSimple, Plus, Trash, Star, Eye, EyeSlash, ArrowsClockwise, ArrowsCounterClockwise, DownloadSimple, DotsSixVertical, BookmarkSimple, Lock, CheckSquare } from 'phosphor-svelte'
  import { getAdapter } from '$lib/request-manager'
  import { settingsState, updateSettings } from '$lib/state/settings.svelte'
  import { libraryState } from '$lib/state/library.svelte'
  import type { Category } from '$lib/types'

  let categories    = $state<Category[]>([])
  let catsLoading   = $state(false)
  let catsError     = $state<string | null>(null)
  let newFolderName = $state('')
  let editingId     = $state<number | null>(null)
  let editingName   = $state('')

  let dragStrId     = $state<string | null>(null)
  let dragOverStrId = $state<string | null>(null)
  let dropPosition  = $state<'above' | 'below' | null>(null)

  const completedCat  = $derived(categories.find(c => c.name === 'Completed' && c.id !== 0) ?? null)
  const completedId   = $derived(completedCat ? String(completedCat.id) : null)
  const sortedCatIds  = $derived(categories.filter(c => c.id !== 0).map(c => String(c.id)))

  const orderedAllIds = $derived.by(() => {
    const order  = settingsState.settings.libraryPinnedTabOrder ?? []
    const allIds = ['library', 'downloaded', ...sortedCatIds]
    const known  = new Set(allIds)
    return [...new Set([...order.filter(id => known.has(id)), ...allIds])]
  })

  function isHidden(id: string) {
    return (settingsState.settings.hiddenLibraryTabs ?? []).includes(id)
  }

  function toggleHidden(id: string) {
    const current = settingsState.settings.hiddenLibraryTabs ?? []
    updateSettings({ hiddenLibraryTabs: current.includes(id) ? current.filter(x => x !== id) : [...current, id] })
  }

  async function loadCategories() {
    catsLoading = true; catsError = null
    try {
      const fresh  = await getAdapter().getCategories()
      const zeroCat = categories.filter(c => c.id === 0)
      const merged  = fresh.filter((c: Category) => c.id !== 0).map((f: Category) => {
        const existing = categories.find(c => c.id === f.id)
        return existing ? { ...existing, ...f } : f
      })
      categories = [...zeroCat, ...merged]
    } catch (e: any) {
      catsError = e?.message ?? 'Failed to load folders'
    } finally { catsLoading = false }
  }

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    try {
      const cat = await getAdapter().createCategory(name)
      categories = [...categories, cat]
      newFolderName = ''
    } catch (e: any) { catsError = e?.message ?? 'Failed to create folder' }
  }

  function startEdit(id: number, name: string) { editingId = id; editingName = name }

  async function commitEdit() {
    if (editingId !== null && editingName.trim()) {
      try {
        await (getAdapter() as any).updateCategory(editingId, { name: editingName.trim() })
        categories = categories.map(c => c.id === editingId ? { ...c, name: editingName.trim() } : c)
      } catch (e: any) { catsError = e?.message ?? 'Failed to rename' }
    }
    editingId = null; editingName = ''
  }

  async function deleteFolder(id: number) {
    try {
      await getAdapter().deleteCategory(id)
      categories = categories.filter(c => c.id !== id)
    } catch (e: any) { catsError = e?.message ?? 'Failed to delete folder' }
  }

  async function toggleCategoryFlag(id: number, flag: 'includeInUpdate' | 'includeInDownload') {
    const cat = categories.find(c => c.id === id)
    if (!cat) return
    const next = !cat[flag]
    categories = categories.map(c => c.id === id ? { ...c, [flag]: next } : c)
    try {
      await (getAdapter() as any).updateCategories([id], { [flag]: next ? 'INCLUDE' : 'EXCLUDE' })
    } catch (e: any) {
      categories = categories.map(c => c.id === id ? { ...c, [flag]: !next } : c)
      catsError = e?.message ?? 'Failed to update folder'
    }
  }

  function applyReorder(fromStrId: string, toStrId: string) {
    const catIds = categories.filter(c => c.id !== 0).map(c => String(c.id))
    const allIds = ['library', 'downloaded', ...catIds]
    const current = settingsState.settings.libraryPinnedTabOrder ?? []
    const base    = [...new Set([...current.filter(id => allIds.includes(id)), ...allIds])]
    const fromIdx = base.indexOf(fromStrId)
    const toIdx   = base.indexOf(toStrId)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    base.splice(fromIdx, 1)
    base.splice(toIdx, 0, fromStrId)
    updateSettings({ libraryPinnedTabOrder: base })

    const fromNumId = Number(fromStrId)
    if (!isNaN(fromNumId) && fromStrId !== 'library' && fromStrId !== 'downloaded') {
      const zeroCat  = categories.filter(c => c.id === 0)
      const sortable = categories.filter(c => c.id !== 0).sort((a, b) => a.order - b.order)
      const sFromIdx = sortable.findIndex(c => c.id === fromNumId)
      const sToIdx   = sortable.findIndex(c => String(c.id) === toStrId)
      if (sFromIdx >= 0 && sToIdx >= 0 && sFromIdx !== sToIdx) {
        const reordered = [...sortable]
        const [moved]   = reordered.splice(sFromIdx, 1)
        reordered.splice(sToIdx, 0, moved)
        const optimistic = [...zeroCat, ...reordered.map((c, i) => ({ ...c, order: i + 1 }))]
        categories = optimistic
        const serverPosition = sToIdx + 1
        getAdapter().updateCategoryOrder(fromNumId, serverPosition)
          .then((updated: Category[]) => {
            categories = [
              ...zeroCat,
              ...updated.sort((a: Category, b: Category) => a.order - b.order).map((fresh: Category) => {
                const local = optimistic.find(c => c.id === fresh.id)
                return local ? { ...fresh, mangas: local.mangas } : fresh
              }),
            ]
          })
          .catch(async (e: any) => {
            catsError = e?.message ?? 'Failed to reorder'
            await loadCategories()
          })
      }
    }
  }

  function onDragStart(e: DragEvent, id: string) {
    dragStrId = id
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) }
  }

  function onDragOver(e: DragEvent, id: string) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (dragStrId === id) return
    dragOverStrId = id
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dropPosition = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
  }

  function onDrop(e: DragEvent, id: string) {
    e.preventDefault()
    if (dragStrId !== null && dragStrId !== id) applyReorder(dragStrId, id)
    dragStrId = null; dragOverStrId = null; dropPosition = null
  }

  function onDragEnd() { dragStrId = null; dragOverStrId = null; dropPosition = null }

  function focusInput(node: HTMLElement) { node.focus() }

  $effect(() => {
    if (!categories.length && !catsLoading) loadCategories()
  })
</script>

<div class="s-panel">
  <div class="s-section">
    <p class="s-section-title">Manage Folders</p>
    <div class="s-section-body">
      <div class="s-row">
        <span class="s-desc">Folders are stored as Suwayomi categories. Changes sync across all clients.</span>
      </div>

      {#if catsError}
        <div class="s-banner s-banner-error">{catsError}</div>
      {/if}

      {#if catsLoading}
        <p class="s-empty">Loading folders…</p>
      {:else}
        <div class="s-folder-list" class:is-dragging={dragStrId !== null}>
          {#each orderedAllIds as id}
            {@const isBuiltin   = id === 'library' || id === 'downloaded'}
            {@const isCompleted = id === completedId}
            {@const cat         = isBuiltin ? null : (categories.find(c => String(c.id) === id) ?? null)}
            {@const hidden      = isHidden(id)}

            {#if isBuiltin || cat}
              <div
                class="s-folder-row"
                role="listitem"
                class:dragging={dragStrId === id}
                class:drop-above={dragOverStrId === id && dragStrId !== id && dropPosition === 'above'}
                class:drop-below={dragOverStrId === id && dragStrId !== id && dropPosition === 'below'}
                draggable="true"
                ondragstart={(e) => onDragStart(e, id)}
                ondragover={(e) => onDragOver(e, id)}
                ondragleave={() => { if (dragOverStrId === id) { dragOverStrId = null; dropPosition = null } }}
                ondrop={(e) => onDrop(e, id)}
                ondragend={onDragEnd}
              >
                {#if isCompleted}
                  <span class="s-folder-icon">
                    <CheckSquare size={14} weight="light" />
                    <DotsSixVertical size={14} weight="bold" />
                  </span>
                  <span class="s-folder-name">{cat?.name ?? 'Completed'}</span>
                  <span class="s-folder-count">{libraryState.counts[String(cat?.id)] ?? 0} manga</span>
                  <span class="s-folder-badge">built-in</span>
                  <div class="s-folder-actions">
                    <button class="s-btn-icon" class:muted={hidden} onclick={() => toggleHidden(id)} title={hidden ? 'Show tab in library' : 'Hide tab from library'}>
                      {#if hidden}<EyeSlash size={13} weight="light" />{:else}<Eye size={13} weight="light" />{/if}
                    </button>
                    <button class="s-btn-icon s-btn-icon-lock" disabled title="Built-in tab — cannot be deleted"><Lock size={12} weight="light" /></button>
                  </div>

                {:else if isBuiltin}
                  <span class="s-folder-icon">
                    {#if id === 'library'}<BookmarkSimple size={14} weight="light" />{:else}<DownloadSimple size={14} weight="light" />{/if}
                    <DotsSixVertical size={14} weight="bold" />
                  </span>
                  <span class="s-folder-name">{id === 'library' ? 'Saved' : 'Downloaded'}</span>
                  <span class="s-folder-badge">built-in</span>
                  <div class="s-folder-actions">
                    <button class="s-btn-icon" class:muted={hidden} onclick={() => toggleHidden(id)} title={hidden ? 'Show tab in library' : 'Hide tab from library'}>
                      {#if hidden}<EyeSlash size={13} weight="light" />{:else}<Eye size={13} weight="light" />{/if}
                    </button>
                    <button class="s-btn-icon s-btn-icon-lock" disabled title="Built-in tab — cannot be deleted"><Lock size={12} weight="light" /></button>
                  </div>

                {:else if cat}
                  {#if editingId === cat.id}
                    <input class="s-input full" bind:value={editingName}
                      onkeydown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { editingId = null } }}
                      onblur={commitEdit} use:focusInput />
                    <button class="s-btn-icon" onclick={commitEdit} title="Save">✓</button>
                  {:else}
                    <div class="s-folder-identity" role="button" tabindex="0" draggable="true"
                      ondragstart={(e) => onDragStart(e, id)}
                      ondragend={onDragEnd}
                      onkeydown={(e) => e.key === 'Enter' && startEdit(cat.id, cat.name)}>
                      <span class="s-folder-icon">
                        <FolderSimple size={14} weight="light" />
                        <DotsSixVertical size={14} weight="bold" />
                      </span>
                      <button class="s-folder-name" onclick={(e) => { e.stopPropagation(); startEdit(cat.id, cat.name) }} title="Click to rename">{cat.name}</button>
                    </div>
                    <span class="s-folder-count">{libraryState.counts[String(cat.id)] ?? 0} manga</span>
                    <div class="s-folder-actions">
                      <button class="s-btn-icon"
                        class:active={(settingsState.settings.defaultLibraryCategoryId ?? null) === cat.id}
                        onclick={() => updateSettings({ defaultLibraryCategoryId: (settingsState.settings.defaultLibraryCategoryId ?? null) === cat.id ? null : cat.id })}
                        title={(settingsState.settings.defaultLibraryCategoryId ?? null) === cat.id ? 'Remove as default folder' : 'Set as default folder'}>
                        <Star size={13} weight={(settingsState.settings.defaultLibraryCategoryId ?? null) === cat.id ? 'fill' : 'light'} />
                      </button>
                      <button class="s-btn-icon" class:muted={hidden} onclick={() => toggleHidden(id)} title={hidden ? 'Show in library' : 'Hide from library'}>
                        {#if hidden}<EyeSlash size={13} weight="light" />{:else}<Eye size={13} weight="light" />{/if}
                      </button>
                      <button class="s-btn-icon"
                        class:active={cat.includeInUpdate !== false}
                        class:inactive={cat.includeInUpdate === false}
                        onclick={() => toggleCategoryFlag(cat.id, 'includeInUpdate')}
                        title={cat.includeInUpdate !== false ? 'Included in updates — click to exclude' : 'Excluded from updates — click to include'}>
                        {#if cat.includeInUpdate !== false}<ArrowsClockwise size={13} weight="bold" />{:else}<ArrowsCounterClockwise size={13} weight="light" />{/if}
                      </button>
                      <button class="s-btn-icon"
                        class:active={cat.includeInDownload !== false}
                        class:inactive={cat.includeInDownload === false}
                        onclick={() => toggleCategoryFlag(cat.id, 'includeInDownload')}
                        title={cat.includeInDownload !== false ? 'Included in auto-downloads — click to exclude' : 'Excluded from auto-downloads — click to include'}>
                        <DownloadSimple size={13} weight={cat.includeInDownload !== false ? 'bold' : 'light'} />
                      </button>
                      <button class="s-btn-icon danger" onclick={() => deleteFolder(cat.id)} title="Delete folder">
                        <Trash size={12} weight="light" />
                      </button>
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        {#if categories.filter(c => c.id !== 0 && c.name !== 'Completed').length === 0}
          <p class="s-empty">No custom folders yet. Create one below.</p>
        {/if}
      {/if}

      <div class="s-folder-create">
        <input class="s-input full" placeholder="New folder name…" bind:value={newFolderName}
          onkeydown={(e) => e.key === 'Enter' && createFolder()} />
        <button class="s-btn s-btn-accent" onclick={createFolder} disabled={!newFolderName.trim()}>
          <Plus size={13} weight="bold" /> Create
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .s-folder-list { display: contents; }

  .s-folder-list.is-dragging,
  .s-folder-list.is-dragging * { user-select: none; -webkit-user-select: none; }

  .s-folder-row { transition: opacity 0.15s, background 0.1s; position: relative; }
  .s-folder-row.dragging { opacity: 0.35; }

  .s-folder-row.drop-above::before,
  .s-folder-row.drop-below::after {
    content: '';
    position: absolute;
    left: 8px; right: 8px;
    height: 2px;
    background: var(--color-success, #4ade80);
    border-radius: 2px;
    pointer-events: none;
    z-index: 10;
  }
  .s-folder-row.drop-above::before { top: -1px; }
  .s-folder-row.drop-below::after  { bottom: -1px; }

  .s-folder-identity {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-primary);
    flex-shrink: 0;
    overflow: hidden;
    cursor: grab;
  }

  .s-folder-icon {
    display: grid;
    flex-shrink: 0;
    overflow: visible;
    padding: 1px;
  }
  .s-folder-icon > :global(*) { grid-area: 1 / 1; transition: opacity 0.12s; }
  .s-folder-icon > :global(*:last-child) { opacity: 0; }
  .s-folder-row:hover .s-folder-icon > :global(*:first-child) { opacity: 0; }
  .s-folder-row:hover .s-folder-icon > :global(*:last-child) { opacity: 1; }

  .s-folder-name {
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }
  .s-folder-name:hover { text-decoration: underline; text-underline-offset: 3px; }

  .s-folder-actions { display: flex; align-items: center; gap: 2px; margin-left: auto; flex-shrink: 0; }

  .s-folder-badge {
    font-size: 10px;
    letter-spacing: 0.04em;
    color: var(--text-faint);
    background: var(--bg-subtle);
    border: 1px solid var(--border-dim);
    border-radius: 3px;
    padding: 1px 5px;
    flex-shrink: 0;
    margin-left: 6px;
  }

  .s-btn-icon.active   { color: var(--accent, #6c8ef5); }
  .s-btn-icon.inactive { color: var(--color-error, #f87171); opacity: 0.75; }
  .s-btn-icon.inactive:hover { opacity: 1; }
  .s-btn-icon.muted    { color: var(--text-faint); opacity: 0.5; }
  .s-btn-icon-lock     { opacity: 0.25; cursor: not-allowed; }
  .s-btn-icon-lock:hover { opacity: 0.25; color: inherit; }
</style>