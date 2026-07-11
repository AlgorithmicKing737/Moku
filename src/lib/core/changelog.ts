import { externalFetch } from '$lib/core/net/externalFetch'

export interface ChangelogSection {
  heading: string
  items:   string[]
}

export interface ChangelogEntry {
  version:    string
  released:   string
  quote:      string | null
  sections:   ChangelogSection[]
  compareUrl: string | null
}

const VERSION_RE  = /^#\s*Moku\s+v?(\S+)/i
const RELEASED_RE = /^\*\*Released:\*\*\s*(.+)$/i
const QUOTE_RE     = /^>\s*"?(.+?)"?$/
const SECTION_RE   = /^##\s+(.+)$/
const ITEM_RE      = /^[-*•]\s+(.+)$/
const COMPARE_RE   = /^\*\*Full Changelog:\*\*\s*(\S+)$/i

const RELEASES_API_BASE = 'https://api.github.com/repos/moku-project/Moku/releases/tags'

const EXCLUDED_HEADINGS = /^(highlights?)$/i

export function parseChangelog(raw: string): ChangelogEntry {
  const lines = raw.split('\n').map(l => l.trimEnd())

  let version: string | null = null
  let released = ''
  let quote: string | null = null
  let compareUrl: string | null = null
  const sections: ChangelogSection[] = []
  let currentSection: ChangelogSection | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const versionMatch = trimmed.match(VERSION_RE)
    if (versionMatch) { version = versionMatch[1]; continue }

    const releasedMatch = trimmed.match(RELEASED_RE)
    if (releasedMatch) { released = releasedMatch[1].trim(); continue }

    const compareMatch = trimmed.match(COMPARE_RE)
    if (compareMatch) { compareUrl = compareMatch[1].trim(); continue }

    const sectionMatch = trimmed.match(SECTION_RE)
    if (sectionMatch) {
      const heading = sectionMatch[1].trim()
      if (EXCLUDED_HEADINGS.test(heading)) { currentSection = null; continue }
      currentSection = { heading, items: [] }
      sections.push(currentSection)
      continue
    }

    const itemMatch = trimmed.match(ITEM_RE)
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1].trim())
      continue
    }

    if (!currentSection && trimmed.startsWith('>')) {
      const quoteMatch = trimmed.match(QUOTE_RE)
      if (quoteMatch) quote = quoteMatch[1].trim()
      continue
    }
  }

  if (!version) throw new Error('changelog: could not find version header (expected "# Moku vX.Y.Z")')

  return { version, released, quote, sections: sections.filter(s => s.items.length > 0), compareUrl }
}

interface GithubReleaseResponse {
  tag_name:     string
  body:         string
  html_url:     string
  published_at: string
}

export async function fetchChangelogForVersion(version: string): Promise<ChangelogEntry | null> {
  const tag = version.replace(/^v/i, '')
  const res = await externalFetch(`${RELEASES_API_BASE}/v${tag}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) return null

  const data = await res.json() as GithubReleaseResponse
  if (!data?.body) return null

  const entry = parseChangelog(data.body)

  entry.version = data.tag_name.replace(/^v/i, '') || entry.version
  entry.compareUrl = entry.compareUrl ?? data.html_url

  if (!entry.released && data.published_at) {
    entry.released = new Date(data.published_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return entry
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0)
  const pb = b.split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}