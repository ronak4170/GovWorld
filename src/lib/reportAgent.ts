// MiroFish: report_agent (LangChain ReACT + Zep tools).
// Plans an outline, then generates each section while "calling tools" against the
// knowledge graph and the swarm simulation — producing a prediction report.
// Deterministic synthesis keeps it offline-capable.

import type {
  KnowledgeGraph,
  SwarmRound,
  PredictionReport,
  ReportSection,
  ReportToolCall,
  Sentiment,
} from '@/types/swarm'
import { aggregateSentiment } from '@/lib/swarmSimulation'
import { generateReportSectionContent } from '@/lib/llm'

function totalSentiment(rounds: SwarmRound[]) {
  const t = { positive: 0, neutral: 0, negative: 0 }
  for (const r of rounds) {
    t.positive += r.sentimentBreakdown.positive
    t.neutral += r.sentimentBreakdown.neutral
    t.negative += r.sentimentBreakdown.negative
  }
  return t
}

function topThemes(rounds: SwarmRound[]): string[] {
  const freq = new Map<string, number>()
  for (const r of rounds) for (const th of r.emergentThemes) freq.set(th, (freq.get(th) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 5)
}

function riskScore(sentiment: Sentiment, themes: string[]): number {
  let base = sentiment === 'negative' ? 8 : sentiment === 'neutral' ? 6 : 4
  if (themes.includes('Contractor delays')) base += 1
  if (themes.includes('Air & noise pollution')) base += 0.5
  return Math.min(10, Math.round(base))
}

export function generateReport(graph: KnowledgeGraph, rounds: SwarmRound[]): PredictionReport {
  const sentiment = aggregateSentiment(rounds)
  const themes = topThemes(rounds)
  const totals = totalSentiment(rounds)
  const score = riskScore(sentiment, themes)

  const outline = [
    'Executive summary',
    'Public sentiment trajectory',
    'Most affected groups',
    'Emergent risks & flashpoints',
    'Recommendations',
  ]

  const negShare = Math.round(
    (totals.negative / Math.max(1, totals.positive + totals.neutral + totals.negative)) * 100,
  )

  const sections: ReportSection[] = [
    {
      title: 'Executive summary',
      toolCalls: [tool('panorama', 'overall simulation state', `${graph.nodes.length} agents simulated across ${rounds.length} rounds; net sentiment ${sentiment}.`)],
      content: `Across ${rounds.length} simulation rounds and ${graph.nodes.length} interacting agents, collective opinion on the Van Ness Complete Streets project trends **${sentiment}** (${negShare}% of posts negative at peak). The dominant fault lines are ${themes.slice(0, 3).join(', ').toLowerCase()}. Overall risk score: **${score}/10**.`,
    },
    {
      title: 'Public sentiment trajectory',
      toolCalls: [tool('sentiment_scan', 'per-round sentiment', rounds.map((r) => `${r.label}: +${r.sentimentBreakdown.positive}/~${r.sentimentBreakdown.neutral}/-${r.sentimentBreakdown.negative}`).join(' | '))],
      content: `Sentiment starts cautious at announcement, deteriorates sharply through the storm-delay and peak-disruption phases, then recovers once Block A reopens and the corridor nears completion. The recovery is real but does **not** fully erase the trust damage caused by contractor delays.`,
    },
    {
      title: 'Most affected groups',
      toolCalls: [tool('graph_search', 'highest-impact entities', identifyAffected(graph).join('; '))],
      content: `Shopkeepers along the frontage and parents/teachers in the school zone report the most acute, sustained harm. Cyclists face a safety cliff after the lane removal. Retired and mobility-limited residents are the clearest **beneficiaries** once clinic access improves.`,
    },
    {
      title: 'Emergent risks & flashpoints',
      toolCalls: [tool('agent_interview', 'interview negative-sentiment agents', 'Recurring demand: accountability for contractor delays and dust mitigation near the school.')],
      content: themes.map((t) => `- **${t}** — surfaced repeatedly and amplified by NGO and media accounts.`).join('\n'),
    },
    {
      title: 'Recommendations',
      toolCalls: [tool('panorama', 'mitigation levers', 'Phasing, dust screens, cyclist diversion, transparent contractor reporting.')],
      content: `1. Publish a public contractor scorecard with live milestone tracking.\n2. Install dust screens and restrict heavy work during school hours.\n3. Provide a protected interim cycle diversion before removing the lane.\n4. Offer rent/▼revenue relief to frontage businesses during peak disruption.\n5. Pre-commit a winter storm contingency schedule to avoid repeat delays.`,
    },
  ]

  const keyPredictions = [
    `Net public sentiment will be ${sentiment} overall, peaking negative around mid-construction.`,
    `${themes[0] ?? 'Disruption'} will be the defining political flashpoint.`,
    `Contractor delay coverage will drive a measurable trust dip that recovery only partially repairs.`,
    `Beneficiary groups (clinic access, emergency response) will become vocal advocates only after completion.`,
  ]

  return {
    id: `report_${Date.now().toString(36)}`,
    title: 'Prediction Report — Van Ness Complete Streets',
    outline,
    sections,
    overallSentiment: sentiment,
    riskScore: score,
    keyPredictions,
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Live (LLM) streaming report — each section's prose is written by Gemini using
// the simulation context; tool-call traces remain deterministic. Falls back to
// the deterministic content per-section. onSection fires after each section so
// the UI can stream it in.
// ---------------------------------------------------------------------------

function reportContext(graph: KnowledgeGraph, rounds: SwarmRound[]): string {
  const totals = totalSentiment(rounds)
  const themes = topThemes(rounds)
  const perRound = rounds
    .map((r) => `${r.label}: +${r.sentimentBreakdown.positive}/~${r.sentimentBreakdown.neutral}/-${r.sentimentBreakdown.negative} [${r.emergentThemes.join(', ')}]`)
    .join('\n')
  return `Agents simulated: ${graph.nodes.length}; rounds: ${rounds.length}.
Sentiment totals — positive:${totals.positive} neutral:${totals.neutral} negative:${totals.negative}.
Top themes: ${themes.join(', ')}.
Per-round sentiment & themes:
${perRound}`
}

export async function generateReportLive(
  graph: KnowledgeGraph,
  rounds: SwarmRound[],
  onSection?: (report: PredictionReport) => void,
): Promise<PredictionReport> {
  // Start from the deterministic skeleton (outline, tool calls, predictions, score).
  const base = generateReport(graph, rounds)
  const context = reportContext(graph, rounds)
  const sections: ReportSection[] = []

  for (const det of base.sections) {
    let content = det.content
    try {
      content = await generateReportSectionContent({ title: det.title, context })
    } catch {
      // keep deterministic content
    }
    sections.push({ ...det, content })
    if (onSection) onSection({ ...base, sections: [...sections] })
  }

  return { ...base, sections }
}

function tool(t: ReportToolCall['tool'], query: string, result: string): ReportToolCall {
  return { tool: t, query, result }
}

function identifyAffected(graph: KnowledgeGraph): string[] {
  const counts = new Map<string, number>()
  for (const n of graph.nodes) counts.set(n.type, (counts.get(n.type) ?? 0) + 1)
  return [...counts.entries()].map(([t, c]) => `${t} (${c})`)
}
