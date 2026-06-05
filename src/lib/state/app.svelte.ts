import type { Platform } from '$lib/platform-adapters/types'

export type AppStatus = 'booting' | 'not-configured' | 'auth' | 'locked' | 'ready' | 'error'

class AppStore {
  settingsOpen:    boolean             = $state(false)
  navPage:         string              = $state('')
  scrollPositions: Map<string, number> = $state(new Map())

  setSettingsOpen(next: boolean) { this.settingsOpen = next }
  setNavPage(next: string)       { this.navPage = next }

  saveScroll(key: string, top: number) {
    const m = new Map(this.scrollPositions)
    m.set(key, top)
    this.scrollPositions = m
  }

  getScroll(key: string): number { return this.scrollPositions.get(key) ?? 0 }
}

export const app = new AppStore()

export const appState = $state({
  status:        'booting' as AppStatus,
  error:         null      as string | null,
  serverUrl:     '',
  authenticated: false,
  authMode:      'NONE'    as 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  platform:      'web'     as Platform,
  version:       '',
  libraryFilter: '',
  navPage:       '',
  categories:    [] as { id: number; name: string }[],
  history:       [] as unknown[],
  toasts:        [] as unknown[],
  appDir:        '',
})

export function setSettingsOpen(next: boolean)        { app.setSettingsOpen(next) }
export function saveScroll(key: string, top: number)  { app.saveScroll(key, top) }
export function getScroll(key: string): number        { return app.getScroll(key) }
export function setGenreFilter(genre: string)         { appState.libraryFilter = genre }
export function setNavPage(page: string)              { app.setNavPage(page); appState.navPage = page }