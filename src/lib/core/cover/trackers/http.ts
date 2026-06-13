import { externalFetch } from '$lib/core/net/externalFetch'

// Browser fetch first (real UA, server-set CORS); Tauri HTTP plugin as a CORS-bypass fallback.
// One helper for both GET (Jikan) and POST (AniList GraphQL) — pass method/body via `init`.
// Throws on timeout or non-OK; callers convert that to "no cover" (null).
export async function externalJson(url: string, init: RequestInit = {}, timeoutMs = 6000): Promise<unknown> {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const opts: RequestInit = { ...init, signal: ctrl.signal }
  try {
    let res: Response
    try { res = await fetch(url, opts) } catch { res = await externalFetch(url, opts) }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}
