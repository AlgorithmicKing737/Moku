import type {CustomTheme, Theme} from '$lib/types/settings';

let themeStyleEl: HTMLStyleElement | null = null;

function ensureThemeStyleEl(): HTMLStyleElement {
    if (themeStyleEl) return themeStyleEl;

    themeStyleEl = document.createElement('style');
    themeStyleEl.id = 'moku-custom-theme';
    document.head.appendChild(themeStyleEl);
    return themeStyleEl;
}

function removeCustomThemeCss() {
    themeStyleEl?.remove();
    themeStyleEl = null;
}

function resolveBuiltinTheme(theme: Theme): string {
    if (theme === 'light-contrast') return 'light';
    return theme || 'dark';
}

export function applyTheme(theme: Theme, customThemes: CustomTheme[] = []) {
    const activeTheme = theme || 'dark';
    const customThemeId = activeTheme.startsWith('custom:') ? activeTheme.slice(7) : activeTheme;
    const customTheme = customThemes.find(entry => entry.id === customThemeId);

    if (!customTheme) {
        removeCustomThemeCss();
        document.documentElement.setAttribute('data-theme', resolveBuiltinTheme(activeTheme));
        return;
    }

    const css = Object.entries(customTheme.tokens)
        .map(([token, value]) => `  --${token}: ${value};`)
        .join('\n');

    ensureThemeStyleEl().textContent = `[data-theme="custom"] {\n${css}\n}`;
    document.documentElement.setAttribute('data-theme', 'custom');
}