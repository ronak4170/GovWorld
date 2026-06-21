/**
 * Browserbase-powered web research core (server-side only).
 *
 * Each council expert is a web agent that researches before arguing. This module
 * powers that research with the Browserbase platform:
 *   - Search  (POST /v1/search) — find relevant URLs for each expert query
 *   - Fetch   (POST /v1/fetch)  — render each page to markdown and extract a snippet
 *
 * Requires the BROWSERBASE_API_KEY env var (never exposed to the browser).
 * Shared by the Vercel serverless function (api/research.ts) and the local
 * Express dev shim (server/dev.ts).
 */

const BB_KEY = process.env.BROWSERBASE_API_KEY ?? ''
const SEARCH_URL = 'https://api.browserbase.com/v1/search'
const FETCH_URL = 'https://api.browserbase.com/v1/fetch'

export interface ResearchFact {
  id: string
  source: string
  sourceUrl: string
  snippet: string
}

export interface ResearchInput {
  queries: string[]
  scrapeUrls?: Array<{ url: string; label: string }>
  maxFacts?: number
}

interface BBSearchResult {
  id: string
  url: string
  title?: string
}

async function bbSearch(query: string, numResults = 3): Promise<BBSearchResult[]> {
  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bb-api-key': BB_KEY },
    body: JSON.stringify({ query: query.slice(0, 200), numResults }),
  })
  if (!res.ok) throw new Error(`Browserbase search failed: ${res.status}`)
  const data = (await res.json()) as { results?: BBSearchResult[] }
  return data.results ?? []
}

async function bbFetch(url: string): Promise<string> {
  const res = await fetch(FETCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bb-api-key': BB_KEY },
    body: JSON.stringify({ url, format: 'markdown', allowRedirects: true }),
  })
  if (!res.ok) throw new Error(`Browserbase fetch failed: ${res.status}`)
  const data = (await res.json()) as { content?: unknown }
  return typeof data.content === 'string' ? data.content : ''
}

/** Strip markdown noise (images, link targets, headings, tables) into prose. */
function cleanMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/[#>*_`|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Run the full Browserbase research pass for one expert: search every query,
 * collect candidate URLs (plus any seed URLs), fetch each, and return snippets.
 */
export async function gatherFacts(input: ResearchInput): Promise<ResearchFact[]> {
  if (!BB_KEY) throw new Error('BROWSERBASE_API_KEY is not set')
  const maxFacts = input.maxFacts ?? 6

  // 1. Search each query → candidate URLs with titles.
  const searchResults = await Promise.allSettled(
    input.queries.slice(0, 3).map((q) => bbSearch(q, 3)),
  )
  const candidates: Array<{ url: string; label: string }> = []
  for (const r of searchResults) {
    if (r.status !== 'fulfilled') continue
    for (const hit of r.value.slice(0, 2)) {
      candidates.push({
        url: hit.url,
        label: hit.title ? `Browserbase Search — ${hit.title}` : hit.url,
      })
    }
  }

  // Include explicit seed URLs (curated per expert) as a reliable baseline.
  for (const s of input.scrapeUrls ?? []) candidates.push(s)

  // Dedupe by URL and cap how many pages we fetch.
  const seen = new Set<string>()
  const toFetch = candidates
    .filter((c) => {
      if (!c.url || seen.has(c.url)) return false
      seen.add(c.url)
      return true
    })
    .slice(0, maxFacts)

  // 2. Fetch each candidate page → snippet.
  const fetched = await Promise.allSettled(
    toFetch.map(async (c): Promise<ResearchFact | null> => {
      const content = cleanMarkdown(await bbFetch(c.url))
      if (content.length < 60) return null
      return {
        id: `bb-${c.url.slice(-32)}`,
        source: c.label,
        sourceUrl: c.url,
        snippet: content.slice(0, 420).trim() + (content.length > 420 ? '…' : ''),
      }
    }),
  )

  const facts: ResearchFact[] = []
  for (const r of fetched) {
    if (r.status === 'fulfilled' && r.value) facts.push(r.value)
  }
  return facts.slice(0, maxFacts)
}
