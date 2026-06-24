import { platformService } from '$lib/platform-service'

// The Tauri webview enforces CORS on cross-origin requests, so a plain window.fetch to a third-party
// host (e.g. Jikan) can be blocked. The Tauri HTTP plugin issues the request from Rust, bypassing
// CORS. On web we fall back to the normal fetch.
export async function externalFetch(url: string, init: RequestInit): Promise<Response> {
  if (platformService.platform === 'tauri') {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
    return tauriFetch(url, init)
  }
  return fetch(url, init)
}
