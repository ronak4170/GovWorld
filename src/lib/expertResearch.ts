/**
 * Expert sector research — gathers real-world facts via public web sources
 * (Wikipedia API, DuckDuckGo, and page scraping) before debate arguments.
 */

export interface ResearchFact {
  id: string
  source: string
  sourceUrl: string
  snippet: string
}

export interface ExpertResearchResult {
  expertId: string
  facts: ResearchFact[]
  researchedAt: number
}

const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  import.meta.env.VITE_SKIP_API === 'true'

const EXPERT_RESEARCH_CONFIG: Record<
  string,
  { queries: string[]; scrapeUrls: Array<{ url: string; label: string }> }
> = {
  economist: {
    queries: [
      'San Francisco Van Ness BRT economic impact transit corridor',
      'complete streets economic return on investment small business',
    ],
    scrapeUrls: [
      { url: 'https://en.wikipedia.org/wiki/Van_Ness_Avenue', label: 'Wikipedia — Van Ness Avenue' },
      { url: 'https://en.wikipedia.org/wiki/Bus_rapid_transit', label: 'Wikipedia — Bus Rapid Transit' },
    ],
  },
  advocate: {
    queries: [
      'San Francisco small business displacement construction impact',
      'Van Ness corridor community impact Tenderloin Mission District',
    ],
    scrapeUrls: [
      { url: 'https://en.wikipedia.org/wiki/Tenderloin,_San_Francisco', label: 'Wikipedia — Tenderloin SF' },
      { url: 'https://en.wikipedia.org/wiki/Mission_District,_San_Francisco', label: 'Wikipedia — Mission District' },
    ],
  },
  engineer: {
    queries: [
      'San Francisco seismic construction risk liquefaction zones',
      'Van Ness utility relocation underground infrastructure SF',
    ],
    scrapeUrls: [
      { url: 'https://en.wikipedia.org/wiki/1906_San_Francisco_earthquake', label: 'Wikipedia — 1906 SF Earthquake' },
      { url: 'https://en.wikipedia.org/wiki/Road', label: 'Wikipedia — Road Design' },
    ],
  },
  watchdog: {
    queries: [
      'San Francisco DPW contractor fraud cost overrun public works',
      'infrastructure project procurement irregularities California',
    ],
    scrapeUrls: [
      { url: 'https://en.wikipedia.org/wiki/Government_procurement', label: 'Wikipedia — Government Procurement' },
      { url: 'https://en.wikipedia.org/wiki/San_Francisco_Public_Works', label: 'Wikipedia — SF Public Works' },
    ],
  },
  climate: {
    queries: [
      'construction air pollution PM2.5 health impact San Francisco Bay Area',
      'urban heat island complete streets green infrastructure',
    ],
    scrapeUrls: [
      { url: 'https://en.wikipedia.org/wiki/Air_pollution', label: 'Wikipedia — Air Pollution' },
      { url: 'https://en.wikipedia.org/wiki/Induced_demand', label: 'Wikipedia — Induced Demand' },
    ],
  },
  lawyer: {
    queries: ['California CEQA environmental review infrastructure', 'San Francisco ADA sidewalk construction requirements'],
    scrapeUrls: [{ url: 'https://en.wikipedia.org/wiki/California_Environmental_Quality_Act', label: 'Wikipedia — CEQA' }],
  },
  urbanplanner: {
    queries: ['San Francisco General Plan transit first policy urban planning'],
    scrapeUrls: [{ url: 'https://en.wikipedia.org/wiki/San_Francisco_Municipal_Transportation_Agency', label: 'Wikipedia — SFMTA' }],
  },
  health: {
    queries: ['construction dust PM2.5 respiratory health urban San Francisco'],
    scrapeUrls: [{ url: 'https://en.wikipedia.org/wiki/Particulates', label: 'Wikipedia — Particulates' }],
  },
  transport: {
    queries: ['San Francisco Van Ness Muni bus rapid transit traffic flow'],
    scrapeUrls: [{ url: 'https://en.wikipedia.org/wiki/Traffic_flow', label: 'Wikipedia — Traffic Flow' }],
  },
  heritage: {
    queries: ['San Francisco Victorian Edwardian heritage buildings Van Ness corridor'],
    scrapeUrls: [{ url: 'https://en.wikipedia.org/wiki/San_Francisco_Heritage', label: 'Wikipedia — SF Heritage' }],
  },
}

