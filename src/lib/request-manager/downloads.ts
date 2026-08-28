import { getAdapter }  from "$lib/request-manager";
import { invoke }      from "@tauri-apps/api/core";
import type { DownloadStatus } from "$lib/types/api";

export async function loadDownloadStatus(): Promise<DownloadStatus | null> {
  try {
    return await getAdapter().getDownloadStatus();
  } catch {
    return null;
  }
}

export async function enqueueDownload(chapterId: string): Promise<void> {
  await getAdapter().enqueueDownload(chapterId);
}

export async function enqueueDownloads(chapterIds: string[]): Promise<void> {
  await getAdapter().enqueueDownloads(chapterIds);
}

export async function dequeueDownload(chapterId: string): Promise<void> {
  await getAdapter().dequeueDownload(chapterId);
}

export async function dequeueDownloads(chapterIds: string[]): Promise<void> {
  await getAdapter().dequeueDownloads(chapterIds);
}

export async function reorderDownload(chapterId: number, to: number): Promise<DownloadStatus | null> {
  try {
    return await getAdapter().reorderDownload(String(chapterId), to);
  } catch {
    return null;
  }
}

export async function reorderDownloadLight(chapterId: number, to: number, signal?: AbortSignal): Promise<void> {
  await getAdapter().reorderDownloadLight(String(chapterId), to, signal);
}

export async function clearDownloads(): Promise<void> {
  await getAdapter().clearDownloads();
}

export async function startDownloader(): Promise<DownloadStatus | null> {
  try {
    return await getAdapter().startDownloader();
  } catch {
    return null;
  }
}

export async function stopDownloader(): Promise<DownloadStatus | null> {
  try {
    return await getAdapter().stopDownloader();
  } catch {
    return null;
  }
}

export async function getStorageInfo(downloadsPath: string): Promise<{ freeBytes: number }> {
  const info = await invoke<{ free_bytes: number }>("get_storage_info", { downloadsPath });
  return { freeBytes: info.free_bytes };
}