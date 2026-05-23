import {untrack} from 'svelte';
import {DEFAULT_KEYBINDS} from '$lib/core/keybinds/defaultBinds';
import {savePersistentState, loadPersistentState} from '$lib/core/persistence/persist';
import {applyTheme} from '$lib/core/theme';
import {applyZoom} from '$lib/core/ui/zoom';
import {DEFAULT_AUTOMATION_DEFAULTS, DEFAULT_SETTINGS, DEFAULT_MANGA_PREFS, type MangaPrefs, type Settings} from '$lib/types/settings';

const SETTINGS_STORAGE_KEY = 'settings';
const SETTINGS_STORE_VERSION = 1;

interface PersistedSettings {
    settings: Partial<Settings> | null;
    storeVersion: number | null;
}

function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
    return {
        ...DEFAULT_SETTINGS,
        ...saved,
        keybinds: {...DEFAULT_KEYBINDS, ...(saved?.keybinds ?? {})},
        heroSlots: saved?.heroSlots ?? [null, null, null, null],
        mangaLinks: saved?.mangaLinks ?? {},
        mangaPrefs: saved?.mangaPrefs ?? {},
        customThemes: saved?.customThemes ?? [],
        hiddenCategoryIds: saved?.hiddenCategoryIds ?? [],
        nsfwAllowedSourceIds: saved?.nsfwAllowedSourceIds ?? [],
        nsfwBlockedSourceIds: saved?.nsfwBlockedSourceIds ?? [],
        libraryTabSort: saved?.libraryTabSort ?? {},
        libraryTabStatus: saved?.libraryTabStatus ?? {},
        libraryTabFilters: saved?.libraryTabFilters ?? {},
        extraScanDirs: saved?.extraScanDirs ?? [],
        pinnedSourceIds: saved?.pinnedSourceIds ?? [],
        readerPresets: saved?.readerPresets ?? [],
        mangaReaderSettings: saved?.mangaReaderSettings ?? {},
        hiddenLibraryTabs: saved?.hiddenLibraryTabs ?? [],
        libraryPinnedTabOrder: saved?.libraryPinnedTabOrder ?? [],
        automationDefaults: saved?.automationDefaults ?? DEFAULT_AUTOMATION_DEFAULTS,
    };
}

export const settingsState = $state<Settings>(mergeSettings(null));

export const settingsStatus = $state({
    ready: false,
    loading: false,
    error: null as string | null,
});

let initialized = false;
let persistQueued = false;

function persistSettings() {
    const snapshot = JSON.stringify(settingsState);

    void savePersistentState(SETTINGS_STORAGE_KEY, {
        settings: JSON.parse(snapshot) as Settings,
        storeVersion: SETTINGS_STORE_VERSION,
    } satisfies PersistedSettings);
}

function applySettingsVisuals() {
    if (!settingsStatus.ready || typeof document === 'undefined') return;

    applyTheme(settingsState.theme, settingsState.customThemes);
    applyZoom(settingsState.uiZoom);
}

function queueSettingsSync() {
    applySettingsVisuals();

    if (!settingsStatus.ready || settingsStatus.loading || persistQueued) return;

    persistQueued = true;

    queueMicrotask(() => {
        persistQueued = false;

        if (!settingsStatus.ready || settingsStatus.loading) return;

        persistSettings();
    });
}

export async function initSettingsState() {
    if (initialized || settingsStatus.loading) return;

    settingsStatus.loading = true;

    try {
        const persisted = await loadPersistentState<PersistedSettings>(SETTINGS_STORAGE_KEY);

        untrack(() => {
            Object.assign(settingsState, mergeSettings(persisted?.settings));
        });

        initialized = true;
        settingsStatus.ready = true;
        settingsStatus.error = null;
        applySettingsVisuals();
    } catch (error) {
        settingsStatus.ready = true;
        settingsStatus.error = String(error);
    } finally {
        settingsStatus.loading = false;
    }
}

export function updateSettings(patch: Partial<Settings>) {
    Object.assign(settingsState, patch);
    queueSettingsSync();
}

export function resetSettings() {
    Object.assign(settingsState, mergeSettings(null));
    queueSettingsSync();
}

export function getMangaPrefs(mangaId: number): MangaPrefs {
    return {
        ...DEFAULT_MANGA_PREFS,
        ...(settingsState.mangaPrefs[mangaId] ?? {}),
    };
}

export function updateMangaPrefs(mangaId: number, patch: Partial<MangaPrefs>) {
    settingsState.mangaPrefs = {
        ...settingsState.mangaPrefs,
        [mangaId]: {
            ...(settingsState.mangaPrefs[mangaId] ?? {}),
            ...patch,
        },
    };
    queueSettingsSync();
}

export function clearMangaPrefs(mangaId: number) {
    const next = {...settingsState.mangaPrefs};
    delete next[mangaId];
    settingsState.mangaPrefs = next;
    queueSettingsSync();
}