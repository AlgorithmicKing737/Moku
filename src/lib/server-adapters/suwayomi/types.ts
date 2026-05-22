import type { Manga, Chapter, Extension } from '$lib/types'
import type { DownloadItem } from '$lib/server-adapters/types'

export interface GQLResponse<T> {
  data: T
  errors?: { message: string }[]
}

export function mapManga(raw: Record<string, unknown>): Manga {
  const inLibraryAt = raw.inLibraryAt as string | null | undefined
  return {
    ...(raw as unknown as Manga),
    tags: raw.genre as string[] | undefined,
    addedAt: inLibraryAt ? new Date(inLibraryAt).getTime() : undefined,
    lastReadAt: raw.lastReadChapter ? Date.now() : undefined,
  }
}

export function mapChapter(raw: Record<string, unknown>): Chapter {
  return {
    id: raw.id as number,
    name: raw.name as string,
    chapterNumber: raw.chapterNumber as number,
    sourceOrder: raw.sourceOrder as number,
    read: (raw.isRead as boolean) ?? false,
    downloaded: (raw.isDownloaded as boolean) ?? false,
    bookmarked: (raw.isBookmarked as boolean) ?? false,
    pageCount: (raw.pageCount as number) ?? 0,
    mangaId: raw.mangaId as number,
    fetchedAt: raw.fetchedAt as string | undefined,
    uploadDate: raw.uploadDate as string | null | undefined,
    realUrl: raw.realUrl as string | null | undefined,
    lastPageRead: raw.lastPageRead as number | undefined,
    lastReadAt: raw.lastReadAt as string | undefined,
    scanlator: raw.scanlator as string | null | undefined,
    manga: raw.manga as Chapter['manga'],
  }
}

export function mapExtension(raw: Record<string, unknown>): Extension {
  return {
    ...(raw as unknown as Extension),
    id: raw.pkgName as string,
  }
}

export function mapDownloadItem(raw: Record<string, unknown>): DownloadItem {
  const chapter = raw.chapter as Record<string, unknown>
  const manga = chapter?.manga as Record<string, unknown>
  return {
    chapterId: String(chapter?.id),
    mangaId: String(chapter?.mangaId ?? manga?.id),
    chapterName: chapter?.name as string,
    mangaTitle: manga?.title as string,
    progress: (raw.progress as number) ?? 0,
    state: mapDownloadState(raw.state as string),
  }
}

function mapDownloadState(state: string): DownloadItem['state'] {
  switch (state) {
    case 'DOWNLOADING': return 'downloading'
    case 'FINISHED':    return 'finished'
    case 'ERROR':       return 'error'
    default:            return 'queued'
  }
}