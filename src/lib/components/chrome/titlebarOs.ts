export type OsKind = 'macos' | 'windows' | 'linux' | 'unknown'

export async function detectOs(): Promise<OsKind> {
  try {
    const { platform } = await import('@tauri-apps/plugin-os')
    const p = await platform()
    if (p === 'macos')   return 'macos'
    if (p === 'windows') return 'windows'
    if (p === 'linux')   return 'linux'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}