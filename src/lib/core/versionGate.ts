const SUWAYOMI_MAX_VERSION = '0.10.4'
const TSUNAGU_MIN_VERSION  = '0.10.5'

function stripV(v: string): string {
  return v.replace(/^v/, '')
}

function parseVersion(v: string): number[] {
  return stripV(v).split('.').map(Number)
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a), pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export function isBackendMigrationBlocked(currentVersion: string, targetVersion: string): boolean {
  const currentIsSuwayomi = compareVersions(currentVersion, SUWAYOMI_MAX_VERSION) <= 0
  const targetIsSuwayomi  = compareVersions(targetVersion, SUWAYOMI_MAX_VERSION) <= 0
  return currentIsSuwayomi !== targetIsSuwayomi
}

export function getBackendMigrationMessage(currentVersion: string, targetVersion: string): string {
  const targetIsSuwayomi = compareVersions(targetVersion, SUWAYOMI_MAX_VERSION) <= 0
  if (targetIsSuwayomi) {
    return "Downgrading past v0.10.5 isn't supported. Moku's Tsunagu backend isn't compatible with the older Suwayomi-based builds."
  }
  return "Suwayomi support ended after v0.10.4. Moku now uses its own Tsunagu backend starting in v0.10.5, and updating in place isn't supported. See the migration guide before moving to the new backend."
}
