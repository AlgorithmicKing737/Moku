<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { loadLibrary } from '$lib/request-manager/manga'
  import { getAdapter } from '$lib/request-manager'
  import { libraryState } from '$lib/state/library.svelte'
  import { homeState, setHeroSlot } from '$lib/state/home.svelte'
  import { openReaderForChapter }   from '$lib/state/series.svelte'
  import { historyState } from '$lib/state/history.svelte'
  import type { ReadSession } from '$lib/types/history'
  import HeroStage       from '$lib/components/home/HeroStage.svelte'
  import HeroSlotPicker  from '$lib/components/home/HeroSlotPicker.svelte'
  import ActivityFeed    from '$lib/components/home/ActivityFeed.svelte'
  import ActivityHeatmap from '$lib/components/home/ActivityHeatmap.svelte'
  import RecsRow         from '$lib/components/home/RecsRow.svelte'
  import StatsGrid       from '$lib/components/home/StatsGrid.svelte'
  import type { Manga, Chapter } from '$lib/types'

  const TOTAL_SLOTS = 4

  interface HeroSlot {
    kind: 'continue' | 'pinned' | 'empty'
    entry?: ReadSession
    manga?: Manga
    slotIndex: number
  }

  onMount(() => { loadLibrary() })

  const manga = $derived(libraryState.items)

  const continueReading = $derived((() => {
    const seen = new Set<number>()
    const out: ReadSession[] = []
    for (const e of historyState.sessions) {
      if (seen.has(e.mangaId)) continue
      seen.add(e.mangaId)
      out.push(e)
      if (out.length >= 10) break
    }
    return out
  })())

  const resolvedSlots = $derived((() => {
    const pins  = homeState.heroSlots
    const slots: HeroSlot[] = []
    const first = continueReading[0]
    slots.push(first ? { kind: 'continue', entry: first, slotIndex: 0 } : { kind: 'empty', slotIndex: 0 })
    let hi = 1
    for (let i = 1; i < TOTAL_SLOTS; i++) {
      const pinId = pins[i]
      if (pinId != null) {
        const m = manga.find(m => m.id === pinId)
        if (m) { slots.push({ kind: 'pinned', manga: m, slotIndex: i }); continue }
      }
      const entry = continueReading[hi++]
      slots.push(entry ? { kind: 'continue', entry, slotIndex: i } : { kind: 'empty', slotIndex: i })
    }
    return slots
  })())

  let activeIdx = $state(0)

  const activeSlot   = $derived(resolvedSlots[activeIdx])
  const heroManga    = $derived(
    activeSlot?.kind === 'pinned'   ? activeSlot.manga :
    activeSlot?.kind === 'continue' ? manga.find(m => m.id === activeSlot.entry?.mangaId) : null
  )
  const heroEntry    = $derived(activeSlot?.kind === 'continue' ? activeSlot.entry ?? null : null)
  const heroMangaId  = $derived(heroManga?.id ?? heroEntry?.mangaId ?? null)
  const heroTitle    = $derived(heroManga?.title ?? heroEntry?.mangaTitle ?? '')
  const heroThumbSrc = $derived(
    heroManga?.thumbnailUrl ??
    (activeSlot?.kind === 'continue' ? activeSlot.entry?.thumbnailUrl : undefined) ??
    ''
  )

  let heroThumb = $state('')
  $effect(() => {
    const path = heroThumbSrc
    if (!path) { heroThumb = ''; return }
    heroThumb = path
  })

  const heroNewChapter = $derived(
    heroManga ? (manga.find(m => m.id === heroManga!.id) as any)?.latestUploadedChapter ?? null : null
  )

  let heroChapters:    Chapter[] = $state([])
  let heroAllChapters: Chapter[] = $state([])
  let loadingHeroChapters = $state(false)
  let heroChaptersFor: number | null = null

  $effect(() => {
    const id = heroMangaId
    if (id) untrack(() => loadHeroChapters(id))
  })

  async function loadHeroChapters(mangaId: number) {
    heroChaptersFor     = mangaId
    loadingHeroChapters = true
    heroChapters        = []
    heroAllChapters     = []
    try {
      const chapters = await getAdapter().getChapters(String(mangaId))
      if (heroChaptersFor !== mangaId) return
      const all = [...chapters].sort((a, b) => a.sourceOrder - b.sourceOrder)
      heroAllChapters = all
      const lastReadIdx = heroEntry
        ? all.findLastIndex(c => c.id === heroEntry!.endChapterId)
        : all.findLastIndex(c => c.read)
      const startIdx = Math.max(0, lastReadIdx)
      heroChapters = all.slice(startIdx, startIdx + 5)
    } catch {
      heroChapters    = []
      heroAllChapters = []
    } finally {
      loadingHeroChapters = false
    }
  }

  let resuming = $state(false)

  async function openChapter(chapter: Chapter) {
    if (!heroMangaId) return
    goto(`/reader/${heroMangaId}/${chapter.id}`)
  }

  async function resumeActive() {
    if (!heroEntry && heroManga) { goto(`/series/${heroManga.id}`); return }
    if (!heroEntry) return
    const target = heroAllChapters.find(c => c.id === heroEntry!.endChapterId) ?? heroAllChapters[0]
    if (target) openReaderForChapter(target, heroManga ?? null)
  }

  function cycleNext() { activeIdx = (activeIdx + 1) % TOTAL_SLOTS; heroChapters = []; heroAllChapters = [] }
  function cyclePrev() { activeIdx = (activeIdx - 1 + TOTAL_SLOTS) % TOTAL_SLOTS; heroChapters = []; heroAllChapters = [] }
  function goToSlot(i: number) { if (i !== activeIdx) { activeIdx = i; heroChapters = []; heroAllChapters = [] } }

  let pickerOpen      = $state(false)
  let pickerSlotIndex: 1 | 2 | 3 | null = $state(null)

  function openPicker(i: 1 | 2 | 3) { pickerSlotIndex = i; pickerOpen = true }
  function closePicker() { pickerOpen = false; pickerSlotIndex = null }
  function pinManga(m: Manga) { if (pickerSlotIndex !== null) { setHeroSlot(pickerSlotIndex, m.id); closePicker() } }
  function unpinSlot(i: 1 | 2 | 3) { setHeroSlot(i, null) }

  function resumeEntry(entry: ReadSession) {
    goto(`/reader/${entry.mangaId}/${entry.endChapterId}`)
  }
