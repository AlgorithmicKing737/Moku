import {isSupported, readFile, writeFile} from '$lib/platform-service';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const STORAGE_PREFIX = 'moku:';

function localStorageKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
}

function fileName(key: string): string {
    return `moku.${key}.json`;
}

function canUseLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function canUseFilesystem(): boolean {
    try {
        return isSupported('filesystem');
    } catch {
        return false;
    }
}

export async function loadPersistentState<T>(key: string): Promise<T | null> {
    if (canUseFilesystem()) {
        try {
            const data = await readFile(fileName(key));
            if (data.length > 0) {
                return JSON.parse(decoder.decode(data)) as T;
            }
        } catch {
            // Fall back to localStorage when the file does not exist or the adapter cannot read it yet.
        }
    }

    if (!canUseLocalStorage()) return null;

    try {
        const raw = localStorage.getItem(localStorageKey(key));
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
}

export async function savePersistentState<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);

    if (canUseLocalStorage()) {
        localStorage.setItem(localStorageKey(key), json);
    }

    if (!canUseFilesystem()) return;

    try {
        await writeFile(fileName(key), encoder.encode(json));
    } catch {
        // LocalStorage remains the fallback when a platform adapter cannot persist to files.
    }
}

export async function clearPersistentState(key: string): Promise<void> {
    if (canUseLocalStorage()) {
        localStorage.removeItem(localStorageKey(key));
    }

    if (!canUseFilesystem()) return;

    try {
        await writeFile(fileName(key), encoder.encode('null'));
    } catch {
        // Ignore native persistence failures during cleanup.
    }
}