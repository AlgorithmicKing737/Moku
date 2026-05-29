<script lang="ts">
  import { goto }         from '$app/navigation'
  import { invoke }       from '@tauri-apps/api/core'
  import { libraryState } from '$lib/state/library.svelte'
  import type { LibrarySortOption, LibraryContentFilter, LibraryStatusFilter } from '$lib/state/library.svelte'
  import {
    loadLibrary, refreshLibrary, removeFromLibrary,
    bulkRemoveFromLibrary, loadCategories, createCategory,
    updateMangaCategories, updateCategoryOrder,
  } from '$lib/request-manager/manga'
  import { startLibraryUpdate }  from '$lib/components/library/lib/libraryUpdater'
  import { toast }               from '$lib/state/notifications.svelte'
  import LibraryToolbar          from '$lib/components/library/LibraryToolbar.svelte'
  import LibraryGrid             from '$lib/components/library/LibraryGrid.svelte'
  import ContextMenu             from '$lib/components/shared/ui/ContextMenu.svelte'
  import type { MenuEntry }      from '$lib/components/shared/ui/ContextMenu.svelte'
  import type { Manga, Category } from '$lib/types'
  import {
    Books, Folder, FolderSimple, FolderSimplePlus,
    Trash, CheckSquare, ArrowSquareOut, ArrowsClockwise,
  } from 'phosphor-svelte'

  const SIDEBAR_W    = 52
  const TITLEBAR_H   = 36
  const CTX_FOLDER_CAP = 4
  const DT_TAB = 'application/x-moku-tab'

  let cancelUpdate: (() => void) | null = null
  let refreshDoneTimer: ReturnType<typeof setTimeout> | null = null

  let ctx:      { x: number; y: number; manga: Manga } | null = $state(null)
  let emptyCtx: { x: number; y: number } | null              = $state(null)

  let bulkWorking = $state(false)

  let activeDragKind: 'tab' | null = $state(null)
  let dragInsertIdx                = $state(-1)
  let dragTabId:     string | null = $state(null)
  let dragOverTabId: string | null = $state(null)

  $effect(() => {
    loadLibrary()
    loadCategories()
  })

  $effect(() => {
    libraryState.tab
    libraryState.exitSelect()
  })

  $effect(() => {
    libraryState.guardTab()
  })

  function onCardClick(e: MouseEvent, m: Manga) {
    if (libraryState.selectMode) { libraryState.toggleSelect(m.id); return }
    if (e.metaKey || e.ctrlKey || e.shiftKey) { e.preventDefault(); libraryState.enterSelect(m.id); return }
    goto(`/series/${m.id}`)
  }

  function openCtx(e: MouseEvent, m: Manga) {
    if (libraryState.selectMode) { libraryState.toggleSelect(m.id); return }
    e.preventDefault()
    ctx = { x: e.clientX - SIDEBAR_W, y: e.clientY - TITLEBAR_H, manga: m }
  }

  async function doRemove(m: Manga) {
    await removeFromLibrary(String(m.id))
    await loadCategories()
  }

  async function doDeleteDownloads(_m: Manga) {}

  async function openMangaFolder(m: Manga) {
    let base: string | undefined
    try { base = await invoke<string>('get_default_downloads_path') } catch {}
    if (!base) { toast({ kind: 'error', message: 'No downloads path set' }); return }
    const source = (m as any).source?.displayName ?? (m as any).source?.name ?? ''
    const sanitize = (s: string) => s.replace(/[\/\\?%*:|"<>]/g, '_')
    const path = source
      ? `${base}/mangas/${sanitize(source)}/${sanitize(m.title)}`
      : `${base}/mangas/${sanitize(m.title)}`
    try { await invoke('open_path', { path }) }
    catch (e: any) { toast({ kind: 'error', message: 'Could not open folder', detail: e?.toString?.() ?? path }) }
  }

  async function openDownloadsFolder() {
    let path: string | undefined
    try { path = await invoke<string>('get_default_downloads_path') } catch {}
    if (!path) { toast({ kind: 'error', message: 'No downloads path set' }); return }
    try { await invoke('open_path', { path }) }
    catch (e: any) { toast({ kind: 'error', message: 'Could not open folder', detail: e?.toString?.() ?? path }) }
  }

  async function toggleMangaCategory(manga: Manga, cat: Category) {
    const nodes = (cat as any).mangas?.nodes ?? libraryState.categoryMangaMap.get(cat.id) ?? []
    const inCat = nodes.some((m: Manga) => m.id === manga.id)
    libraryState.setCategories(
      libraryState.categories.map(c => {
        if (c.id !== cat.id) return c
        const existing = (c as any).mangas?.nodes ?? []
        const updated  = inCat ? existing.filter((m: Manga) => m.id !== manga.id) : [...existing, manga]
        return { ...c, mangas: { nodes: updated } }
      })
    )
    if (!inCat) libraryState.bumpCategoryFrecency(cat.id)
    try {
      await updateMangaCategories(String(manga.id), inCat ? [] : [cat.id], inCat ? [cat.id] : [])
    } catch { await loadCategories() }
    await loadCategories()
  }

  async function createAndAssign(manga: Manga) {
    const name = prompt('Folder name:')
    if (!name?.trim()) return
    try {
      const cat = await createCategory(name.trim())
      await updateMangaCategories(String(manga.id), [cat.id], [])
      libraryState.bumpCategoryFrecency(cat.id)
    } catch (e) { console.error(e) }
  }

  function buildCtxItems(m: Manga): MenuEntry[] {
    const sorted = [...libraryState.visibleCategories].sort(
      (a, b) => (libraryState.categoryFrecency[b.id] ?? 0) - (libraryState.categoryFrecency[a.id] ?? 0)
    )
    const pinned   = sorted.slice(0, CTX_FOLDER_CAP)
    const overflow = sorted.slice(CTX_FOLDER_CAP)

    const makeCatEntry = (cat: Category): MenuEntry => {
      const inCat = (libraryState.categoryMangaMap.get(cat.id) ?? []).some(x => x.id === m.id)
      return {
        label:   inCat ? `Remove from ${cat.name}` : cat.name,
        icon:    Folder,
        onClick: () => toggleMangaCategory(m, cat),
      }
    }

    return [
      {
        label:   m.inLibrary ? 'Remove from library' : 'Add to library',
        icon:    Books,
        onClick: () => m.inLibrary ? doRemove(m) : loadLibrary(),
      },
      {
        label:    libraryState.refreshingMangaId === m.id ? 'Refreshing…' : 'Refresh manga',
        icon:     ArrowsClockwise,
        disabled: libraryState.refreshingMangaId !== null,
        onClick:  () => refreshSingleManga(m),
      },
      {
        label:    'Open in file manager',
        icon:     ArrowSquareOut,
        disabled: !(m.downloadCount && m.downloadCount > 0),
        onClick:  () => openMangaFolder(m),
      },
      {
        label:    'Delete all downloads',
        icon:     Trash,
        danger:   true,
        disabled: !(m.downloadCount && m.downloadCount > 0),
        onClick:  () => doDeleteDownloads(m),
      },
      { separator: true },
      { label: 'Select', icon: CheckSquare, onClick: () => libraryState.enterSelect(m.id) },
      ...(pinned.length ? [{ separator: true } as MenuEntry, ...pinned.map(makeCatEntry)] : []),
      ...(overflow.length ? [{
        label:    `More folders (${overflow.length})`,
        icon:     FolderSimple,
        onClick:  () => {},
        children: overflow.map(makeCatEntry),
      } as MenuEntry] : []),
      { separator: true },
      { label: 'New folder', icon: FolderSimplePlus, onClick: () => createAndAssign(m) },
    ]
  }

  function buildEmptyCtx(): MenuEntry[] {
    return [{
      label:   'New folder',
      icon:    FolderSimplePlus,
      onClick: async () => {
        const name = prompt('Folder name:')
        if (!name?.trim()) return
        try { await createCategory(name.trim()) }
        catch (e) { console.error(e) }
      },
    }]
  }

  async function refreshSingleManga(m: Manga) {
    if (libraryState.refreshingMangaId !== null) return
    libraryState.refreshingMangaId = m.id
    try {
      await refreshLibrary()
      toast({ kind: 'success', message: 'Manga refreshed', detail: m.title })
    } finally {
      libraryState.refreshingMangaId = null
    }
  }

  async function startRefresh() {
    if (libraryState.refreshing) return
    libraryState.refreshing = true
    libraryState.refreshProgress = { finished: 0, total: 0 }

    cancelUpdate = startLibraryUpdate({
      onProgress(p) { libraryState.refreshProgress = p },
      async onDone({ newChapters, totalUpdated }) {
        libraryState.refreshing = false
        cancelUpdate = null
        await loadLibrary()
        libraryState.refreshDone = true
        if (refreshDoneTimer) clearTimeout(refreshDoneTimer)
        refreshDoneTimer = setTimeout(() => { libraryState.refreshDone = false }, 2500)
        if (newChapters > 0) {
          toast({ kind: 'success', message: 'Library updated', detail: `${newChapters} new chapter${newChapters !== 1 ? 's' : ''} across ${totalUpdated} series` })
        } else {
          toast({ kind: 'info', message: 'Already up to date' })
        }
      },
      onError() { libraryState.refreshing = false; cancelUpdate = null },
    })
  }

  async function cancelRefresh() {
    if (!libraryState.refreshing) return
    cancelUpdate?.()
    cancelUpdate = null
    libraryState.refreshing = false
    libraryState.refreshProgress = { finished: 0, total: 0 }
  }

  async function refreshCategory(catId: number) {
    if (libraryState.refreshingCatId !== null || libraryState.refreshing) return
    libraryState.refreshingCatId = catId
    try {
      await loadLibrary()
      const cat = libraryState.categories.find(c => c.id === catId)
      toast({ kind: 'success', message: 'Folder refreshed', detail: cat?.name ?? '' })
    } finally {
      libraryState.refreshingCatId = null
    }
  }

  async function bulkMove(cat: Category) {
    bulkWorking = true
    try {
      await Promise.all(
        [...libraryState.selected].map(id => {
          const m = libraryState.items.find(x => x.id === id)
          return m ? toggleMangaCategory(m, cat) : Promise.resolve()
        })
      )
    } finally {
      bulkWorking = false
      libraryState.exitSelect()
    }
  }

  async function onBulkRemove() {
    bulkWorking = true
    try { await bulkRemoveFromLibrary(libraryState.selected) }
    finally { bulkWorking = false }
  }

  function onTabDragStart(e: DragEvent, id: string) {
    activeDragKind = 'tab'; dragTabId = id
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData(DT_TAB, id)
    e.dataTransfer!.setData('text/plain', `tab:${id}`)
  }

  function onTabDragOver(e: DragEvent, id: string, idx: number) {
    if (activeDragKind !== 'tab' || dragTabId === null || dragTabId === id) return
    e.preventDefault(); e.dataTransfer!.dropEffect = 'move'
    dragOverTabId = id
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragInsertIdx = e.clientX < rect.left + rect.width / 2 ? idx : idx + 1
  }

  function onTabDragLeave() { dragOverTabId = null }

  async function onTabDrop(e: DragEvent, dropId: string) {
    e.preventDefault(); dragOverTabId = null
    const insertAt = dragInsertIdx; dragInsertIdx = -1
    if (activeDragKind !== 'tab' || dragTabId === null || dragTabId === dropId) { dragTabId = null; return }
    const dragStrId = dragTabId; dragTabId = null; activeDragKind = null

    const tabs    = [...libraryState.allTabIds]
    const fromIdx = tabs.indexOf(dragStrId)
    const dropIdx = tabs.indexOf(dropId)
    if (fromIdx < 0 || dropIdx < 0) return

    const visibleDrop = libraryState.visibleTabIds[insertAt] ?? null
    const destIdx     = visibleDrop ? tabs.indexOf(visibleDrop) : tabs.length

    tabs.splice(fromIdx, 1)
    const adjusted = Math.max(0, Math.min(destIdx > fromIdx ? destIdx - 1 : destIdx, tabs.length))
    tabs.splice(adjusted, 0, dragStrId)

    libraryState.pinnedTabOrder = tabs

    const catIds    = tabs.filter(id => id !== 'library' && id !== 'downloaded')
    const zeroCat   = libraryState.categories.filter(c => c.id === 0)
    const reordered = catIds.map((id, i) => {
      const c = libraryState.categories.find(x => String(x.id) === id)!
      return { ...c, order: i + 1 }
    })
    libraryState.setCategories([...zeroCat, ...reordered])

    const dragIsBuiltin = dragStrId === 'library' || dragStrId === 'downloaded'
    if (!dragIsBuiltin) {
      const serverPos = catIds.indexOf(dragStrId) + 1
      try { await updateCategoryOrder(Number(dragStrId), serverPos) }
      catch { await loadCategories() }
    }
  }

  function onTabDragEnd() {
    activeDragKind = null; dragTabId = null; dragOverTabId = null; dragInsertIdx = -1
  }
</script>

<div
  class="root"
  role="presentation"
  oncontextmenu={(e) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    emptyCtx = { x: e.clientX - SIDEBAR_W, y: e.clientY - TITLEBAR_H }
  }}
>
  {#if libraryState.error}
    <div class="center">
      <p class="error-msg">Could not load library</p>
      <p class="error-detail">{libraryState.error}</p>
      <button class="retry-btn" onclick={() => { loadLibrary(); loadCategories() }}>Retry</button>
    </div>
  {:else}
    <LibraryToolbar
      tab={libraryState.tab}
      tabSortMode={libraryState.tabSort[libraryState.tab]?.mode ?? 'alphabetical'}
      tabSortDir={libraryState.tabSort[libraryState.tab]?.dir ?? 'asc'}
      tabStatus={libraryState.tabStatus[libraryState.tab] ?? 'ALL'}
      tabFilters={libraryState.tabFilters[libraryState.tab] ?? {}}
      hasActiveFilters={libraryState.hasActiveFilters}
      visibleCategories={libraryState.visibleCategories}
      visibleTabIds={libraryState.visibleTabIds}
      counts={libraryState.counts}
      query={libraryState.filter.query}
      refreshing={libraryState.refreshing}
      refreshProgress={libraryState.refreshProgress}
      refreshDone={libraryState.refreshDone}
      refreshingCatId={libraryState.refreshingCatId}
      {activeDragKind}
      {dragInsertIdx}
      {dragTabId}
      {dragOverTabId}
      onTabChange={(t) => libraryState.tab = t}
      onQuery={(q) => libraryState.filter.query = q}
      onSortChange={(mode) => libraryState.setTabSort(libraryState.tab, mode)}
      onSortDirToggle={() => libraryState.toggleTabSortDir(libraryState.tab)}
      onStatusChange={(s) => libraryState.setTabStatus(libraryState.tab, s)}
      onFilterToggle={(f) => libraryState.toggleTabFilter(libraryState.tab, f)}
      onFiltersClear={() => libraryState.clearTabFilters(libraryState.tab)}
      onRefresh={startRefresh}
      onCancelRefresh={cancelRefresh}
      onRefreshCategory={refreshCategory}
      onOpenDownloadsFolder={openDownloadsFolder}
      onTabDragStart={onTabDragStart}
      onTabDragOver={onTabDragOver}
      onTabDragLeave={onTabDragLeave}
      onTabDrop={onTabDrop}
      onTabDragEnd={onTabDragEnd}
    />

    {#if libraryState.refreshing && libraryState.refreshProgress.total > 0}
      {@const pct = Math.round((libraryState.refreshProgress.finished / libraryState.refreshProgress.total) * 100)}
      <div class="refresh-bar-wrap" aria-hidden="true">
        <div class="refresh-bar-fill" style="width:{pct}%"></div>
      </div>
    {/if}

    <LibraryGrid
      items={libraryState.filteredItems}
      loading={libraryState.loading}
      selectMode={libraryState.selectMode}
      selected={libraryState.selected}
      tab={libraryState.tab}
      visibleCategories={libraryState.visibleCategories}
      {bulkWorking}
      {onCardClick}
      onCardContextMenu={openCtx}
      onSelectAll={() => libraryState.selectAll(libraryState.filteredItems.map(m => m.id))}
      onExitSelect={() => libraryState.exitSelect()}
      onBulkRemove={onBulkRemove}
      onBulkMove={bulkMove}
    />
  {/if}
</div>

{#if ctx}
  <ContextMenu x={ctx.x} y={ctx.y} items={buildCtxItems(ctx.manga)} onClose={() => ctx = null} />
{/if}
{#if emptyCtx}
  <ContextMenu x={emptyCtx.x} y={emptyCtx.y} items={buildEmptyCtx()} onClose={() => emptyCtx = null} />
{/if}

<style>
  .root {
    position: relative; display: flex; flex-direction: column;
    height: 100%; overflow: hidden;
    animation: fadeIn 0.14s ease both;
  }

  .center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 60%; gap: var(--sp-2);
    color: var(--text-muted); text-align: center;
  }
  .error-msg    { color: var(--color-error); font-size: var(--text-base); }
  .error-detail { color: var(--text-faint);  font-size: var(--text-sm); }
  .retry-btn {
    margin-top: var(--sp-3); padding: 6px 16px;
    border-radius: var(--radius-md); border: 1px solid var(--border-dim);
    background: var(--bg-raised); color: var(--text-muted);
    cursor: pointer; font-family: var(--font-ui);
    font-size: var(--text-xs); letter-spacing: var(--tracking-wide);
  }

  .refresh-bar-wrap { height: 2px; background: var(--border-dim); flex-shrink: 0; overflow: hidden; }
  .refresh-bar-fill { height: 100%; background: var(--accent); border-radius: 0 2px 2px 0; transition: width 0.6s ease; }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>