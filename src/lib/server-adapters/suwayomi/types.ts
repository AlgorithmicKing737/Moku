import type { Manga, Chapter, Extension, Category } from '$lib/types'
import type { DownloadItem } from '$lib/server-adapters/types'

export interface GQLResponse<T> {
  data: T
  errors?: { message: string }[]
}

export function mapManga(raw: Record<string, unknown>): Manga {
  return {
    id:            raw.id as number,
    title:         raw.title as string,
    description:   raw.description as string | null | undefined,
    thumbnailUrl:  raw.thumbnailUrl as string | null | undefined,
    status:        raw.status as string | undefined,
    author:        raw.author as string | null | undefined,
    artist:        raw.artist as string | null | undefined,
    tags:          raw.genre as string[] | undefined,
    inLibrary:     raw.inLibrary as boolean,
    realUrl:       raw.realUrl as string | null | undefined,
    source:        raw.source as Manga['source'],
    unreadCount:   raw.unreadCount as number | undefined,
    downloadCount: raw.downloadCount as number | undefined,
    bookmarkCount: raw.bookmarkCount as number | undefined,
    lastReadChapter:    raw.lastReadChapter as Manga['lastReadChapter'],
    firstUnreadChapter: raw.firstUnreadChapter as Manga['firstUnreadChapter'],
    addedAt:  raw.inLibraryAt ? new Date(raw.inLibraryAt as string).getTime() : undefined,
    lastReadAt: raw.lastReadChapter ? Date.now() : undefined,
  }
}

export function mapChapter(raw: Record<string, unknown>): Chapter {
  return {
    id:            raw.id as number,
    name:          raw.name as string,
    chapterNumber: raw.chapterNumber as number,
    sourceOrder:   raw.sourceOrder as number,
    read:          (raw.isRead as boolean) ?? false,
    downloaded:    (raw.isDownloaded as boolean) ?? false,
    bookmarked:    (raw.isBookmarked as boolean) ?? false,
    pageCount:     (raw.pageCount as number) ?? 0,
    mangaId:       raw.mangaId as number,
    fetchedAt:     raw.fetchedAt as string | undefined,
    uploadDate:    raw.uploadDate as string | null | undefined,
    realUrl:       raw.realUrl as string | null | undefined,
    lastPageRead:  raw.lastPageRead as number | undefined,
    lastReadAt:    raw.lastReadAt as string | undefined,
    scanlator:     raw.scanlator as string | null | undefined,
    manga:         raw.manga as Chapter['manga'],
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
  const manga   = chapter?.manga as Record<string, unknown>
  return {
    chapterId:  String(chapter?.id),
    mangaId:    String(chapter?.mangaId ?? manga?.id),
    chapterName: chapter?.name as string,
    mangaTitle:  manga?.title as string,
    progress:   (raw.progress as number) ?? 0,
    state:      mapDownloadState(raw.state as string),
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

export function mapCategory(raw: Record<string, unknown>): Category {
  return {
    id:                raw.id as number,
    name:              raw.name as string,
    order:             raw.order as number,
    default:           raw.default as boolean,
    includeInUpdate:   raw.includeInUpdate as boolean,
    includeInDownload: raw.includeInDownload as boolean,
    mangas:            (raw.mangas as { nodes: Record<string, unknown>[] })?.nodes?.map(mapManga),
  }
}