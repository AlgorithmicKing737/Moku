import {untrack} from 'svelte';
import {
    DEFAULT_READING_STATS,
    type BookmarkEntry,
    type HistoryEntry,
    type MarkerEntry,
    type ReadLogEntry,
    type ReadingStats,
} from '$lib/types/history';
import {loadPersistentState, savePersistentState} from '$lib/core/persistence/persist';

const HISTORY_STORAGE_KEY = 'history';
const AVG_MIN_PER_CHAPTER = 5;

interface PersistedHistory {
    history: HistoryEntry[];
    bookmarks: BookmarkEntry[];
    markers: MarkerEntry[];
    readLog: ReadLogEntry[];
    readingStats: ReadingStats;
    dailyReadCounts: Record<string, number>;
}

function localDateString(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function emptyHistoryState(): PersistedHistory {
    return {
        history: [],
        bookmarks: [],
        markers: [],
        readLog: [],
        readingStats: {...DEFAULT_READING_STATS},
        dailyReadCounts: {},
    };
}

export const historyState = $state(emptyHistoryState());

export const historyStatus = $state({
    ready: false,
    loading: false,
    error: null as string | null,
});

let initialized = false;
let persistQueued = false;

function queueHistoryPersist() {
    if (!historyStatus.ready || historyStatus.loading || persistQueued) return;

    persistQueued = true;

    queueMicrotask(() => {
        persistQueued = false;

        if (!historyStatus.ready || historyStatus.loading) return;

        const snapshot = JSON.stringify(historyState);
        void savePersistentState(HISTORY_STORAGE_KEY, JSON.parse(snapshot) as PersistedHistory);
    });
}

export async function initHistoryState() {
    if (initialized || historyStatus.loading) return;

    historyStatus.loading = true;

    try {
        const persisted = await loadPersistentState<PersistedHistory>(HISTORY_STORAGE_KEY);

        untrack(() => {
            Object.assign(historyState, {
                ...emptyHistoryState(),
                ...persisted,
                readingStats: persisted?.readingStats ?? {...DEFAULT_READING_STATS},
                dailyReadCounts: persisted?.dailyReadCounts ?? {},
            });
        });

        initialized = true;
        historyStatus.ready = true;
        historyStatus.error = null;
    } catch (error) {
        historyStatus.ready = true;
        historyStatus.error = String(error);
    } finally {
        historyStatus.loading = false;
    }
}

export function addHistory(entry: HistoryEntry, completed = false, minutes = AVG_MIN_PER_CHAPTER) {
    historyState.history = [entry, ...historyState.history.filter(item => item.chapterId !== entry.chapterId)].slice(0, 500);

    if (!completed || historyState.readLog.some(item => item.chapterId === entry.chapterId)) {
        queueHistoryPersist();
        return;
    }

    historyState.readLog = [
        ...historyState.readLog,
        {mangaId: entry.mangaId, chapterId: entry.chapterId, readAt: entry.readAt, minutes},
    ];

    const totalMinutes = historyState.readLog.reduce((sum, item) => sum + item.minutes, 0);
    const uniqueChapters = new Set(historyState.readLog.map(item => item.chapterId));
    const uniqueManga = new Set(historyState.readLog.map(item => item.mangaId));
    const today = localDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = localDateString(yesterday);
    const previousStreakDate = historyState.readingStats.lastStreakDate;
    const streak = previousStreakDate === today
        ? historyState.readingStats.currentStreakDays
        : previousStreakDate === yesterdayKey
            ? historyState.readingStats.currentStreakDays + 1
            : 1;

    historyState.readingStats = {
        totalChaptersRead: uniqueChapters.size,
        totalMangaRead: uniqueManga.size,
        totalMinutesRead: totalMinutes,
        firstReadAt: historyState.readingStats.firstReadAt || entry.readAt,
        lastReadAt: entry.readAt,
        currentStreakDays: streak,
        longestStreakDays: Math.max(historyState.readingStats.longestStreakDays, streak),
        lastStreakDate: today,
    };

    historyState.dailyReadCounts = {
        ...historyState.dailyReadCounts,
        [today]: (historyState.dailyReadCounts[today] ?? 0) + 1,
    };

    queueHistoryPersist();
}

export function addBookmark(entry: Omit<BookmarkEntry, 'savedAt'>, label?: string) {
    historyState.bookmarks = [
        {...entry, savedAt: Date.now(), label},
        ...historyState.bookmarks.filter(item => item.chapterId !== entry.chapterId),
    ].slice(0, 200);

    queueHistoryPersist();
}

export function removeBookmark(chapterId: number) {
    historyState.bookmarks = historyState.bookmarks.filter(item => item.chapterId !== chapterId);
    queueHistoryPersist();
}

export function getBookmark(chapterId: number): BookmarkEntry | undefined {
    return historyState.bookmarks.find(item => item.chapterId === chapterId);
}

export function clearBookmarks() {
    historyState.bookmarks = [];
    queueHistoryPersist();
}

export function clearHistory() {
    historyState.history = [];
    historyState.readLog = [];
    historyState.dailyReadCounts = {};
    historyState.readingStats = {...DEFAULT_READING_STATS};
    queueHistoryPersist();
}