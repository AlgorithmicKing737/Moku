import { settingsState, updateSettings } from '$lib/state/settings.svelte'
import { DEFAULT_MANGA_PREFS }           from '$lib/types/settings'
import type { MangaPrefs }               from '$lib/types/settings'

export { DEFAULT_MANGA_PREFS }           from '$lib/types/settings'

export function getPref<K extends keyof MangaPrefs>(mangaId: number, key: K): MangaPrefs[K] {
  const prefs = settingsState.settings.mangaPrefs?.[mangaId] ?? {}
  return (prefs[key] ?? DEFAULT_MANGA_PREFS[key]) as MangaPrefs[K]
}

export function setPref<K extends keyof MangaPrefs>(mangaId: number, key: K, value: MangaPrefs[K]) {
  updateSettings({
    mangaPrefs: {
      ...settingsState.settings.mangaPrefs,
      [mangaId]: { ...(settingsState.settings.mangaPrefs?.[mangaId] ?? {}), [key]: value },
    },
  })
}