<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { getAdapter }         from '$lib/request-manager'
  import { cache, CACHE_KEYS, CACHE_GROUPS } from '$lib/core/cache/queryCache'
  import { homeState, clearHistory } from '$lib/state/home.svelte'
  import { historyState }            from '$lib/state/history.svelte'
  import { setActiveManga, openReaderForChapter, setPreviewManga } from '$lib/state/series.svelte'
  import { addToast }           from '$lib/state/notifications.svelte'
  import { downloadStore }      from '$lib/state/downloads.svelte'
  import { groupByDay }                                from './lib/recentHistory'
  import { fetchedAtMs, parseServerTimestamp, groupUpdatesByDay } from './lib/recentUpdates'
  import RecentToolbar  from './RecentToolbar.svelte'
  import UpdatesTab     from './UpdatesTab.svelte'
  import HistoryTab     from './HistoryTab.svelte'
  import type { Manga, Chapter } from '$lib/types'
  import type { RecentUpdate, UpdateGroup } from './lib/recentUpdates'
  import type { HistoryGroup }              from './lib/recentHistory'

  const RECENT_UPDATES_TTL_MS = 60 * 1_000
  const UPDATE_STATUS_POLL_MS = 2_000

  let tab:                 'updates' | 'history' = $state('updates')
  let historySearch:       string  = $state('')
  let updatesSearch:       string  = $state('')
  let historyConfirmClear: boolean = $state(false)

  let updates:             RecentUpdate[] = $state([])
  let updatesLoading:      boolean        = $state(true)
  let updatesError:        string | null  = $state(null)
  let openingId:           number | null  = $state(null)
  let enqueueing:          Set<number>    = $state(new Set())
  let updaterRunning:      boolean        = $state(false)
  let lastUpdatedTs:       number | null  = $state(null)
  let updaterFinishedJobs: number | null  = $state(null)
  let updaterTotalJobs:    number | null  = $state(null)

  let libraryManga: Manga[] = $state([])

  let ctrl:            AbortController | null              = null
  let statusPollTimer: ReturnType<typeof setTimeout> | null = null

  onMount(() => {
    void loadUpdates()
    cache.get(CACHE_KEYS.LIBRARY, () =>
      getAdapter().getMangaList({ inLibrary: true }).then(r => r.items)
    ).then(m => { libraryManga = m }).catch(() => {})
  })

  onDestroy(() => {
    ctrl?.abort()
    stopStatusPolling()
  })

  const updateGroups = $derived(groupUpdatesByDay(updates))

  const lastUpdatedLabel = $derived(
    lastUpdatedTs
      ? new Date(lastUpdatedTs).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : null
  )

  const updaterProgressLabel = $derived(
    typeof updaterFinishedJobs === 'number' &&
    typeof updaterTotalJobs   === 'number' &&
    updaterTotalJobs > 0
      ? `${updaterFinishedJobs}/${updaterTotalJobs}`
      : null
  )

  const filteredHistory = $derived(historySearch.trim()
    ? historyState.sessions.filter(s =>
        s.mangaTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.endChapterName.toLowerCase().includes(historySearch.toLowerCase())
      )
    : historyState.sessions)

  const historyGroups = $derived(groupByDay(filteredHistory))

  function applyUpdateStatus(statusRes: { isRunning?: boolean; finishedJobs?: number; totalJobs?: number; lastUpdated?: unknown } | null) {
    if (!statusRes) return
    updaterRunning      = statusRes.isRunning    ?? false
    updaterFinishedJobs = statusRes.finishedJobs ?? null
    updaterTotalJobs    = statusRes.totalJobs    ?? null
    lastUpdatedTs       = parseServerTimestamp(statusRes.lastUpdated ?? null)
  }

  function stopStatusPolling() {
    if (!statusPollTimer) return
    clearTimeout(statusPollTimer)
    statusPollTimer = null
  }

  function scheduleStatusPoll() {
    if (statusPollTimer) return
    const tick = async () => {
      statusPollTimer = null
      try {
        const statusRes  = await getAdapter().getLibraryUpdateStatus()
        const wasRunning = updaterRunning
        applyUpdateStatus(statusRes)
        if (updaterRunning)      statusPollTimer = setTimeout(tick, UPDATE_STATUS_POLL_MS)
        else if (wasRunning) void loadUpdates(true)
      } catch {
        if (updaterRunning) statusPollTimer = setTimeout(tick, UPDATE_STATUS_POLL_MS)
      }
    }
    statusPollTimer = setTimeout(tick, UPDATE_STATUS_POLL_MS)
  }

  async function loadUpdates(force = false) {
    ctrl?.abort()
    const nextCtrl = new AbortController()
    ctrl           = nextCtrl
    updatesLoading = true
    updatesError   = null

    try {
      const key = CACHE_KEYS.RECENT_UPDATES
      if (force) cache.clear(key)

      const [updatesRes, statusRes] = await Promise.all([
        cache.get<Chapter[]>(
          key,
          () => getAdapter().getRecentlyUpdated(),
          RECENT_UPDATES_TTL_MS,
          CACHE_GROUPS.LIBRARY,
        ),
        getAdapter().getLibraryUpdateStatus().catch(() => null),
      ])

      applyUpdateStatus(statusRes)
      if (updaterRunning) scheduleStatusPoll()
      else stopStatusPolling()

      if (nextCtrl.signal.aborted) return

      updates = (updatesRes ?? [])
        .map(item => ({ ...item, isRead: item.read }))
        .sort((a, b) => fetchedAtMs(b) - fetchedAtMs(a))
    } catch (e: any) {
      if (nextCtrl.signal.aborted) return
      updatesError        = e?.message ?? 'Failed to load updates'
      updates             = []
      updaterRunning      = false
      lastUpdatedTs       = null
      updaterFinishedJobs = null
      updaterTotalJobs    = null
      stopStatusPolling()
    } finally {
      if (!nextCtrl.signal.aborted) updatesLoading = false
    }
  }

  function mangaStub(item: RecentUpdate): Manga {
    return {
      id:           item.manga?.id ?? item.mangaId,
      title:        item.manga?.title ?? 'Unknown series',
      thumbnailUrl: item.manga?.thumbnailUrl ?? '',
      inLibrary:    item.manga?.inLibrary ?? true,
    } as Manga
  }

  async function openUpdate(item: RecentUpdate) {
    if (openingId !== null) return
    openingId = item.id
    const manga = mangaStub(item)
    try {
      const chapters = await getAdapter().getChapters(String(item.mangaId))
      const target   = chapters.find(ch => ch.id === item.id)
      if (target) openReaderForChapter(target, manga)
      else        setPreviewManga(manga)
    } catch {
      setPreviewManga(manga)
      addToast({ kind: 'error', title: "Couldn't open chapter", body: 'Opened the series instead.' })
    } finally {
      openingId = null
    }
  }

  function thumbFor(mangaId: number, fallback: string): string {
    return libraryManga.find(m => m.id === mangaId)?.thumbnailUrl ?? fallback ?? ''
  }

  function handleHistoryClear() {
    if (!historyConfirmClear) {
      historyConfirmClear = true
      setTimeout(() => { historyConfirmClear = false }, 3_000)
      return
    }
    clearHistory()
    historyConfirmClear = false
  }

  async function enqueueUpdate(item: RecentUpdate) {
    if (enqueueing.has(item.id)) return
    enqueueing = new Set(enqueueing).add(item.id)
    try {
      const allowed = await downloadStore.enqueue(item.id)
      if (allowed) addToast({ kind: 'download', title: 'Download queued', body: item.name ?? 'Chapter' })
    } catch {
      addToast({ kind: 'error', title: 'Download failed', body: 'Could not queue chapter.' })
    } finally {
      enqueueing.delete(item.id)
      enqueueing = new Set(enqueueing)
    }
  }

  async function deleteDownloaded(item: RecentUpdate) {
    try {
      await getAdapter().deleteDownloadedChapters([String(item.id)])
      updates = updates.map(u => u.id === item.id ? { ...u, isDownloaded: false } : u)
    } catch {
      addToast({ kind: 'error', title: 'Delete failed', body: 'Could not delete download.' })
    }
  }

  async function toggleLibraryUpdate() {
    try {
      if (updaterRunning) {
        await getAdapter().stopLibraryUpdate()
        updaterRunning = false
        stopStatusPolling()
      } else {
        await getAdapter().startLibraryUpdate()
        updaterRunning = true
        scheduleStatusPoll()
      }
    } catch (e: any) {
      addToast({ kind: 'error', title: 'Update error', body: e?.message ?? 'Failed' })
    }
  }
