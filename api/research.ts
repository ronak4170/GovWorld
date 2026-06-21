/**
 * Vercel serverless function: POST /api/research
 * Powers the council experts' web research via the Browserbase platform.
 *
 * Request body: { queries: string[], scrapeUrls?: {url,label}[], maxFacts?: number }
 * Response:      { facts: ResearchFact[] }
 *
 * The Browserbase API key lives only here (server-side) — never in the browser.
 */
import { gatherFacts, type ResearchInput } from './_browserbase'

interface ReqLike {
  method?: string
  body?: unknown
}
interface ResLike {
  status: (code: number) => ResLike
  json: (body: unknown) => void
  setHeader?: (name: string, value: string) => void
}

export default async function handler(req: ReqLike, res: ResLike): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as
      | ResearchInput
      | undefined

    if (!body || !Array.isArray(body.queries) || body.queries.length === 0) {
      res.status(400).json({ error: 'queries[] is required' })
      return
    }

    const facts = await gatherFacts({
      queries: body.queries,
      scrapeUrls: body.scrapeUrls,
      maxFacts: body.maxFacts,
    })
    res.status(200).json({ facts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(502).json({ error: `Browserbase research failed: ${message}`, facts: [] })
  }
}
