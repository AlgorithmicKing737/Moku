export type AppStatus = 'booting' | 'not-configured' | 'auth' | 'ready' | 'error'

export const appState = $state({
  status:          'booting' as AppStatus,
  error:           null as string | null,
  serverUrl:       '',
  authenticated:   false,
  authMode:        'NONE' as 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  platform:        'web' as 'web' | 'tauri' | 'capacitor',
  version:         '',
})