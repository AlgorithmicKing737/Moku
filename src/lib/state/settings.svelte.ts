import type { Settings }    from "$lib/types/settings";
import { DEFAULT_SETTINGS } from "$lib/types/settings";

const KEY = "moku_settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function save(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export const settingsState = $state({ settings: load() });

if (typeof document !== "undefined") {
  document.documentElement.style.zoom = String(settingsState.settings.uiZoom ?? 1.0);
}

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settingsState.settings, patch);
  save(settingsState.settings);

  if (typeof document !== "undefined") {
    if (patch.uiZoom !== undefined) {
      document.documentElement.style.zoom = String(patch.uiZoom);
    }
  }
}

export function resetSettings() {
  settingsState.settings = { ...DEFAULT_SETTINGS };
  save(settingsState.settings);
}