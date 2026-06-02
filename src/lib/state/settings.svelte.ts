import type { Settings }    from '$lib/types/settings'
import { DEFAULT_SETTINGS } from '$lib/types/settings'
import { saveSettings }     from '$lib/core/persistence/persist'

export const settingsState = $state({ settings: { ...DEFAULT_SETTINGS } as Settings })

export async function loadSettingsIntoState(raw: unknown) {
  if (raw && typeof raw === 'object') {
    Object.assign(settingsState.settings, raw)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.style.zoom = String(settingsState.settings.uiZoom ?? 1.0)
  }
}

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settingsState.settings, patch)
  void saveSettings({ storeVersion: 2, settings: settingsState.settings })

  if (typeof document !== 'undefined' && patch.uiZoom !== undefined) {
    document.documentElement.style.zoom = String(patch.uiZoom)
  }
}

export function resetSettings() {
  settingsState.settings = { ...DEFAULT_SETTINGS }
  void saveSettings({ storeVersion: 2, settings: settingsState.settings })
}