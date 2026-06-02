import { platformService } from '$lib/platform-service'
import type { ReadSession }   from '$lib/types/history'
import type { BookmarkEntry, MarkerEntry } from '$lib/types/history'

const STORE_VERSION = 2

export interface PersistedSettings {
  storeVersion: number
  settings:     unknown
}

export interface PersistedLibrary {
  sessions:        ReadSession[]
  bookmarks:       BookmarkEntry[]
  markers:         MarkerEntry[]
  dailyReadCounts: Record<string, number>
}

export interface PersistedUpdates {
  libraryUpdates:        unknown[]
  lastLibraryRefresh:    number
  acknowledgedUpdateIds: number[]
}

export interface PersistedBackups {
  backupList: { url: string; name: string }[]
}

function migrateLibrary(raw: unknown, fromVersion: number): PersistedLibrary {
  const data = (raw ?? {}) as Record<string, unknown>

  if (fromVersion < 2) {
    const oldHistory = (data.history ?? []) as Array<{
      mangaId: number; mangaTitle: string; thumbnailUrl: string
      chapterId: number; chapterName: string; chapterNumber?: number
      pageNumber?: number; readAt: number
    }>

    const sessions: ReadSession[] = oldHistory.map(e => ({
      id:               crypto.randomUUID(),
      mangaId:          e.mangaId,
      mangaTitle:       e.mangaTitle,
      thumbnailUrl:     e.thumbnailUrl,
      startChapterId:   e.chapterId,
      startChapterName: e.chapterName,
      endChapterId:     e.chapterId,
      endChapterName:   e.chapterName,
      startPage:        1,
      endPage:          e.pageNumber ?? 1,
      startedAt:        e.readAt,
      endedAt:          e.readAt,
      durationMs:       0,
      chaptersSpanned:  1,
    }))

    return {
      sessions,
      bookmarks:       (data.bookmarks ?? []) as BookmarkEntry[],
      markers:         (data.markers   ?? []) as MarkerEntry[],
      dailyReadCounts: (data.dailyReadCounts ?? {}) as Record<string, number>,
    }
  }

  return {
    sessions:        (data.sessions        ?? []) as ReadSession[],
    bookmarks:       (data.bookmarks       ?? []) as BookmarkEntry[],
    markers:         (data.markers         ?? []) as MarkerEntry[],
    dailyReadCounts: (data.dailyReadCounts ?? {}) as Record<string, number>,
  }
}

export async function loadSettings(): Promise<PersistedSettings> {
  const raw = await platformService.loadStore('settings')
  const data = (raw ?? {}) as Record<string, unknown>

  const legacyRaw = typeof window !== 'undefined' ? localStorage.getItem('moku_settings') : null
  if (legacyRaw && !data.settings) {
    try {
      const legacySettings = JSON.parse(legacyRaw)
      localStorage.removeItem('moku_settings')
      const result: PersistedSettings = { storeVersion: STORE_VERSION, settings: legacySettings }
      await saveSettings(result)
      return result
    } catch {}
  }

  return {
    storeVersion: (data.storeVersion as number) ?? STORE_VERSION,
    settings:     data.settings ?? null,
  }
}

export async function saveSettings(data: PersistedSettings): Promise<void> {
  await platformService.saveStore('settings', data)
}

export async function loadLibrary(): Promise<PersistedLibrary> {
  const raw     = await platformService.loadStore('library')
  const data    = (raw ?? {}) as Record<string, unknown>
  const version = (data.storeVersion as number) ?? 1

  const legacyRaw = typeof window !== 'undefined' ? localStorage.getItem('moku-store') : null
  if (legacyRaw && !(data.sessions || data.history)) {
    try {
      const legacy = JSON.parse(legacyRaw)
      const migrated = migrateLibrary(legacy, 1)
      localStorage.removeItem('moku-store')
      await saveLibrary(migrated)
      return migrated
    } catch {}
  }

  return migrateLibrary(raw, version)
}

export async function saveLibrary(data: PersistedLibrary): Promise<void> {
  await platformService.saveStore('library', { ...data, storeVersion: STORE_VERSION })
}

export async function loadUpdates(): Promise<PersistedUpdates> {
  const raw  = await platformService.loadStore('updates')
  const data = (raw ?? {}) as Record<string, unknown>
  return {
    libraryUpdates:        (data.libraryUpdates        ?? []) as unknown[],
    lastLibraryRefresh:    (data.lastLibraryRefresh     ?? 0)  as number,
    acknowledgedUpdateIds: (data.acknowledgedUpdateIds  ?? []) as number[],
  }
}

export async function saveUpdates(data: PersistedUpdates): Promise<void> {
  await platformService.saveStore('updates', data)
}

export async function loadBackups(): Promise<{ url: string; name: string }[]> {
  const raw  = await platformService.loadStore('backups')
  const data = (raw ?? {}) as Record<string, unknown>

  if (!data.backupList) {
    try {
      const legacyRaw = typeof window !== 'undefined' ? localStorage.getItem('moku_backups') : null
      if (legacyRaw) {
        const list = JSON.parse(legacyRaw) as { url: string; name: string }[]
        localStorage.removeItem('moku_backups')
        await saveBackups(list)
        return list
      }
    } catch {}
    return []
  }

  return data.backupList as { url: string; name: string }[]
}

export async function saveBackups(list: { url: string; name: string }[]): Promise<void> {
  await platformService.saveStore('backups', { backupList: list })
}