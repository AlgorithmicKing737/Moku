import { saveLibrary }        from '$lib/core/persistence/persist'
import type { ReadSession, ReadingStats } from '$lib/types/history'
import { DEFAULT_READING_STATS }          from '$lib/types/history'

const MAX_SESSIONS    = 1000
const SESSION_GAP_MS  = 60 * 60 * 1_000

export interface ActiveSession {
  id:               string
  mangaId:          number
  mangaTitle:       string
  thumbnailUrl:     string
  startChapterId:   number
  startChapterName: string
  endChapterId:     number
  endChapterName:   string
  startPage:        number
  endPage:          number
  startedAt:        number
  lastTickAt:       number
  seenChapterIds:   Set<number>
}

function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function computeStats(sessions: ReadSession[]): ReadingStats {
  if (!sessions.length) return { ...DEFAULT_READING_STATS }

  const chapterIds = new Set<number>()
  const mangaIds   = new Set<number>()
  const days       = new Set<string>()
  let totalMs      = 0
  let firstReadAt  = Infinity
  let lastReadAt   = 0

  for (const s of sessions) {
    chapterIds.add(s.endChapterId)
    if (s.chaptersSpanned > 1) chapterIds.add(s.startChapterId)
    mangaIds.add(s.mangaId)
    totalMs    += Math.min(s.durationMs, SESSION_GAP_MS)
    firstReadAt = Math.min(firstReadAt, s.startedAt)
    lastReadAt  = Math.max(lastReadAt,  s.endedAt)
    days.add(dateKey(s.endedAt))
  }

  const sortedDays = Array.from(days).sort()
  let currentStreak = 0
  let longestStreak = 0
  let streak        = 0
  const todayKey    = dateKey(Date.now())
  const yestKey     = dateKey(Date.now() - 86_400_000)
  const lastDay     = sortedDays[sortedDays.length - 1]
  const streakActive = lastDay === todayKey || lastDay === yestKey

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      streak = 1
    } else {
      const prev = new Date(sortedDays[i - 1]).getTime()
      const curr = new Date(sortedDays[i]).getTime()
      streak = curr - prev <= 86_400_000 * 1.5 ? streak + 1 : 1
    }
    longestStreak = Math.max(longestStreak, streak)
  }
  currentStreak = streakActive ? streak : 0

  return {
    totalChaptersRead: chapterIds.size,
    totalMangaRead:    mangaIds.size,
    totalMinutesRead:  Math.round(totalMs / 60_000),
    firstReadAt:       firstReadAt === Infinity ? 0 : firstReadAt,
    lastReadAt,
    currentStreakDays: currentStreak,
    longestStreakDays: longestStreak,
    lastStreakDate:    lastDay ?? '',
  }
}

class HistoryStore {
  sessions         = $state<ReadSession[]>([])
  dailyReadCounts  = $state<Record<string, number>>({})
  stats            = $state<ReadingStats>({ ...DEFAULT_READING_STATS })
  active           = $state<ActiveSession | null>(null)

  load(sessions: ReadSession[], dailyReadCounts: Record<string, number>) {
    this.sessions        = sessions
    this.dailyReadCounts = dailyReadCounts
    this.stats           = computeStats(sessions)
  }

  openSession(
    mangaId:      number,
    mangaTitle:   string,
    thumbnailUrl: string,
    chapterId:    number,
    chapterName:  string,
    page:         number,
  ) {
    if (this.active) this._commit(Date.now())

    this.active = {
      id:               crypto.randomUUID(),
      mangaId,
      mangaTitle,
      thumbnailUrl,
      startChapterId:   chapterId,
      startChapterName: chapterName,
      endChapterId:     chapterId,
      endChapterName:   chapterName,
      startPage:        page,
      endPage:          page,
      startedAt:        Date.now(),
      lastTickAt:       Date.now(),
      seenChapterIds:   new Set([chapterId]),
    }
  }

  tickSession(chapterId: number, chapterName: string, page: number) {
    if (!this.active) return
    const now = Date.now()

    if (now - this.active.lastTickAt > SESSION_GAP_MS) {
      this._commit(this.active.lastTickAt)
      this.openSession(
        this.active.mangaId,
        this.active.mangaTitle,
        this.active.thumbnailUrl,
        chapterId,
        chapterName,
        page,
      )
      return
    }

    this.active.lastTickAt    = now
    this.active.endPage       = page
    this.active.endChapterId  = chapterId
    this.active.endChapterName = chapterName
    this.active.seenChapterIds.add(chapterId)
  }

  closeSession() {
    if (!this.active) return
    this._commit(Date.now())
    this.active = null
  }

  clearHistory() {
    this.sessions        = []
    this.dailyReadCounts = {}
    this.stats           = { ...DEFAULT_READING_STATS }
    void this._persist()
  }

  private _commit(endedAt: number) {
    const a = this.active
    if (!a) return

    const durationMs = Math.min(endedAt - a.startedAt, SESSION_GAP_MS)
    if (durationMs < 1_000) return

    const session: ReadSession = {
      id:               a.id,
      mangaId:          a.mangaId,
      mangaTitle:       a.mangaTitle,
      thumbnailUrl:     a.thumbnailUrl,
      startChapterId:   a.startChapterId,
      startChapterName: a.startChapterName,
      endChapterId:     a.endChapterId,
      endChapterName:   a.endChapterName,
      startPage:        a.startPage,
      endPage:          a.endPage,
      startedAt:        a.startedAt,
      endedAt,
      durationMs,
      chaptersSpanned:  a.seenChapterIds.size,
    }

    const day = dateKey(endedAt)
    this.dailyReadCounts[day] = (this.dailyReadCounts[day] ?? 0) + 1

    this.sessions = [session, ...this.sessions].slice(0, MAX_SESSIONS)
    this.stats    = computeStats(this.sessions)

    void this._persist()
  }

  private async _persist() {
    const bookmarks = (await import('$lib/state/reader.svelte')).readerState.bookmarks
    const markers   = (await import('$lib/state/reader.svelte')).readerState.markers
    await saveLibrary({
      sessions:        this.sessions,
      bookmarks,
      markers,
      dailyReadCounts: this.dailyReadCounts,
    })
  }
}

export const historyState = new HistoryStore()