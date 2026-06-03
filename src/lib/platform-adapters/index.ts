export type { PlatformAdapter, PlatformFeature, Platform } from './types'
export type {
  ServerLaunchConfig, DiscordPresence, AppUpdateInfo,
  StorageInfo, MigrateProgress, UpdateProgress, ReleaseInfo,
} from './types'

export { TauriAdapter }     from './tauri/adapter'
export { WebAdapter }       from './web/adapter'
export { CapacitorAdapter } from './capacitor/adapter'

import type { PlatformAdapter } from './types'
import { TauriAdapter }     from './tauri/adapter'
import { CapacitorAdapter } from './capacitor/adapter'
import { WebAdapter }       from './web/adapter'

export function detectAdapter(): PlatformAdapter {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return new TauriAdapter()
  }
  if (typeof window !== 'undefined' && 'Capacitor' in window) {
    return new CapacitorAdapter()
  }
  return new WebAdapter()
}