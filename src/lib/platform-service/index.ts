import type { PlatformAdapter } from '$lib/platform-adapters/types'

let adapter: PlatformAdapter

export function initPlatformService(a: PlatformAdapter) {
  adapter = a
}

export function getPlatformService(): PlatformAdapter {
  if (!adapter) throw new Error('PlatformService not initialized')
  return adapter
}