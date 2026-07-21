<script lang="ts">
  import { getAdapter }   from '$lib/request-manager'
  import { libraryState } from '$lib/state/library.svelte'
  import type { LibrarySortOption, LibraryContentFilter, LibraryStatusFilter } from '$lib/state/library.svelte'
  import { addToast }           from '$lib/state/notifications.svelte'
  import { updateSettings, settingsState } from '$lib/state/settings.svelte'
  import { readerState } from '$lib/state/reader.svelte'
  import { goto }               from '$app/navigation'
  import LibraryToolbar  from '$lib/components/library/LibraryToolbar.svelte'
  import LibraryGrid     from '$lib/components/library/LibraryGrid.svelte'
  import ContextMenu     from '$lib/components/shared/ui/ContextMenu.svelte'

  interface MenuEntry {
    label?:    string
    icon?:     unknown
    onClick?:  () => void
    children?: MenuEntry[]
    separator?: boolean
    danger?:   boolean
    disabled?: boolean
  }
  import type { Manga, Category } from '$lib/types'
  import {
    Books, Folder, FolderSimple, FolderSimplePlus,
    Trash, CheckSquare, ArrowSquareOut, ArrowsClockwise,
  } from 'phosphor-svelte'
  import { openMangaFolder, openDownloadsFolder } from '$lib/core/filesystem'

  const SIDEBAR_W      = 52
  const TITLEBAR_H     = 36
  const CTX_FOLDER_CAP = 4
  const DT_TAB         = 'application/x-moku-tab'
  const COMPLETED_NAME = 'Completed'

  let tabsEl: HTMLDivElement = $state() as HTMLDivElement
  let ctx:      { x: number; y: number; manga: Manga } | null = $state(null)
  let emptyCtx: { x: number; y: number } | null              = $state(null)

  let bulkWorking:     boolean      = $state(false)
  let sortPanelOpen:   boolean      = $state(false)
  let filterPanelOpen: boolean      = $state(false)
  let activeDragKind: 'tab' | null = $state(null)
  let dragInsertIdx                = $state(-1)
  let dragTabId:      string|null  = $state(null)
  let dragOverTabId:  string|null  = $state(null)

  $effect(() => {
    libraryState.syncFromSettings(settingsState.settings)
    loadLibrary()
  })
  $effect(() => { libraryState.tab; libraryState.exitSelect() })
  $effect(() => { libraryState.guardTab() })
  $effect(() => {
    if (readerState.activeManga === null) loadLibrary()
  })

  async function loadLibrary() {
    libraryState.loading = true
    libraryState.error   = null
    try {
      const result       = await getAdapter().getMangaList({ inLibrary: true })
      libraryState.items = result.items
      await loadCategories()
    } catch (e) {
      libraryState.error = String(e)
    } finally {
      libraryState.loading = false
    }
  }

  async function loadCategories() {
    try {
      let cats = await getAdapter().getCategories()

      if (!cats.some(c => c.name === COMPLETED_NAME)) {
        try {
          const created = await getAdapter().createCategory(COMPLETED_NAME)
          cats = [...cats, created]
        } catch {}
      }

      const needsPopulation = cats.every(c => !(c as any).mangas?.nodes?.length)
      if (needsPopulation && libraryState.items.length > 0) {
        cats = cats.map(c => {
          const nodes = libraryState.items.filter(m =>
            (m as any).categories?.nodes?.some((mc: any) => mc.id === c.id) ||
            (m as any).categoryIds?.includes(c.id)
          )
          return { ...c, mangas: { nodes } }
        }) as unknown as Category[]
      }

      libraryState.setCategories(cats)
    } catch (e) {
      libraryState.error = String(e)
    }
  }

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
    const catIds = libraryState.categories
      .filter(c => (libraryState.categoryMangaMap.get(c.id) ?? []).some(x => x.id === m.id))
      .map(c => c.id)
    if (catIds.length) {
      try {
        await getAdapter().updateMangaCategories(String(m.id), [], catIds)
      } catch (e) { console.error(e) }
    }
    await getAdapter().removeFromLibrary(String(m.id))
    libraryState.items = libraryState.items.filter(x => x.id !== m.id)
    await loadCategories()
  }

  async function doDeleteDownloads(m: Manga) {
    try {
      const chapters   = await getAdapter().getChapters(String(m.id))
      const downloaded = chapters.filter(c => c.downloaded).map(c => String(c.id))
      if (!downloaded.length) return
      await getAdapter().deleteDownloadedChapters(downloaded)
      libraryState.items = libraryState.items.map(x =>
        x.id === m.id ? { ...x, downloadCount: 0 } : x
      )
    } catch (e) { console.error(e) }
  }


  async function refreshSingleManga(m: Manga) {
    if (libraryState.refreshingMangaId !== null) return
    libraryState.refreshingMangaId = m.id
    try {
      await getAdapter().fetchManga(String(m.id))
      await loadLibrary()
      addToast({ kind: 'success', title: 'Manga refreshed', body: m.title })
    } catch (e) {
      addToast({ kind: 'error', title: 'Refresh failed', body: String(e) })
    } finally {
      libraryState.refreshingMangaId = null
    }
  }

  export async function checkAndMarkCompleted(mangaId: number) {
    const completedCat = libraryState.categories.find(c => c.name === COMPLETED_NAME)
    if (!completedCat) return
    const alreadyIn = (libraryState.categoryMangaMap.get(completedCat.id) ?? []).some(m => m.id === mangaId)
    if (alreadyIn) return
    try {
      await getAdapter().updateMangaCategories(String(mangaId), [completedCat.id], [])
      await loadCategories()
    } catch (e) { console.error(e) }
  }

  async function toggleMangaCategory(manga: Manga, cat: Category) {
    const nodes = (cat as any).mangas?.nodes ?? libraryState.categoryMangaMap.get(cat.id) ?? []
    const inCat = nodes.some((m: Manga) => m.id === manga.id)
    libraryState.setCategories(
      libraryState.categories.map(c => {
        if (c.id !== cat.id) return c
        const existing = (c as any).mangas?.nodes ?? []
        const updated  = inCat
          ? existing.filter((m: Manga) => m.id !== manga.id)
          : [...existing, manga]
        return { ...c, mangas: { nodes: updated } }
      }) as unknown as Category[]
    )
    if (!inCat) libraryState.bumpCategoryFrecency(cat.id)
    try {
      await getAdapter().updateMangaCategories(String(manga.id), inCat ? [] : [cat.id], inCat ? [cat.id] : [])
    } catch {}
    await loadCategories()
  }

  async function createAndAssign(manga: Manga) {
    const name = prompt('Folder name:')
    if (!name?.trim()) return
    try {
      const cat = await getAdapter().createCategory(name.trim())
      libraryState.setCategories([...libraryState.categories, cat])
      await getAdapter().updateMangaCategories(String(manga.id), [cat.id], [])
      libraryState.bumpCategoryFrecency(cat.id)
      await loadCategories()
    } catch (e) { console.error(e) }
  }

  async function bulkMove(cat: Category) {
    bulkWorking = true
    try {
      await getAdapter().updateMangasCategories(
        [...libraryState.selected].map(String),
        [cat.id],
        [],
      )
      await loadCategories()
    } catch (e) { console.error(e) }
    finally { bulkWorking = false; libraryState.exitSelect() }
  }

  async function bulkRemoveFromFolder() {
    const catId = Number(libraryState.tab)
    if (Number.isNaN(catId)) return
    bulkWorking = true
    try {
      await getAdapter().updateMangasCategories(
        [...libraryState.selected].map(String),
        [],
        [catId],
      )
      await loadCategories()
    } catch (e) { console.error(e) }
    finally { bulkWorking = false; libraryState.exitSelect() }
  }

  async function onBulkRemove() {
    bulkWorking = true
    try {
      await Promise.allSettled(
        [...libraryState.selected].map(async (id) => {
          const catIds = libraryState.categories
            .filter(c => (libraryState.categoryMangaMap.get(c.id) ?? []).some(x => x.id === id))
            .map(c => c.id)
          if (catIds.length) {
            try { await getAdapter().updateMangaCategories(String(id), [], catIds) } catch {}
          }
          return getAdapter().removeFromLibrary(String(id))
        })
      )
      libraryState.items = libraryState.items.filter(m => !libraryState.selected.has(m.id))
      libraryState.exitSelect()
    } finally { bulkWorking = false }
  }

  async function refreshCategory(catId: number) {
    if (libraryState.refreshingCatId !== null || libraryState.refreshing) return
    libraryState.refreshingCatId = catId
    try {
      await getAdapter().updateCategoryManga(catId)
      await loadLibrary()
      const cat = libraryState.categories.find(c => c.id === catId)
      addToast({ kind: 'success', title: 'Folder refreshed', body: cat?.name ?? '' })
    } catch (e) {
      addToast({ kind: 'error', title: 'Refresh failed', body: String(e) })
    } finally { libraryState.refreshingCatId = null }
  }

  function buildCtxItems(m: Manga): MenuEntry[] {
    const sorted   = [...libraryState.visibleCategories].sort(
      (a, b) => (libraryState.categoryFrecency[b.id] ?? 0) - (libraryState.categoryFrecency[a.id] ?? 0)
    )
    const pinned   = sorted.slice(0, CTX_FOLDER_CAP)
    const overflow = sorted.slice(CTX_FOLDER_CAP)

    const makeCatEntry = (cat: Category): MenuEntry => {
      const inCat = (libraryState.categoryMangaMap.get(cat.id) ?? []).some(x => x.id === m.id)
      return { label: inCat ? `Remove from ${cat.name}` : cat.name, icon: Folder, onClick: () => toggleMangaCategory(m, cat) }
    }

    return [
      { label: m.inLibrary ? 'Remove from library' : 'Add to library', icon: Books,
        onClick: () => m.inLibrary
          ? doRemove(m)
          : getAdapter().addToLibrary(String(m.id)).then(loadLibrary).catch(console.error) },
      { label: libraryState.refreshingMangaId === m.id ? 'Refreshing…' : 'Refresh manga', icon: ArrowsClockwise,
        disabled: libraryState.refreshingMangaId !== null, onClick: () => refreshSingleManga(m) },
      { label: 'Open in file manager', icon: ArrowSquareOut,
        disabled: !(m.downloadCount && m.downloadCount > 0), onClick: () => openMangaFolder(m) },
      { label: 'Delete all downloads', icon: Trash, danger: true,
        disabled: !(m.downloadCount && m.downloadCount > 0), onClick: () => doDeleteDownloads(m) },
      { separator: true },
      { label: 'Select', icon: CheckSquare, onClick: () => libraryState.enterSelect(m.id) },
      ...(pinned.length ? [{ separator: true } as MenuEntry, ...pinned.map(makeCatEntry)] : []),
      ...(overflow.length ? [{ label: `More folders (${overflow.length})`, icon: FolderSimple, onClick: () => {}, children: overflow.map(makeCatEntry) } as MenuEntry] : []),
      { separator: true },
      { label: 'New folder', icon: FolderSimplePlus, onClick: () => createAndAssign(m) },
    ]
  }

  function buildEmptyCtx(): MenuEntry[] {
    return [{
      label: 'New folder', icon: FolderSimplePlus,
      onClick: async () => {
        const name = prompt('Folder name:')
        if (!name?.trim()) return
        try {
          const cat = await getAdapter().createCategory(name.trim())
          libraryState.setCategories([...libraryState.categories, cat])
        } catch (e) { console.error(e) }
      },
    }]
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
    updateSettings({ libraryPinnedTabOrder: tabs })
    const catIds    = tabs.filter(id => id !== 'library' && id !== 'downloaded')
    const zeroCat   = libraryState.categories.filter(c => c.id === 0)
    const reordered = catIds.map((id, i) => {
      const c = libraryState.categories.find(x => String(x.id) === id)!
      return { ...c, order: i + 1 }
    })
    libraryState.setCategories([...zeroCat, ...reordered])

    if (dragStrId !== 'library' && dragStrId !== 'downloaded') {
      const serverPos = catIds.indexOf(dragStrId) + 1
      try {
        const cats = await getAdapter().updateCategoryOrder(Number(dragStrId), serverPos)
        libraryState.setCategories(cats)
      } catch { await loadCategories() }
    }
  }

  function onTabDragEnd() { activeDragKind = null; dragTabId = null; dragOverTabId = null; dragInsertIdx = -1 }
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
      tabSortMode={libraryState.tabSort[libraryState.tab]?.mode ?? 'az'}
      tabSortDir={libraryState.tabSort[libraryState.tab]?.dir ?? 'asc'}
      tabStatus={libraryState.tabStatus[libraryState.tab] ?? 'ALL'}
      tabFilters={libraryState.tabFilters[libraryState.tab] ?? {}}
      hasActiveFilters={libraryState.hasActiveFilters}
      visibleCategories={libraryState.visibleCategories}
      visibleTabIds={libraryState.visibleTabIds}
      completedCatId={libraryState.completedCatId}
      counts={libraryState.counts}
      search={libraryState.filter.query}
      viewMode={libraryState.viewMode}
      {activeDragKind}
      {dragInsertIdx}
      {dragTabId}
      {dragOverTabId}
      {sortPanelOpen}
      {filterPanelOpen}
      bind:tabsEl
      onTabChange={(t) => libraryState.tab = t}
      onSearchChange={(q) => libraryState.filter.query = q}
      onSortChange={(mode) => libraryState.setTabSort(libraryState.tab, mode)}
      onSortDirToggle={() => libraryState.toggleTabSortDir(libraryState.tab)}
      onSortPanelToggle={() => sortPanelOpen = !sortPanelOpen}
      onStatusChange={(s) => libraryState.setTabStatus(libraryState.tab, s)}
      onFilterToggle={(f) => libraryState.toggleTabFilter(libraryState.tab, f)}
      onFiltersClear={() => libraryState.clearTabFilters(libraryState.tab)}
      onFilterPanelToggle={() => filterPanelOpen = !filterPanelOpen}
      onViewModeChange={(mode) => libraryState.setViewMode(mode)}
      onOpenDownloadsFolder={openDownloadsFolder}
      onTabDragStart={onTabDragStart}
      onTabDragOver={onTabDragOver}
      onTabDragLeave={onTabDragLeave}
      onTabDrop={onTabDrop}
      onTabDragEnd={onTabDragEnd}
    />

    <LibraryGrid
      items={libraryState.filteredItems}
      loading={libraryState.loading}
      selectMode={libraryState.selectMode}
      selected={libraryState.selected}
      tab={libraryState.tab}
      visibleCategories={libraryState.visibleCategories}
      {bulkWorking}
      viewMode={libraryState.viewMode}
      onCardClick={onCardClick}
      onCardContextMenu={openCtx}
      onSelectAll={() => libraryState.selectAll(libraryState.filteredItems.map(m => m.id))}
      onExitSelect={() => libraryState.exitSelect()}
      onBulkRemove={onBulkRemove}
      onBulkRemoveFromFolder={bulkRemoveFromFolder}
      onBulkMove={bulkMove}
      onViewModeChange={(mode) => libraryState.setViewMode(mode)}
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
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
</style>