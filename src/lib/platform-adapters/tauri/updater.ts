import { invoke }     from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import { toast }      from '$lib/state/notifications.svelte'
import { isBackendMigrationBlocked, getBackendMigrationMessage } from '$lib/core/versionGate'

function parse(tag: string): number[] {
  return tag.replace(/^v/, '').split('.').map(Number)
}

function isNewer(candidate: number[], current: number[]): boolean {
  for (let i = 0; i < 3; i++) {
    if ((candidate[i] ?? 0) > (current[i] ?? 0)) return true
    if ((candidate[i] ?? 0) < (current[i] ?? 0)) return false
  }
  return false
}

export async function checkForUpdateSilently(): Promise<void> {
  try {
    const [currentVersion, releases] = await Promise.all([
      getVersion(),
      invoke<Array<{ tag_name: string }>>('list_releases'),
    ])

    const valid = releases.filter(r => r.tag_name?.trim())
    if (!valid.length) return

    const latest = valid
      .map(r => r.tag_name)
      .sort((a, b) => {
        const pa = parse(a), pb = parse(b)
        for (let i = 0; i < 3; i++) if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0)
        return 0
      })[0]

    if (isNewer(parse(latest), parse(currentVersion))) {
      if (isBackendMigrationBlocked(currentVersion, latest)) {
        toast({
          kind:    'warning',
          message: `Update ${latest} available`,
          detail:  getBackendMigrationMessage(currentVersion, latest),
        })
      } else {
        toast({
          kind:    'info',
          message: `Update available — ${latest}`,
          detail:  'Open Settings → About to install.',
        })
      }
    }
  } catch {}
}