import {DEFAULT_MANGA_PREFS, type MangaPrefs} from '$lib/types/settings';
import {settingsState} from '$lib/state/settings.svelte';

export function getMangaPref<K extends keyof MangaPrefs>(mangaId: number, key: K): MangaPrefs[K] {
    const prefs = settingsState.mangaPrefs[mangaId] ?? {};
    return (prefs[key] ?? DEFAULT_MANGA_PREFS[key]) as MangaPrefs[K];
}

export function getMangaPrefs(mangaId: number): MangaPrefs {
    return {
        ...DEFAULT_MANGA_PREFS,
        ...(settingsState.mangaPrefs[mangaId] ?? {}),
    };
}

export function setMangaPref<K extends keyof MangaPrefs>(mangaId: number, key: K, value: MangaPrefs[K]) {
    settingsState.mangaPrefs = {
        ...settingsState.mangaPrefs,
        [mangaId]: {
            ...(settingsState.mangaPrefs[mangaId] ?? {}),
            [key]: value,
        },
    };
}

export function replaceMangaPrefs(mangaId: number, prefs: Partial<MangaPrefs>) {
    settingsState.mangaPrefs = {
        ...settingsState.mangaPrefs,
        [mangaId]: {
            ...(settingsState.mangaPrefs[mangaId] ?? {}),
            ...prefs,
        },
    };
}

export function clearMangaPrefs(mangaId: number) {
    const next = {...settingsState.mangaPrefs};
    delete next[mangaId];
    settingsState.mangaPrefs = next;
}