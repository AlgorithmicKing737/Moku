import type { ServerAdapter } from '$lib/server-adapters/types'
import * as extensions from './extensions'
import * as chapters   from './chapters'
import * as downloads  from './downloads'
import * as manga      from './manga'
import * as tracking   from './tracking'

let adapter: ServerAdapter

export function initRequestManager(a: ServerAdapter) {
  adapter = a
}

export function getAdapter(): ServerAdapter {
  if (!adapter) throw new Error('RequestManager not initialized')
  return adapter
}

export function clearPageCache(chapterId?: number): void {
  getAdapter().clearPageCache(chapterId)
}

export const requestManager = {
  extensions,
  chapters,
  downloads,
  manga,
  tracking,
}