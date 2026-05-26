import type { CustomTheme } from '$lib/types/settings'

let themeStyleEl: HTMLStyleElement | null = null
let mediaQuery:   MediaQueryList | null   = null
let mediaHandler: (() => void) | null     = null

export function applyTheme(themeId: string, customThemes: CustomTheme[] = []) {
  const custom = customThemes.find(t => t.id === themeId)

  if (custom) {
    const vars = Object.entries(custom.tokens)
      .map(([k, v]) => `  --${k}: ${v};`)
      .join('\n')
    if (!themeStyleEl) {
      themeStyleEl = document.createElement('style')
      themeStyleEl.id = 'moku-custom-theme'
      document.head.appendChild(themeStyleEl)
    }
    themeStyleEl.textContent = `:root {\n${vars}\n}`
    document.body.removeAttribute('data-theme')
    return
  }

  if (themeStyleEl) {
    themeStyleEl.remove()
    themeStyleEl = null
  }
  document.body.setAttribute('data-theme', themeId)
}

export function mountSystemThemeSync(
  enabled: boolean,
  darkTheme: string,
  lightTheme: string,
  onSwitch: (themeId: string) => void
) {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener('change', mediaHandler)
    mediaHandler = null
  }

  if (!enabled) { mediaQuery = null; return }

  mediaQuery   = window.matchMedia('(prefers-color-scheme: dark)')
  mediaHandler = () => onSwitch(mediaQuery!.matches ? darkTheme : lightTheme)
  mediaQuery.addEventListener('change', mediaHandler)
  onSwitch(mediaQuery.matches ? darkTheme : lightTheme)
}

export function unmountSystemThemeSync() {
  if (mediaQuery && mediaHandler) {
    mediaQuery.removeEventListener('change', mediaHandler)
    mediaHandler = null
    mediaQuery   = null
  }
}