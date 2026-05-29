import { getAdapter } from '$lib/request-manager'

const POLL_INTERVAL_MS = 2000
const POLL_INITIAL_MS  = 500

export interface UpdateProgress {
  finished:          number
  total:             number
  skippedManga:      number
  skippedCategories: number
}

export interface UpdateResult {
  entries:      UpdateEntry[]
  totalUpdated: number
  newChapters:  number
}

export interface UpdateEntry {
  mangaId:      number
  mangaTitle:   string
  thumbnailUrl: string
  newChapters:  number
  checkedAt:    number
}

export interface LibraryUpdaterCallbacks {
  onProgress: (p: UpdateProgress) => void
  onDone:     (r: UpdateResult)   => void
  onError:    (e?: unknown)       => void
}

function buildEntries(
  mangaUpdates: { status: string; manga: { id: number; title: string; thumbnailUrl: string; unreadCount: number } }[]
): UpdateEntry[] {
  const byManga = new Map<number, UpdateEntry>()
  for (const u of mangaUpdates) {
    if (u.status !== 'UPDATED') continue
    const existing = byManga.get(u.manga.id)
    if (existing) {
      existing.newChapters++
    } else {
      byManga.set(u.manga.id, {
        mangaId:      u.manga.id,
        mangaTitle:   u.manga.title,
        thumbnailUrl: u.manga.thumbnailUrl,
        newChapters:  1,
        checkedAt:    Date.now(),
      })
    }
  }
  return [...byManga.values()]
}

export function startLibraryUpdate(callbacks: LibraryUpdaterCallbacks): () => void {
  let timer:    ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  function cancel() {
    cancelled = true
    if (timer) { clearTimeout(timer); timer = null }
  }

  async function run() {
    let jobsStarted = false

    try {
      const status = await getAdapter().checkForUpdates()
      if (cancelled) return

      const { jobsInfo } = status
      jobsStarted = jobsInfo.totalJobs > 0

      callbacks.onProgress({
        finished:          jobsInfo.finishedJobs,
        total:             jobsInfo.totalJobs,
        skippedManga:      jobsInfo.skippedMangasCount,
        skippedCategories: jobsInfo.skippedCategoriesCount,
      })

      if (!jobsStarted || !jobsInfo.isRunning) {
        callbacks.onDone({ entries: [], totalUpdated: 0, newChapters: 0 })
        return
      }
    } catch (e) {
      console.error('[libraryUpdater] failed to start update', e)
      if (!cancelled) callbacks.onError(e)
      return
    }

    function poll() {
      getAdapter().getLibraryUpdateStatus()
        .then(d => {
          if (cancelled) return
          const { jobsInfo, mangaUpdates } = d

          if (jobsInfo.totalJobs > 0) jobsStarted = true
          callbacks.onProgress({
            finished:          jobsInfo.finishedJobs,
            total:             jobsInfo.totalJobs,
            skippedManga:      jobsInfo.skippedMangasCount,
            skippedCategories: jobsInfo.skippedCategoriesCount,
          })

          if (!jobsInfo.isRunning && jobsStarted) {
            const entries     = buildEntries(mangaUpdates)
            const newChapters = entries.reduce((s, e) => s + e.newChapters, 0)
            callbacks.onDone({ entries, totalUpdated: entries.length, newChapters })
            return
          }

          timer = setTimeout(poll, POLL_INTERVAL_MS)
        })
        .catch(e => {
          console.error('[libraryUpdater] poll error', e)
          if (!cancelled) callbacks.onError(e)
        })
    }

    timer = setTimeout(poll, POLL_INITIAL_MS)
  }

  run()
  return cancel
}