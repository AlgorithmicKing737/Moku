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

export async function dequeueDownload(chapterId: string) {
  await getAdapter().dequeueDownload(chapterId)
  downloadsState.items = downloadsState.items.filter(d => d.chapterId !== chapterId)
}

export async function clearDownloads() {
  await getAdapter().clearDownloads()
  downloadsState.items = []
}