</script>

<div class="root anim-fade-in">
  <RecentToolbar
    {tab}
    {historySearch}
    {updatesSearch}
    {historyConfirmClear}
    hasHistory={historyState.sessions.length > 0}
    {updatesLoading}
    {updaterRunning}
    onTabChange={(t) => tab = t}
    onHistorySearchChange={(v) => historySearch = v}
    onUpdatesSearchChange={(v) => updatesSearch = v}
    onHistoryClear={handleHistoryClear}
    onRefreshUpdates={() => loadUpdates(true)}
    onToggleUpdate={toggleLibraryUpdate}
  />

  <div class="content">
    {#if tab === 'updates'}
      <UpdatesTab
        loading={updatesLoading}
        error={updatesError}
        groups={updateGroups}
        {updatesSearch}
        totalCount={updates.filter(u => !u.isRead).length}
        {openingId}
        {enqueueing}
        {updaterRunning}
        {lastUpdatedLabel}
        {updaterProgressLabel}
        onOpenUpdate={openUpdate}
        onOpenSeries={(item) => setActiveManga(mangaStub(item))}
        onEnqueue={enqueueUpdate}
        onDeleteDownload={deleteDownloaded}
      />
    {:else}
      <HistoryTab
        groups={historyGroups}
        hasHistory={historyState.sessions.length > 0}
        {historySearch}
        stats={historyState.stats}
        {thumbFor}
        onOpenSeries={(session) => setPreviewManga({
          id:           session.mangaId,
          title:        session.mangaTitle,
          thumbnailUrl: thumbFor(session.mangaId, session.thumbnailUrl),
        } as any)}
      />
    {/if}
  </div>
</div>

<style>
  .root    { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .content { flex: 1; min-height: 0; overflow: hidden; }
</style>