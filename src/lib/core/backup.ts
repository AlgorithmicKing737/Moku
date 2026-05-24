import type {Settings} from '$lib/types/settings';

export interface HistoryBackupPayload {
    history: unknown[];
    bookmarks: unknown[];
    markers: unknown[];
    readLog: unknown[];
    readingStats: Record<string, unknown>;
    dailyReadCounts: Record<string, number>;
}

export interface AppDataBackup {
    version: 1;
    exportedAt: string;
    settings: Settings;
    history: HistoryBackupPayload;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function buildAppDataBackup(settings: Settings, history: HistoryBackupPayload): AppDataBackup {
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        history,
    };
}

export function parseAppDataBackup(raw: string): AppDataBackup {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) throw new Error('Backup file is not a valid object');
    if (parsed.version !== 1) throw new Error('Unsupported backup format version');
    if (!isObject(parsed.settings)) throw new Error('Backup is missing settings data');
    if (!isObject(parsed.history)) throw new Error('Backup is missing history data');

    const history = parsed.history;

    return {
        version: 1,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
        settings: parsed.settings as unknown as Settings,
        history: {
            history: Array.isArray(history.history) ? history.history : [],
            bookmarks: Array.isArray(history.bookmarks) ? history.bookmarks : [],
            markers: Array.isArray(history.markers) ? history.markers : [],
            readLog: Array.isArray(history.readLog) ? history.readLog : [],
            readingStats: isObject(history.readingStats) ? history.readingStats : {},
            dailyReadCounts: isObject(history.dailyReadCounts) ? (history.dailyReadCounts as Record<string, number>) : {},
        },
    };
}

export function downloadAppDataBackup(backup: AppDataBackup, filename = 'moku-app-backup.json'): void {
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickAppDataBackupFile(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';

        input.addEventListener('change', () => {
            const file = input.files?.[0] ?? null;
            resolve(file);
        }, {once: true});

        input.click();
    });
}
