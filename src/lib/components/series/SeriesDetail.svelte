<script lang="ts">
  import { untrack }      from 'svelte'
  import { goto }         from '$app/navigation'
  import SeriesHeader     from '$lib/components/series/SeriesHeader.svelte'
  import SeriesActions    from '$lib/components/series/SeriesActions.svelte'
  import ChapterList      from '$lib/components/series/ChapterList.svelte'
  import {
    CheckCircle, Circle, ArrowFatLinesUp, ArrowFatLinesDown,
    ArrowFatLineUp, ArrowFatLineDown, Download, Trash, DownloadSimple, CheckSquare,
  } from 'phosphor-svelte'
  import type { MenuEntry }            from '$lib/components/shared/ui/ContextMenu.svelte'
  import { getManga, getMangaList }    from '$lib/request-manager/manga'
  import { getChapters, fetchChapters, markChapterRead, markChaptersRead, deleteDownloadedChapters } from '$lib/request-manager/chapters'
  import { downloadStore }             from '$lib/state/downloads.svelte'
  import { getCategories, updateMangaCategories, createCategory as createCategoryReq, updateManga } from '$lib/request-manager/manga'
  import { saveScroll, getScroll }     from '$lib/state/app.svelte'
  import { seriesState, openReader, addBookmark,
           acknowledgeUpdate, clearMarkersForManga }  from '$lib/state/series.svelte'
  import { DEFAULT_MANGA_PREFS }       from '$lib/types/settings'
  import type { MangaPrefs }           from '$lib/types/settings'
  import { addToast }                  from '$lib/state/notifications.svelte'
  import { trackingState }             from '$lib/state/tracking.svelte'
  import { autoLinkLibrary }           from '$lib/core/cover/autoLink'
  import { buildChapterList }          from '$lib/components/series/lib/chapterList'
  import { getPref, setPref }          from '$lib/components/series/lib/mangaPrefs'
  import { openMangaFolder }           from '$lib/core/filesystem'
  import type { Manga, Chapter, Category } from '$lib/types'
  import AutomationPanel  from '$lib/components/series/panels/AutomationPanel.svelte'
  import CoverPickerPanel from '$lib/components/series/panels/CoverPickerPanel.svelte'
  import MarkersPanel     from '$lib/components/series/panels/MarkersPanel.svelte'
  import MigrateModal     from '$lib/components/shared/manga/MigrateModal.svelte'
  import SeriesLinkPanel  from '$lib/components/shared/manga/SeriesLinkPanel.svelte'
  import TrackingPanel    from '$lib/components/tracking/TrackingPanel.svelte'

  interface Props { mangaId: number }
  let { mangaId }: Props = $props()

  const CHAPTERS_PER_PAGE = 25
  const MANGA_TTL_MS      = 5 * 60 * 1000
  const CHAPTER_TTL_MS    = 2 * 60 * 1000

  const mangaCache:   Map<number, { data: Manga;     fetchedAt: number }> = new Map()
  const chapterCache: Map<number, { data: Chapter[]; fetchedAt: number }> = new Map()

  let manga:           Manga | null = $state(null)
  let chapters:        Chapter[]    = $state([])
  let loadingManga:    boolean      = $state(false)
  let loadingChapters: boolean      = $state(true)
  let enqueueing:      Set<number>  = $state(new Set())
  let togglingLibrary: boolean      = $state(false)
  let chapterPage:     number       = $state(1)
  let viewMode: 'list' | 'grid'    = $state('list')
  let deletingAll:     boolean      = $state(false)
  let refreshing:      boolean      = $state(false)
  let selectedIds:     Set<number>  = $state(new Set())
  let migrateOpen:     boolean      = $state(false)
  let autoOpen:        boolean      = $state(false)
  let trackingOpen:    boolean      = $state(false)
  let markersOpen:     boolean      = $state(false)
  let linkPickerOpen:  boolean      = $state(false)
  let coverPickerOpen: boolean      = $state(false)
  let allMangaForLink: Manga[]      = $state([])
  let loadingLinkList: boolean      = $state(false)
  let mangaCategories: Category[]   = $state([])
  let allCategories:   Category[]   = $state([])
  let catsLoading:     boolean      = $state(false)
  let chapterListEl:   HTMLDivElement | null = $state(null)

  let mangaAbort:    AbortController | null = null
  let chapterAbort:  AbortController | null = null
  let loadingFor:    number | null = null
  let prevChapterIds = new Set<number>()
  let prevMangaId:   number | null = null

  const get = <K extends keyof MangaPrefs>(key: K) =>
    mangaId ? getPref(mangaId, key) : DEFAULT_MANGA_PREFS[key]
  const set = <K extends keyof MangaPrefs>(key: K, value: MangaPrefs[K]) => {
    if (mangaId) setPref(mangaId, key, value)
  }

  const hasSelection       = $derived(selectedIds.size > 0)
  const sortDir            = $derived(seriesState.settings.chapterSortDir)
  const sortMode           = $derived(seriesState.settings.chapterSortMode ?? 'source')
  const scanlatorFilter    = $derived((get('scanlatorFilter')    ?? []) as string[])
  const scanlatorBlacklist = $derived((get('scanlatorBlacklist') ?? []) as string[])
  const scanlatorForce     = $derived((get('scanlatorForce')     ?? false) as boolean)

  const currentPrefs = $derived({
    sortMode,
    sortDir,
    preferredScanlator:  get('preferredScanlator') as string,
    scanlatorFilter:     scanlatorFilter as string[],
    scanlatorBlacklist:  scanlatorBlacklist as string[],
    scanlatorForce:      scanlatorForce as boolean,
  })

  const availableScanlators = $derived(
    [...new Set(chapters.map(c => c.scanlator).filter((s): s is string => !!s?.trim()))]
      .sort((a, b) => a.localeCompare(b))
  )

  const sortedChapters  = $derived(buildChapterList(chapters, currentPrefs))
  const totalPages      = $derived(Math.ceil(sortedChapters.length / CHAPTERS_PER_PAGE))
  const pageChapters    = $derived(sortedChapters.slice((chapterPage - 1) * CHAPTERS_PER_PAGE, chapterPage * CHAPTERS_PER_PAGE))
  const readCount       = $derived(sortedChapters.filter(c => c.read).length)
  const totalCount      = $derived(sortedChapters.length)
  const progressPct     = $derived(totalCount > 0 ? (readCount / totalCount) * 100 : 0)
  const downloadedCount = $derived(chapters.filter(c => c.downloaded).length)

  const continueChapter = $derived((() => {
    if (!sortedChapters.length) return null
    const asc      = [...sortedChapters].sort((a, b) => a.sourceOrder - b.sourceOrder)
    const anyRead  = asc.some(c => c.read)
    const bookmark = mangaId
      ? seriesState.bookmarks.find(b => b.mangaId === mangaId)
      : null
    const bookmarkedCh = bookmark ? asc.find(c => c.id === bookmark.chapterId) : null
    if (bookmarkedCh && !bookmarkedCh.read) {
      return { chapter: bookmarkedCh, type: (anyRead ? 'continue' : 'start') as const, resumePage: bookmark!.pageNumber }
    }
    const inProgress  = asc.find(c => !c.read && (c.lastPageRead ?? 0) > 0)
    const firstUnread = asc.find(c => !c.read)
    const target      = inProgress ?? firstUnread
    if (target) return { chapter: target, type: (anyRead ? 'continue' : 'start') as const, resumePage: null }
    return { chapter: asc[0], type: 'reread' as const, resumePage: null }
  })())

  const hasAnyAutomation = $derived(
    get('autoDownload')                       ||
    (get('downloadAhead') as number) > 0      ||
    (get('maxKeepChapters') as number) > 0    ||
    get('deleteOnRead')                       ||
    get('pauseUpdates')                       ||
    get('refreshInterval') !== 'global'       ||
    !!(get('preferredScanlator') as string)
  )

  const linkedIds = $derived(seriesState.settings.mangaLinks?.[mangaId] ?? [])

  function clearSelection() { selectedIds = new Set() }

  function toggleSelect(id: number, e: MouseEvent | KeyboardEvent) {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    selectedIds = next
  }

  function applyChapters(nodes: Chapter[]) {
    if (get('autoDownload') && prevChapterIds.size > 0) {
      const filtered    = buildChapterList(nodes, currentPrefs)
      const newChapters = filtered.filter(c => !prevChapterIds.has(c.id) && !c.downloaded)
      if (newChapters.length) enqueueMultiple(newChapters.map(c => c.id))
    }
    prevChapterIds = new Set(nodes.map(c => c.id))
    chapters = nodes
    if (mangaId && nodes.length > 0) checkAndMarkCompleted(mangaId, nodes)
  }

  function loadCategories(id: number) {
    catsLoading = true
    getCategories()
      .then(d => {
        allCategories   = d.filter(c => c.id !== 0)
        mangaCategories = allCategories.filter(c => c.mangas?.nodes?.some((m: Manga) => m.id === id))
      })
      .catch(console.error)
      .finally(() => { catsLoading = false })
  }

  async function checkAndMarkCompleted(id: number, chaps: Chapter[]) {
    if (chaps.length && manga?.status !== 'ONGOING') {
      const allRead   = chaps.every(c => c.read)
      const completed = allCategories.find(c => c.name === 'Completed')
      if (completed) {
        const inCompleted = mangaCategories.some(c => c.id === completed.id)
        if (allRead && !inCompleted)      mangaCategories = [...mangaCategories, completed]
        else if (!allRead && inCompleted) mangaCategories = mangaCategories.filter(c => c.id !== completed.id)
      }
    }
  }

  function loadMangaData(id: number) {
    mangaAbort?.abort()
    const ctrl = new AbortController()
    mangaAbort = ctrl; loadingFor = id
    const cached = mangaCache.get(id)
    if (cached) {
      manga = cached.data; loadingManga = false
      if (Date.now() - cached.fetchedAt < MANGA_TTL_MS) return
      getManga(id, ctrl.signal).then(m => {
        if (ctrl.signal.aborted || loadingFor !== id) return
        mangaCache.set(id, { data: m, fetchedAt: Date.now() })
        manga = m
      }).catch(() => {})
      return
    }
    loadingManga = true
    getManga(id, ctrl.signal).then(m => {
      if (ctrl.signal.aborted || loadingFor !== id) return
      mangaCache.set(id, { data: m, fetchedAt: Date.now() })
      manga = m
    }).catch(() => {}).finally(() => { if (!ctrl.signal.aborted && loadingFor === id) loadingManga = false })
  }

  function loadChaptersData(id: number) {
    chapterAbort?.abort()
    const ctrl = new AbortController()
    chapterAbort = ctrl
    const cached = chapterCache.get(id)
    if (cached) {
      applyChapters(cached.data); loadingChapters = false
      if (Date.now() - cached.fetchedAt < CHAPTER_TTL_MS) return
      fetchChapters(id, ctrl.signal)
        .then(() => getChapters(id, ctrl.signal))
        .then(nodes => {
          if (ctrl.signal.aborted || loadingFor !== id) return
          chapterCache.set(id, { data: nodes, fetchedAt: Date.now() })
          applyChapters(nodes)
        }).catch(() => {})
      return
    }
    chapters = []; loadingChapters = true
    getChapters(id, ctrl.signal).then(nodes => {
      if (ctrl.signal.aborted || loadingFor !== id) return
      applyChapters(nodes); loadingChapters = false
      return fetchChapters(id, ctrl.signal)
        .then(() => getChapters(id, ctrl.signal))
        .then(fresh => {
          if (ctrl.signal.aborted || loadingFor !== id) return
          chapterCache.set(id, { data: fresh, fetchedAt: Date.now() })
          applyChapters(fresh)
        })
    }).catch(() => { if (!ctrl.signal.aborted) loadingChapters = false })
  }

  async function syncTrackersIntoChapters(id: number, chaps: Chapter[]) {
    if (!seriesState.settings.trackerSyncBack) return
    const records = trackingState.recordsFor(id)
    if (!records.length) return
    for (const record of records) {
      try {
        const { markedIds } = await trackingState.syncFromRemote(id, record, chaps, currentPrefs)
        if (markedIds.length > 0) {
          const idSet = new Set(markedIds)
          chapters = chapters.map(c => idSet.has(c.id) ? { ...c, read: true } : c)
          chapterCache.set(id, { data: chapters, fetchedAt: Date.now() })
        }
      } catch {}
    }
  }

  $effect(() => {
    const id             = mangaId
    const shouldAutoLink = seriesState.settings.autoLinkOnOpen
    if (id) untrack(() => {
      acknowledgeUpdate(id)
      loadMangaData(id)
      loadChaptersData(id)
      loadCategories(id)
      trackingState.loadForManga(id).then(() => syncTrackersIntoChapters(id, chapters))
      if (shouldAutoLink) {
        if (allMangaForLink.length) {
          autoLinkLibrary(manga, allMangaForLink)
            .then(n => { if (n > 0) addToast({ kind: 'success', title: 'Series linked', body: `${n} new link${n === 1 ? '' : 's'} found` }) })
        } else {
          loadingLinkList = true
          getMangaList()
            .then(list => {
              allMangaForLink = list
              return autoLinkLibrary(manga, list)
            })
            .then(n => { if (n > 0) addToast({ kind: 'success', title: 'Series linked', body: `${n} new link${n === 1 ? '' : 's'} found` }) })
            .catch(console.error)
            .finally(() => { loadingLinkList = false })
        }
      }
    })
  })

  let prevChapterId: number | null = null
  $effect(() => {
    const wasOpen = prevChapterId !== null
    prevChapterId = seriesState.activeChapter?.id ?? null
    if (wasOpen && !seriesState.activeChapter) {
      untrack(() => { reloadChapters(mangaId) })
    }
  })

  $effect(() => {
    const id = mangaId
    if (id === prevMangaId) return
    if (chapterListEl && prevMangaId !== null) saveScroll(`series:${prevMangaId}`, chapterListEl.scrollTop)
    prevMangaId = id
    if (chapterListEl && id !== null) {
      chapterListEl.scrollTo({ top: getScroll(`series:${id}`) })
    }
  })

  $effect(() => () => { mangaAbort?.abort(); chapterAbort?.abort() })

  async function toggleLibrary() {
    if (!manga) return
    togglingLibrary = true
    const next = !manga.inLibrary
    await updateManga(manga.id, { inLibrary: next }).catch(console.error)
    manga = { ...manga, inLibrary: next }
    if (mangaCache.has(manga.id)) { const e = mangaCache.get(manga.id)!; mangaCache.set(manga.id, { ...e, data: manga }) }
    togglingLibrary = false
  }

  async function reloadChapters(id: number) {
    const nodes = await getChapters(id)
    chapterCache.set(id, { data: nodes, fetchedAt: Date.now() })
    applyChapters(nodes)
  }

  async function enqueue(ch: Chapter, e: MouseEvent) {
    e.stopPropagation()
    enqueueing = new Set(enqueueing).add(ch.id)
    const allowed = await downloadStore.enqueue(ch.id)
    if (allowed) addToast({ kind: 'download', title: 'Download queued', body: ch.name })
    enqueueing.delete(ch.id); enqueueing = new Set(enqueueing)
    reloadChapters(mangaId)
  }

  async function enqueueMultiple(chapterIds: number[]) {
    if (!chapterIds.length) return
    for (const id of chapterIds) {
      const allowed = await downloadStore.enqueue(id)
      if (!allowed) return
    }
    addToast({ kind: 'download', title: 'Download queued', body: `${chapterIds.length} chapter${chapterIds.length !== 1 ? 's' : ''} added` })
    reloadChapters(mangaId)
  }

  async function markRead(chapterId: number, isRead: boolean) {
    await markChapterRead(chapterId, isRead).catch(console.error)
    chapters = chapters.map(c => c.id === chapterId ? { ...c, read: isRead } : c)
    chapterCache.set(mangaId, { data: chapters, fetchedAt: Date.now() })
    checkAndMarkCompleted(mangaId, chapters)
    const ch = chapters.find(c => c.id === chapterId)
    if (ch) {
      if (isRead) await trackingState.updateFromRead(mangaId, ch, chapters, currentPrefs)
      else        await trackingState.updateFromUnread(mangaId, chapters, currentPrefs)
    }
    if (isRead) {
      if (get('deleteOnRead')) {
        if (ch?.downloaded) {
          const delayMs = (get('deleteDelayHours') as number) * 60 * 60 * 1000
          if (delayMs === 0) deleteDownloaded(chapterId)
          else setTimeout(() => deleteDownloaded(chapterId), delayMs)
        }
      }
      const ahead = get('downloadAhead') as number
      if (ahead > 0) {
        const idx = sortedChapters.findIndex(c => c.id === chapterId)
        if (idx >= 0) {
          const toQueue = sortedChapters.slice(idx + 1, idx + 1 + ahead).filter(c => !c.downloaded).map(c => c.id)
          if (toQueue.length) enqueueMultiple(toQueue)
        }
      }
    }
  }

  async function markBulk(ids: number[], isRead: boolean) {
    if (!ids.length) return
    await markChaptersRead(ids, isRead).catch(console.error)
    const idSet = new Set(ids)
    chapters = chapters.map(c => idSet.has(c.id) ? { ...c, read: isRead } : c)
    chapterCache.set(mangaId, { data: chapters, fetchedAt: Date.now() })
    checkAndMarkCompleted(mangaId, chapters)
    if (isRead) {
      const ascending   = [...chapters].sort((a, b) => a.sourceOrder - b.sourceOrder)
      const lastInBatch = ascending.filter(c => idSet.has(c.id)).at(-1)
      if (lastInBatch) await trackingState.updateFromRead(mangaId, lastInBatch, chapters, currentPrefs)
    } else {
      await trackingState.updateFromUnread(mangaId, chapters, currentPrefs)
    }
    if (isRead && get('deleteOnRead')) {
      const toDelete = ids.filter(id => chapters.find(c => c.id === id)?.downloaded)
      if (toDelete.length) {
        const delayMs = (get('deleteDelayHours') as number) * 60 * 60 * 1000
        const doDelete = async () => {
          await deleteDownloadedChapters(toDelete).catch(console.error)
          chapters = chapters.map(c => toDelete.includes(c.id) ? { ...c, downloaded: false } : c)
          chapterCache.set(mangaId, { data: chapters, fetchedAt: Date.now() })
        }
        if (delayMs === 0) doDelete(); else setTimeout(doDelete, delayMs)
      }
    }
  }

  async function deleteSelected() {
    const ids = [...selectedIds].filter(id => chapters.find(c => c.id === id)?.downloaded)
    if (ids.length) {
      await deleteDownloadedChapters(ids).catch(console.error)
      chapters = chapters.map(c => ids.includes(c.id) ? { ...c, downloaded: false } : c)
      chapterCache.set(mangaId, { data: chapters, fetchedAt: Date.now() })
    }
    clearSelection()
  }

  async function downloadSelected() {
    await enqueueMultiple([...selectedIds].filter(id => !chapters.find(c => c.id === id)?.downloaded))
    clearSelection()
  }

  async function markSelectedRead(isRead: boolean) {
    await markBulk([...selectedIds], isRead)
    clearSelection()
  }

  const markAboveRead   = (i: number) => markBulk(sortedChapters.slice(0, i + 1).filter(c => !c.read).map(c => c.id), true)
  const markBelowRead   = (i: number) => markBulk(sortedChapters.slice(i).filter(c => !c.read).map(c => c.id), true)
  const markAboveUnread = (i: number) => markBulk(sortedChapters.slice(0, i + 1).filter(c => c.read).map(c => c.id), false)
  const markBelowUnread = (i: number) => markBulk(sortedChapters.slice(i).filter(c => c.read).map(c => c.id), false)

  async function deleteDownloaded(chapterId: number) {
    await deleteDownloadedChapters([chapterId]).catch(console.error)
    chapters = chapters.map(c => c.id === chapterId ? { ...c, downloaded: false } : c)
    chapterCache.set(mangaId, { data: chapters, fetchedAt: Date.now() })
  }

  async function deleteAllDownloads() {
    const ids = chapters.filter(c => c.downloaded).map(c => c.id)
    if (!ids.length) return
    deletingAll = true
    await deleteDownloadedChapters(ids).catch(console.error)
    chapters = chapters.map(c => ({ ...c, downloaded: false }))
    chapterCache.set(mangaId, { data: chapters, fetchedAt: Date.now() })
    deletingAll = false
  }

  async function refreshChapters() {
    if (refreshing) return
    refreshing = true
    chapterCache.delete(mangaId)
    fetchChapters(mangaId)
      .then(() => reloadChapters(mangaId))
      .then(() => addToast({ kind: 'success', title: 'Chapters refreshed', body: `${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} available` }))
      .catch(e => addToast({ kind: 'error', title: 'Refresh failed', body: e?.message }))
      .finally(() => refreshing = false)
  }

  function buildCtxItems(ch: Chapter, idx: number): MenuEntry[] {
    const above = sortedChapters.slice(0, idx + 1)
    const below = sortedChapters.slice(idx)
    const last  = sortedChapters.length - 1
    return [
      { label: ch.read ? 'Mark as unread' : 'Mark as read', icon: ch.read ? Circle : CheckCircle, onClick: () => markRead(ch.id, !ch.read) },
      { label: 'Select', icon: CheckSquare, onClick: () => { const next = new Set(selectedIds); next.add(ch.id); selectedIds = next } },
      { separator: true },
      { label: 'Mark above as read',   icon: ArrowFatLinesUp,   onClick: () => markAboveRead(idx),   disabled: above.filter(c => !c.read).length === 0 },
      { label: 'Mark above as unread', icon: ArrowFatLineUp,    onClick: () => markAboveUnread(idx), disabled: above.filter(c => c.read).length === 0 },
      { separator: true },
      { label: 'Mark below as read',   icon: ArrowFatLinesDown, onClick: () => markBelowRead(idx),   disabled: idx === last || below.filter(c => !c.read).length === 0 },
      { label: 'Mark below as unread', icon: ArrowFatLineDown,  onClick: () => markBelowUnread(idx), disabled: idx === last || below.filter(c => c.read).length === 0 },
      { separator: true },
      { label: ch.downloaded ? 'Delete download' : 'Download', icon: ch.downloaded ? Trash : Download, danger: ch.downloaded, onClick: () => ch.downloaded ? deleteDownloaded(ch.id) : downloadStore.enqueue(ch.id) },
      { separator: true },
      { label: 'Download next 5 from here', icon: DownloadSimple, onClick: () => enqueueMultiple(sortedChapters.slice(idx, idx + 5).filter(c => !c.downloaded).map(c => c.id)) },
      { label: 'Download all from here',    icon: DownloadSimple, onClick: () => enqueueMultiple(sortedChapters.slice(idx).filter(c => !c.downloaded).map(c => c.id)) },
    ]
  }

  function enqueueNext(n: number) {
    if (!continueChapter) return
    const idx = sortedChapters.indexOf(continueChapter.chapter)
    if (idx < 0) return
    enqueueMultiple(sortedChapters.slice(idx, idx + n).filter(c => !c.downloaded).map(c => c.id))
  }

  function openReaderWithAhead(ch: Chapter, inProgress: boolean) {
    const ascList    = [...sortedChapters].sort((a, b) => a.sourceOrder - b.sourceOrder)
    const resumePage = inProgress ? ch.lastPageRead ?? null : null
    const ahead      = get('downloadAhead') as number
    if (ahead > 0) {
      const idx = ascList.indexOf(ch)
      if (idx >= 0) {
        const toQueue = ascList.slice(idx + 1, idx + 1 + ahead).filter(c => !c.downloaded).map(c => c.id)
        if (toQueue.length) enqueueMultiple(toQueue)
      }
    }
    if (inProgress && resumePage && resumePage > 1) {
      const existing = seriesState.bookmarks.find(b => b.chapterId === ch.id)
      if (!existing || existing.pageNumber < resumePage) {
        addBookmark({
          mangaId,
          mangaTitle:   manga!.title,
          thumbnailUrl: manga!.thumbnailUrl,
          chapterId:    ch.id,
          chapterName:  ch.name,
          pageNumber:   resumePage,
        })
      }
    }
    openReader(ch, ascList)
  }

  function handleContinue(cc: typeof continueChapter) {
    if (!cc) return
    const ascList = [...sortedChapters].sort((a, b) => a.sourceOrder - b.sourceOrder)
    const ahead   = get('downloadAhead') as number
    if (ahead > 0) {
      const idx = ascList.indexOf(cc.chapter)
      if (idx >= 0) {
        const toQueue = ascList.slice(idx + 1, idx + 1 + ahead).filter(c => !c.downloaded).map(c => c.id)
        if (toQueue.length) enqueueMultiple(toQueue)
      }
    }
    if (cc.type === 'continue' && cc.resumePage && cc.resumePage > 1) {
      const existing = seriesState.bookmarks.find(b => b.chapterId === cc.chapter.id)
      if (!existing || existing.pageNumber < cc.resumePage) {
        addBookmark({
          mangaId,
          mangaTitle:   manga!.title,
          thumbnailUrl: manga!.thumbnailUrl,
          chapterId:    cc.chapter.id,
          chapterName:  cc.chapter.name,
          pageNumber:   cc.resumePage,
        })
      }
    }
    openReader(cc.chapter, ascList)
  }

  async function openLinkPicker() {
    linkPickerOpen = true
    if (allMangaForLink.length) return
    loadingLinkList = true
    getMangaList()
      .then(list => { allMangaForLink = list })
      .catch(console.error)
      .finally(() => { loadingLinkList = false })
  }

  async function openCoverPicker() {
    coverPickerOpen = true
    if (allMangaForLink.length) return
    loadingLinkList = true
    getMangaList()
      .then(list => { allMangaForLink = list })
      .catch(console.error)
      .finally(() => { loadingLinkList = false })
  }

  async function toggleCategory(cat: Category) {
    const inCat = mangaCategories.some(c => c.id === cat.id)
    try {
      await updateMangaCategories(mangaId, inCat ? [] : [cat.id], inCat ? [cat.id] : [])
      if (!inCat && !manga?.inLibrary) {
        await updateManga(mangaId, { inLibrary: true }).catch(console.error)
        if (manga) manga = { ...manga, inLibrary: true }
      }
      mangaCategories = inCat ? mangaCategories.filter(c => c.id !== cat.id) : [...mangaCategories, cat]
    } catch (e) { console.error(e) }
  }

  async function createNewCategory(name: string) {
    if (!name) return
    try {
      const cat = await createCategoryReq(name)
      await updateMangaCategories(mangaId, [cat.id], [])
      if (!manga?.inLibrary) {
        await updateManga(mangaId, { inLibrary: true }).catch(console.error)
        if (manga) manga = { ...manga, inLibrary: true }
      }
      allCategories   = [...allCategories, cat]
      mangaCategories = [...mangaCategories, cat]
    } catch (e) { console.error(e) }
  }