async function fetchWithTimeout(url: string, init?: RequestInit, ms = 9000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function searchWikipedia(query: string): Promise<ResearchFact[]> {
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=2`
    const res = await fetchWithTimeout(searchUrl)
    if (!res.ok) return []
    const data = await res.json()
    const hits: Array<{ title: string }> = data.query?.search ?? []
    const facts: ResearchFact[] = []

    for (const hit of hits.slice(0, 2)) {
      const extractUrl =
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext` +
        `&titles=${encodeURIComponent(hit.title)}&format=json&origin=*`
      const er = await fetchWithTimeout(extractUrl)
      if (!er.ok) continue
      const ed = await er.json()
      const pages = ed.query?.pages ?? {}
      const page = Object.values(pages)[0] as { extract?: string; title?: string }
      if (!page?.extract) continue
      facts.push({
        id: `wiki-${hit.title}`,
        source: `Wikipedia — ${hit.title}`,
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
        snippet: page.extract.slice(0, 380).trim() + (page.extract.length > 380 ? '…' : ''),
      })
    }
    return facts
  } catch {
    return []
  }
}

async function searchDuckDuckGo(query: string): Promise<ResearchFact[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const data = await res.json()
    const facts: ResearchFact[] = []

    if (data.AbstractText) {
      facts.push({
        id: `ddg-${query.slice(0, 20)}`,
        source: data.AbstractSource ? `DuckDuckGo — ${data.AbstractSource}` : 'DuckDuckGo Knowledge',
        sourceUrl: data.AbstractURL || 'https://duckduckgo.com',
        snippet: String(data.AbstractText).slice(0, 380),
      })
    }

    const topics = (data.RelatedTopics ?? []) as Array<{ Text?: string; FirstURL?: string }>
    for (const t of topics.slice(0, 2)) {
      if (t.Text) {
        facts.push({
          id: `ddg-rel-${facts.length}`,
          source: 'DuckDuckGo Related',
          sourceUrl: t.FirstURL || 'https://duckduckgo.com',
          snippet: t.Text.slice(0, 300),
        })
      }
    }
    return facts
  } catch {
    return []
  }
}

async function scrapePage(url: string, label: string): Promise<ResearchFact | null> {
  try {
    const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
    })
    if (!res.ok) return null
    const raw = await res.text()
    const cleaned = raw
      .replace(/^Title:.*\n/m, '')
      .replace(/^URL Source:.*\n/m, '')
      .replace(/^Markdown Content:\n/m, '')
      .replace(/\n+/g, ' ')
      .trim()
    if (cleaned.length < 40) return null
    return {
      id: `scrape-${url.slice(-30)}`,
      source: label,
      sourceUrl: url,
      snippet: cleaned.slice(0, 420).trim() + (cleaned.length > 420 ? '…' : ''),
    }
  } catch {
    return null
  }
}

function dedupeFacts(facts: ResearchFact[]): ResearchFact[] {
  const seen = new Set<string>()
  return facts.filter((f) => {
    const key = f.snippet.slice(0, 60).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return f.snippet.length > 30
  })
}

function buildPolicyQuery(policyText: string): string {
  const line = policyText.split('\n').find((l) => l.trim().length > 10) ?? policyText
  return line.replace(/\s+/g, ' ').trim().slice(0, 80)
}

async function loadDemoResearch(expertId: string): Promise<ResearchFact[]> {
  const mod = await import('@/data/demo_expert_research.json')
  const data = mod.default as Record<string, ResearchFact[]>
  return data[expertId] ?? data.economist ?? []
}

export async function gatherExpertResearch(
  expertId: string,
  policyText: string,
): Promise<ExpertResearchResult> {
  if (DEMO_MODE) {
    return { expertId, facts: await loadDemoResearch(expertId), researchedAt: Date.now() }
  }

  const config = EXPERT_RESEARCH_CONFIG[expertId] ?? EXPERT_RESEARCH_CONFIG.economist
  const policyQuery = buildPolicyQuery(policyText)

  const wikiPromises = config.queries.map((q) => searchWikipedia(`${q} ${policyQuery}`))
  const ddgPromises = config.queries.slice(0, 1).map((q) => searchDuckDuckGo(`${q} San Francisco California`))
  const scrapePromises = config.scrapeUrls.slice(0, 2).map(({ url, label }) => scrapePage(url, label))

  const results = await Promise.allSettled([...wikiPromises, ...ddgPromises, ...scrapePromises])

  const allFacts: ResearchFact[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (Array.isArray(r.value)) allFacts.push(...r.value)
      else if (r.value) allFacts.push(r.value)
    }
  }

  const facts = dedupeFacts(allFacts).slice(0, 6)
  if (facts.length === 0) {
    return { expertId, facts: await loadDemoResearch(expertId), researchedAt: Date.now() }
  }

  return { expertId, facts, researchedAt: Date.now() }
}

export function formatResearchForPrompt(facts: ResearchFact[]): string {
  if (facts.length === 0) return 'No live research available — use your professional knowledge.'
  return facts
    .map((f, i) => `[FACT ${i + 1}] (${f.source})\n${f.snippet}\nSource: ${f.sourceUrl}`)
    .join('\n\n')
}

export function factsToCitedEvidence(facts: ResearchFact[]): string[] {
  return facts.slice(0, 4).map((f) => `${f.source}: ${f.snippet.slice(0, 120)}…`)
}
