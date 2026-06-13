import { externalJson } from './http'

const JIKAN = 'https://api.jikan.moe/v4/manga'

interface JikanImages { jpg?: { large_image_url?: string; image_url?: string } }
interface JikanManga  { images?: JikanImages }

function coverOf(m: JikanManga | undefined): string | null {
  return m?.images?.jpg?.large_image_url ?? m?.images?.jpg?.image_url ?? null
}

export async function coverById(remoteId: string): Promise<string | null> {
  const data = (await externalJson(`${JIKAN}/${remoteId}`)) as { data?: JikanManga }
  return coverOf(data?.data)
}

export async function coverByTitle(title: string): Promise<string | null> {
  const data = (await externalJson(`${JIKAN}?q=${encodeURIComponent(title)}&limit=1`)) as { data?: JikanManga[] }
  return coverOf(data?.data?.[0])
}