</script>

<div class="root" role="presentation" oncontextmenu={(e) => e.preventDefault()}>

  <SeriesHeader
    {manga}
    {loadingManga}
    {totalCount}
    {readCount}
    {progressPct}
    {downloadedCount}
    {deletingAll}
    {continueChapter}
    {hasAnyAutomation}
    {markersOpen}
    {linkedIds}
    {allMangaForLink}
    {loadingLinkList}
    {mangaCategories}
    {togglingLibrary}
    onRead={handleContinue}
    onToggleLibrary={toggleLibrary}
    onDeleteAll={deleteAllDownloads}
    onMigrateOpen={() => migrateOpen = true}
    onTrackingOpen={() => trackingOpen = true}
    onAutoOpen={() => autoOpen = true}
    onMarkersToggle={() => markersOpen = !markersOpen}
    onLinkPickerOpen={openLinkPicker}
    onCoverPickerOpen={openCoverPicker}
    onGenreClick={(genre) => goto(`/browse?genre=${encodeURIComponent(genre)}`)}
  />

  <div class="list-wrap">
    <SeriesActions
      {chapters}
      {sortedChapters}
      {sortMode}
      {sortDir}
      {viewMode}
      {chapterPage}
      {totalPages}
      {downloadedCount}
      {totalCount}
      {deletingAll}
      {hasSelection}
      selectedCount={selectedIds.size}
      {continueChapter}
      {availableScanlators}
      {scanlatorFilter}
      {scanlatorBlacklist}
      {scanlatorForce}
      {allCategories}
      {mangaCategories}
      {catsLoading}
      {refreshing}
      onViewModeToggle={() => viewMode = viewMode === 'list' ? 'grid' : 'list'}
      onPageChange={(p) => chapterPage = p}
      onDownloadSelected={downloadSelected}
      onDeleteSelected={deleteSelected}
      onMarkSelectedRead={markSelectedRead}
      onClearSelection={clearSelection}
      onEnqueueNext={enqueueNext}
      onEnqueueMultiple={enqueueMultiple}
      onDeleteAll={deleteAllDownloads}
      onRefresh={refreshChapters}
      onToggleCategory={toggleCategory}
      onCreateCategory={createNewCategory}
      onSetScanlatorFilter={(v) => set('scanlatorFilter', v)}
      onSetScanlatorBlacklist={(v) => set('scanlatorBlacklist', v)}
      onSetScanlatorForce={(v) => set('scanlatorForce', v)}
      onOpenFolder={() => manga && openMangaFolder(manga)}
    />

    <ChapterList
      {pageChapters}
      {sortedChapters}
      {viewMode}
      {loadingChapters}
      {selectedIds}
      {enqueueing}
      {chapterPage}
      {totalPages}
      bind:scrollEl={chapterListEl}
      onOpen={openReaderWithAhead}
      onToggleSelect={toggleSelect}
      onEnqueue={enqueue}
      onDeleteDownload={deleteDownloaded}
      onPageChange={(p) => chapterPage = p}
      {buildCtxItems}
    />
  </div>
