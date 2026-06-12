import { getAdapter }   from "$lib/request-manager";
import type { Chapter } from "$lib/types";

export async function getChapters(mangaId: number, signal?: AbortSignal): Promise<Chapter[]> {
  return getAdapter().getChapters(String(mangaId), signal);
}

export async function fetchChapters(mangaId: number, signal?: AbortSignal): Promise<Chapter[]> {
  return getAdapter().fetchChapters(String(mangaId), signal);
}

export async function markChapterRead(id: number, read: boolean): Promise<void> {
  await getAdapter().markChapterRead(String(id), read);
}

export async function markChaptersRead(ids: number[], read: boolean): Promise<void> {
  await getAdapter().markChaptersRead(ids.map(String), read);
}

export async function markManyRead(ids: string[], read: boolean): Promise<void> {
  await getAdapter().markChaptersRead(ids, read);
}

export async function updateChaptersProgress(
  ids: string[],
  patch: { isRead?: boolean; isBookmarked?: boolean; lastPageRead?: number },
): Promise<void> {
  await getAdapter().updateChaptersProgress(ids, patch);
}

export async function deleteDownloadedChapters(ids: number[]): Promise<void> {
  await getAdapter().deleteDownloadedChapters(ids.map(String));
}