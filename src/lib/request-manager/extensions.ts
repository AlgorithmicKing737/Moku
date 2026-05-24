import { getAdapter } from '$lib/request-manager'
import { extensionsState } from '$lib/state/extensions.svelte'

export async function loadExtensions() {
  extensionsState.loading = true
  extensionsState.error   = null
  try {
    extensionsState.items = await getAdapter().getExtensions()
  } catch (e) {
    extensionsState.error = String(e)
  } finally {
    extensionsState.loading = false
  }
}

export async function loadSources() {
  try {
    extensionsState.sources = await getAdapter().getSources()
  } catch (e) {
    extensionsState.error = String(e)
  }
}

export async function installExtension(id: string) {
  await getAdapter().installExtension(id)
  await loadExtensions()
}

export async function installExternalExtension(url: string) {
  await getAdapter().installExternalExtension(url)
  await loadExtensions()
}

export async function uninstallExtension(id: string) {
  await getAdapter().uninstallExtension(id)
  extensionsState.items = extensionsState.items.filter(e => e.id !== id)
}

export async function updateExtension(id: string) {
  await getAdapter().updateExtension(id)
  await loadExtensions()
}

export async function updateAllExtensions() {
  const updatable = extensionsState.items.filter(e => e.hasUpdate).map(e => e.id)
  if (!updatable.length) return
  await getAdapter().updateExtensions(updatable)
  await loadExtensions()
}

export async function browseSource(sourceId: string, page: number) {
  extensionsState.browseLoading = true
  extensionsState.browseError   = null
  try {
    const result = await getAdapter().browseSource(sourceId, page)
    extensionsState.browseResults = result.items
    extensionsState.browseHasMore = result.hasNextPage
  } catch (e) {
    extensionsState.browseError = String(e)
  } finally {
    extensionsState.browseLoading = false
  }
}