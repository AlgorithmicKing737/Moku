import { settingsState, updateSettings } from "$lib/state/settings.svelte";

let themeStyleEl: HTMLStyleElement | null = null;
let mediaQuery:   MediaQueryList | null   = null;
let mediaHandler: (() => void) | null     = null;

export function applyTheme() {
  const themeId  = settingsState.theme ?? "dark";
  const isCustom = themeId.startsWith("custom:");

  if (!isCustom) {
    themeStyleEl?.remove();
    themeStyleEl = null;
    document.documentElement.setAttribute("data-theme", themeId);
    return;
  }

  const custom = settingsState.customThemes?.find(t => t.id === themeId);
  if (!custom) {
    themeStyleEl?.remove();
    themeStyleEl = null;
    document.documentElement.setAttribute("data-theme", "dark");
    return;
  }

  const vars = Object.entries(custom.tokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
  const css = `[data-theme="custom"] {\n${vars}\n}`;

  if (!themeStyleEl) {
    themeStyleEl = document.createElement("style");
    themeStyleEl.id = "moku-custom-theme";
    document.head.appendChild(themeStyleEl);
  }
  themeStyleEl.textContent = css;
  document.documentElement.setAttribute("data-theme", "custom");
}

function applySystemTheme(dark: boolean) {
  const themeId = dark
    ? (settingsState.systemThemeDark ?? "dark")
    : (settingsState.systemThemeLight ?? "light");
  updateSettings({ theme: themeId });
}

export function mountSystemThemeSync() {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener("change", mediaHandler);
    mediaHandler = null;
  }

  if (!settingsState.systemThemeSync) return;

  mediaQuery   = window.matchMedia("(prefers-color-scheme: dark)");
  mediaHandler = () => applySystemTheme(mediaQuery!.matches);
  mediaQuery.addEventListener("change", mediaHandler);
  applySystemTheme(mediaQuery.matches);
}

export function unmountSystemThemeSync() {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener("change", mediaHandler);
    mediaHandler = null;
    mediaQuery   = null;
  }
}