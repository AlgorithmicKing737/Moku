import type { ServerAdapter } from '$lib/server-adapters/types'

let adapter: ServerAdapter

export function initRequestManager(a: ServerAdapter) {
  adapter = a
}

export function getAdapter(): ServerAdapter {
  if (!adapter) throw new Error('RequestManager not initialized')
  return adapter
}