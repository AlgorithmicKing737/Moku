import { externalJson } from './http'

const ANILIST  = 'https://graphql.anilist.co'
const BY_ID    = `query ($id: Int) { Media(id: $id, type: MANGA) { coverImage { extraLarge large } } }`
const BY_TITLE = `query ($search: String) { Media(search: $search, type: MANGA) { coverImage { extraLarge large } } }`

interface AniMedia { coverImage?: { extraLarge?: string; large?: string } }

function coverOf(m: AniMedia | null | undefined): string | null {
  return m?.coverImage?.extraLarge ?? m?.coverImage?.large ?? null
}

async function run(query: string, variables: Record<string, unknown>): Promise<string | null> {
  const data = (await externalJson(ANILIST, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({ query, variables }),
  })) as { data?: { Media?: AniMedia } }
  return coverOf(data?.data?.Media)
}

export async function coverById(remoteId: string): Promise<string | null> {
  const id = Number(remoteId)
  if (!Number.isFinite(id)) return null
  return run(BY_ID, { id })
}

export async function coverByTitle(title: string): Promise<string | null> {
  return run(BY_TITLE, { search: title })
}
