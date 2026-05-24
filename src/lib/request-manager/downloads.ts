import { getAdapter } from '$lib/request-manager'
import { downloadsState } from '$lib/state/downloads.svelte'

export async function loadDownloads() {
  try {
    downloadsState.items = await getAdapter().getDownloads()
  } catch (e) {
    downloadsState.error = String(e)
  }
}

export async function enqueueDownload(chapterId: string) {
  await getAdapter().enqueueDownload(chapterId)
  await loadDownloads()
}

export async function enqueueDownloads(chapterIds: string[]) {
  await getAdapter().enqueueDownloads(chapterIds)
  await loadDownloads()
}

export async function dequeueDownload(chapterId: string) {
  await getAdapter().dequeueDownload(chapterId)
  downloadsState.items = downloadsState.items.filter(d => d.chapterId !== chapterId)
}

export async function dequeueDownloads(chapterIds: string[]) {
  const ids = new Set(chapterIds)
  await getAdapter().dequeueDownloads(chapterIds)
  downloadsState.items = downloadsState.items.filter(d => !ids.has(d.chapterId))
}

export async function clearDownloads() {
  await getAdapter().clearDownloads()
  downloadsState.items = []
}

export async function startDownloader() {
  await getAdapter().startDownloader()
}

export async function stopDownloader() {
  await getAdapter().stopDownloader()
}