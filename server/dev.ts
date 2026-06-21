/**
 * Local dev shim — serves the Browserbase research endpoint that Vercel runs as
 * a serverless function in production (api/research.ts). Lets `npm run dev` work
 * end-to-end without the Vercel CLI. Vite proxies /api → this server (port 3001).
 *
 * Run: npm run dev:api   (or `npm run dev:full` to run Vite + this together)
 */
import express from 'express'
import { gatherFacts } from '../api/_browserbase'

const PORT = Number(process.env.RESEARCH_PORT ?? 3001)
const app = express()
app.use(express.json({ limit: '1mb' }))

app.post('/api/research', async (req, res) => {
  const body = req.body ?? {}
  if (!Array.isArray(body.queries) || body.queries.length === 0) {
    res.status(400).json({ error: 'queries[] is required' })
    return
  }
  try {
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
})

app.listen(PORT, () => {
  const hasKey = Boolean(process.env.BROWSERBASE_API_KEY)
  console.log(`[browserbase-dev] research API on http://localhost:${PORT}/api/research`)
  if (!hasKey) console.warn('[browserbase-dev] WARNING: BROWSERBASE_API_KEY not set — requests will 502')
})
