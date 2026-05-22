export type AppStatus = 'booting' | 'auth' | 'ready' | 'error'

export const appState = $state({
  status: 'booting' as AppStatus,
  error: null as string | null,
  serverUrl: '',
  authenticated: false,
  platform: 'web' as 'web' | 'tauri' | 'capacitor',
  version: '',
})