</script>

<div class="root">
  <div class="hero-shrink-guard">
    <HeroStage
      {resolvedSlots}
      bind:activeIdx
      {heroThumb}
      {heroTitle}
      {heroManga}
      {heroEntry}
      {heroMangaId}
      {heroChapters}
      {heroNewChapter}
      {loadingHeroChapters}
      {resuming}
      onresume={resumeActive}
      onopenchapter={openChapter}
      oncyclenext={cycleNext}
      oncycleprev={cyclePrev}
      ongotoslot={goToSlot}
      onopenpicker={openPicker}
      onunpin={unpinSlot}
      onviewall={() => heroManga && goto(`/series/${heroManga.id}`)}
    />
  </div>

  <div class="scroll-body">
    <div class="mid-row">
      <div class="mid-left">
        <ActivityFeed
          onresume={resumeEntry}
          onviewhistory={() => goto('/recent')}
          onopenlibrary={() => goto('/library')}
        />
      </div>
      <div class="mid-divider"></div>
      <div class="mid-right">
        <RecsRow
          libraryManga={manga}
          history={historyState.sessions}
          onopenrecommended={(m) => goto(`/series/${m.id}`)}
        />
      </div>
    </div>

    <div class="bottom-row">
      <div class="bottom-heatmap">
        <span class="bottom-label">Activity</span>
        <ActivityHeatmap dailyReadCounts={historyState.dailyReadCounts} />
      </div>
      <div class="bottom-divider"></div>
      <div class="bottom-stats">
        <StatsGrid stats={historyState.stats} updateCount={0} />
      </div>
    </div>
  </div>
</div>

{#if pickerOpen && pickerSlotIndex !== null}
  <HeroSlotPicker
    slotIndex={pickerSlotIndex}
    libraryManga={manga}
    loading={libraryState.loading}
    onpin={pinManga}
    onclose={closePicker}
  />
{/if}

<style>
  .root {
    display: flex; flex-direction: column;
    height: 100%; overflow: hidden;
    animation: fadeIn 0.4s ease both;
  }
  .hero-shrink-guard { flex-shrink: 0; }
  .scroll-body {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    min-height: 0; scrollbar-width: none;
  }
  .scroll-body::-webkit-scrollbar { display: none; }

  .mid-row {
    display: grid; grid-template-columns: 1fr 1px 1.4fr;
    border-top: 1px solid var(--border-dim); flex-shrink: 0; min-height: 0;
  }
  .mid-left  { min-width: 0; overflow: hidden; }
  .mid-left :global(.section) { border-top: none; }
  .mid-divider { background: var(--border-dim); align-self: stretch; }
  .mid-right { min-width: 0; overflow: hidden; padding: var(--sp-3) var(--sp-4) var(--sp-4); }

  .bottom-row {
    display: grid; grid-template-columns: 1fr 1px 1fr;
    border-top: 1px solid var(--border-dim); flex-shrink: 0;
  }
  .bottom-divider { background: var(--border-dim); align-self: stretch; }
  .bottom-heatmap {
    display: flex; flex-direction: column; gap: var(--sp-2);
    padding: var(--sp-4) var(--sp-4) var(--sp-5); min-width: 0;
  }
  .bottom-stats { padding: var(--sp-4) var(--sp-4) var(--sp-5); min-width: 0; overflow: hidden; }
  .bottom-label {
    font-family: var(--font-ui); font-size: var(--text-2xs);
    color: var(--text-faint); letter-spacing: var(--tracking-wider); text-transform: uppercase;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
</style>