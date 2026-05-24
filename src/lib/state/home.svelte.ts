export interface HistoryEntry {
  mangaId:       number
  mangaTitle:    string
  thumbnailUrl:  string
  chapterId:     number
  chapterName:   string
  chapterNumber: number
  pageNumber:    number
  readAt:        number
}

export interface ReadingStats {
  currentStreakDays: number
  totalChaptersRead: number
  totalMinutesRead:  number
  totalMangaRead:    number
  longestStreakDays:  number
}

export const homeState = $state({
  history:         [] as HistoryEntry[],
  dailyReadCounts: {} as Record<string, number>,
  stats: {
    currentStreakDays: 0,
    totalChaptersRead: 0,
    totalMinutesRead:  0,
    totalMangaRead:    0,
    longestStreakDays:  0,
  } as ReadingStats,
  heroSlots: [null, null, null, null] as [number | null, number | null, number | null, number | null],
})

export function setHeroSlot(i: 1 | 2 | 3, mangaId: number | null) {
  homeState.heroSlots[i] = mangaId
}

export function recordRead(entry: HistoryEntry) {
  homeState.history = [entry, ...homeState.history.filter(e => e.chapterId !== entry.chapterId)]
  const dateStr = new Date(entry.readAt).toISOString().slice(0, 10)
  homeState.dailyReadCounts[dateStr] = (homeState.dailyReadCounts[dateStr] ?? 0) + 1
  homeState.stats.totalChaptersRead++
}