</div>

{#if markersOpen && manga}
  <div class="panel-overlay" role="presentation" onclick={() => markersOpen = false}>
    <div class="panel-drawer" role="presentation" onclick={(e) => e.stopPropagation()}>
      <MarkersPanel mangaId={manga.id} {chapters} onClose={() => markersOpen = false} />
    </div>
  </div>
{/if}

{#if autoOpen && manga}
  <AutomationPanel mangaId={manga.id} {manga} onClose={() => autoOpen = false} />
{/if}

{#if trackingOpen && manga}
  <div class="modal-overlay" role="presentation" onclick={() => trackingOpen = false}>
    <div class="modal-dialog" role="presentation" onclick={(e) => e.stopPropagation()}>
      <TrackingPanel mangaId={manga.id} mangaTitle={manga.title} onClose={() => trackingOpen = false} />
    </div>
  </div>
{/if}

{#if linkPickerOpen && manga}
  <div class="modal-overlay" role="presentation" onclick={() => linkPickerOpen = false}>
    <div class="modal-dialog" role="presentation" onclick={(e) => e.stopPropagation()}>
      <SeriesLinkPanel {manga} allManga={allMangaForLink} onClose={() => linkPickerOpen = false} />
    </div>
  </div>
{/if}

{#if coverPickerOpen && manga}
  <div class="modal-overlay" role="presentation" onclick={() => coverPickerOpen = false}>
    <div class="modal-dialog" role="presentation" onclick={(e) => e.stopPropagation()}>
      <CoverPickerPanel {manga} allManga={allMangaForLink} onClose={() => coverPickerOpen = false} />
    </div>
  </div>
{/if}

{#if migrateOpen && manga}
  <MigrateModal
    {manga}
    currentChapters={chapters}
    onClose={() => migrateOpen = false}
    onMigrated={(newManga) => { goto(`/series/${newManga.id}`); migrateOpen = false }}
  />
{/if}

<style>
  .root { display: flex; height: 100%; overflow: hidden; animation: fadeIn 0.14s ease both; }
  .list-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .panel-overlay { position: fixed; inset: 0; z-index: var(--z-settings); display: flex; align-items: stretch; justify-content: flex-start; animation: fadeIn 0.12s ease both; }
  .panel-drawer { width: 280px; max-width: 90vw; background: var(--bg-surface); border-right: 1px solid var(--border-base); box-shadow: 4px 0 24px rgba(0,0,0,0.4); display: flex; flex-direction: column; animation: drawerIn 0.18s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes fadeIn   { from { opacity: 0 }                               to { opacity: 1 } }
  @keyframes drawerIn { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: translateX(0) } }
  .modal-overlay { position: fixed; inset: 0; z-index: var(--z-settings); display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); animation: fadeIn 0.12s ease both; }
  .modal-dialog { width: 480px; max-width: 90vw; max-height: 80vh; background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: var(--radius-lg); box-shadow: 0 8px 48px rgba(0,0,0,0.5); display: flex; flex-direction: column; animation: modalIn 0.18s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
</style>