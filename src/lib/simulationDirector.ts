// Simulation Director — core intelligence engine for GOVWORLD
// Inspired by Stanford HAI "Generative Agents: Interactive Simulacra of Human Behavior" (Park et al., 2023)
// Implements: memory streams, reflection, planning, emergent behavior, and cascading edge cases.
//
// Key contract:
//   runSimulation(options) → Promise<DirectorSimulation>
//
// If Gemini is unavailable, falls back to a *randomised* version of the pre-computed demo data
// so that every call still produces a meaningfully different result.

import type { Citizen } from '@/types/citizen'
import type { Policy } from '@/types/policy'
import type { SimulationTick, SimulationEvent, CitizenUpdate } from '@/types/simulation'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EdgeCaseCategory =
  | 'corruption'
  | 'technical'
  | 'social'
  | 'economic'
  | 'environmental'
  | 'safety'
  | 'political'
  | 'adaptive'
  | 'legal'
  | 'systemic'

export interface EdgeCase {
  id: string
  month: number
  category: EdgeCaseCategory
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  affectedCitizenIds: string[]
  cascadesTo?: string[]     // IDs of edge cases this triggers
  discoveredAt: number      // timestamp (Date.now())
  isResolved: boolean
  resolution?: string
}

export interface CitizenMemoryEvent {
  month: number
  observation: string
  emotionalValence: number  // -1 (trauma) → +1 (relief)
  importance: number        // 0-10
}

export interface CitizenMemory {
  citizenId: string
  events: CitizenMemoryEvent[]
  reflections: string[]   // distilled insights every 3 months
  currentMood: number     // -1 to 1
  adaptations: string[]   // behavioural changes the citizen has made
}

export interface DirectorSimulation {
  runId: string
  seed: string
  ticks: SimulationTick[]
  edgeCases: EdgeCase[]
  citizenMemories: Record<string, CitizenMemory>
  directorSummary: string       // What made this run unique
  riskTrajectory: number[]      // Risk score 0-100 per month (12 entries)
  systemicRisks: string[]       // Major systemic risks that emerged
}

export interface DirectorOptions {
  policy: Policy
  featuredCitizens: Citizen[]
  runSeed?: string               // If omitted, generate random UUID
  monthsToSimulate?: number      // Default 12
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Strip markdown code fences that LLMs sometimes wrap JSON in. */
function stripFences(text: string): string {
  return text
    .replace(/^```[a-z]*\n?/im, '')
    .replace(/\n?```$/im, '')
    .trim()
}

/** Seeded pseudo-random: deterministic but varied between seeds. */
function seededRandom(seed: string, index: number): number {
  // Simple numeric hash of seed + index
  let hash = 0
  const str = seed + String(index)
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return (hash % 10000) / 10000
}

/** Pick `n` random items from an array, seeded. */
function seededPick<T>(arr: T[], n: number, seed: string, offset = 0): T[] {
  const copy = [...arr]
  const result: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(seededRandom(seed, i + offset) * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

// ---------------------------------------------------------------------------
// Gemini prompt builder
// ---------------------------------------------------------------------------

function buildDirectorPrompt(options: DirectorOptions, seed: string): string {
  const { policy, featuredCitizens, monthsToSimulate = 12 } = options

  const citizenBlocks = featuredCitizens.map((c) =>
    `  - ${c.id}: ${c.name}, ${c.age}, ${c.occupation}. Fears: ${c.fears}. Hopes: ${c.hopes}. Family: ${c.familyStructure}.`
  ).join('\n')

  return `POLICY: ${policy.title}
DESCRIPTION: ${policy.description}
BUDGET: $${policy.budget.toLocaleString('en-US')}
LOCATION: ${policy.targetArea}
DURATION: ${monthsToSimulate} months (${policy.plannedStartDate} → ${policy.plannedEndDate})

FEATURED CITIZENS:
${citizenBlocks}

EDGE CASE TAXONOMY — select 4-6 from these categories based on the seed "${seed}":

CORRUPTION: ghost workers on payroll | inflated material invoices | permit delayed for informal payment | substandard materials used to cut costs | contractor colludes with inspector
TECHNICAL: unexpected underground utility found | soil liquefaction risk discovered | groundwater table higher than designed | structural design error found mid-construction | equipment breakdown halting critical path
SOCIAL: community organises protest blocking site access | local media exposes poor conditions | politician uses project as campaign flashpoint | NGO files complaint | residents form monitoring committee
ECONOMIC: key supplier defaults, halting materials | worker wages unpaid, triggering strike | local shop closures cascade into micro-recession | contractor financing collapses | subcontractor walks off
ENVIRONMENTAL: winter storm flooding sweeps materials | archaeological heritage artifact found | protected migratory birds nesting on site | toxic soil discovered from old industrial use | air quality monitoring triggers work halt
SAFETY: worker fatality triggers OSHA investigation | dust-related respiratory illness spike | traffic fatality at unmarked crossing | scaffolding failure injures bystander | child struck by construction vehicle
POLITICAL: upcoming election freezes approvals for 3 weeks | budget reallocation cuts $5M | new mayor demands project review | anti-corruption audit launched | opposition files public interest litigation
ADAPTIVE: community informally widens parallel alley as alternative | street vendors relocate and form new market | residents crowdfund to hire independent engineer inspector | local NGO maps affected households for compensation | displaced workers self-organise for retraining
LEGAL: land boundary dispute freezes Block C | court order halts work pending environmental clearance | worker files wrongful injury suit | contractor files arbitration claim for scope creep | heritage body files injunction

Generate a JSON object with this EXACT structure (no markdown, no explanation — pure JSON only):
{
  "directorSummary": "2-3 sentences on what makes this simulation unique and what systemic risk emerged",
  "systemicRisks": ["3-5 major risks that emerged this run"],
  "riskTrajectory": [<12 integers 0-100, one per month>],
  "edgeCases": [
    {
      "id": "EC001",
      "month": 3,
      "category": "corruption",
      "title": "Ghost Workers Discovered on Payroll",
      "description": "Audit reveals 12 non-existent workers on contractor payroll, $800K diverted",
      "severity": "critical",
      "affectedCitizenIds": ["C002", "C003"],
      "cascadesTo": ["EC002"],
      "isResolved": false
    }
  ],
  "ticks": [
    {
      "month": 1,
      "label": "Month 1 — Excavation begins",
      "constructionProgress": 8,
      "weatherEvent": "Late-summer dry spell — 2 additional workdays gained",
      "citizenUpdates": [
        {
          "citizenId": "C001",
          "newStatus": "amber",
          "narrative": "Route extended by 35 minutes due to diversion...",
          "newPolicyImpact": "Month 1: Route diverted — 35 extra minutes each way.",
          "tick": 1
        }
      ],
      "events": [
        {
          "id": "EVT-1-1",
          "tick": 1,
          "type": "construction",
          "title": "Block A Excavation Begins",
          "description": "...",
          "affectedCitizenIds": ["C001", "C002"],
          "severity": "info"
        }
      ],
      "mapOverlays": [
        {
          "id": "OV-1-1",
          "type": "construction_zone",
          "label": "Block A — Excavation",
          "coordinates": [[19.1100, 72.8650], [19.1136, 72.8697]],
          "color": "#76b900",
          "style": "dashed",
          "visible": true,
          "opacity": 0.8
        }
      ]
    }
  ],
  "citizenMemories": {
    "C001": {
      "citizenId": "C001",
      "events": [
        {"month": 1, "observation": "My route now takes 40 extra minutes", "emotionalValence": -0.6, "importance": 7}
      ],
      "reflections": [],
      "currentMood": -0.4,
      "adaptations": ["Asked neighbour to collect kids 3 days/week"]
    }
  }
}

RULES:
1. Generate exactly ${monthsToSimulate} tick objects, one per month.
2. Each tick must feel DIFFERENT from the demo — do not repeat the same events month-to-month.
3. Edge cases must CASCADE: if ghost workers are found in month 3, the contractor is under scrutiny in months 4-5, then files arbitration in month 7.
4. Citizen memories ACCUMULATE: if a citizen missed school pickup in month 1, their month 2 narrative references it.
5. Citizens REACT TO EACH OTHER: if one citizen closes their shop in month 5, it affects nearby workers.
6. The seed "${seed}" determines your choices — use it to explore a unique corner of the risk space.
7. Every run should surface at least one edge case the government didn't anticipate.
8. Risk trajectory must show realistic variation — not just linear increase.
9. All citizenUpdates must include the "tick" and "newPolicyImpact" fields.
10. mapOverlays must include "style" and "opacity" fields.`
}

// ---------------------------------------------------------------------------
// Fallback: randomised version of pre-computed demo data
// ---------------------------------------------------------------------------

/** Edge case templates used to generate varied fallback results */
const EDGE_CASE_TEMPLATES: Omit<EdgeCase, 'id' | 'month' | 'discoveredAt'>[] = [
  {
    category: 'corruption',
    title: 'Ghost Workers on Contractor Payroll',
    description: 'Internal audit flags 8 non-existent workers on Bay Area Infrastructure payroll. $180,000 in fraudulent wages identified over 3 months.',
    severity: 'critical',
    affectedCitizenIds: ['C002', 'C003'],
    isResolved: false,
  },
  {
    category: 'technical',
    title: 'Unexpected Utility Conflict at Block B',
    description: 'Excavation uncovers unmapped BSNL fibre bundle and TATA Power cables 0.8m below surface. Block B halted for 11 working days.',
    severity: 'warning',
    affectedCitizenIds: ['C001', 'C004'],
    isResolved: false,
  },
  {
    category: 'social',
    title: 'Residents Form Monitoring Committee',
    description: 'Twelve affected households form the Van Ness Corridor Citizens Watch. They demand weekly progress updates and a dedicated grievance hotline.',
    severity: 'info',
    affectedCitizenIds: ['C002', 'C005'],
    isResolved: true,
    resolution: 'Municipal corporation agreed to bi-weekly town halls.',
  },
  {
    category: 'safety',
    title: 'Dust-Related Illness Spike at Local School',
    description: 'School health records show 23% rise in respiratory complaints. Pollution board issues a formal notice. Wet-sweeping mandate issued.',
    severity: 'warning',
    affectedCitizenIds: ['C005'],
    isResolved: false,
  },
  {
    category: 'political',
    title: 'Pre-Election Approval Freeze',
    description: 'Municipal elections announced — all new contractor sub-awards frozen for 3 weeks pending Model Code of Conduct compliance.',
    severity: 'warning',
    affectedCitizenIds: [],
    isResolved: true,
    resolution: 'Freeze lifted after election notification period ended.',
  },
  {
    category: 'economic',
    title: 'Local Business Micro-Recession',
    description: 'Five shops along the affected stretch report revenue declines of 40-70%. Two have given notice to vacate. Risk of permanent closures identified.',
    severity: 'critical',
    affectedCitizenIds: ['C002'],
    isResolved: false,
  },
  {
    category: 'legal',
    title: 'Land Boundary Dispute Halts Block C',
    description: 'Property owner files complaint alleging 1.2m encroachment on private land. District court issues stay order pending survey.',
    severity: 'critical',
    affectedCitizenIds: ['C002', 'C006'],
    isResolved: false,
  },
  {
    category: 'environmental',
    title: 'Winter Storm Flooding Damages Site',
    description: 'Unseasonal heavy rainfall sweeps loose gravel and construction debris into storm drains. MCGM issues environmental notice. 6 workdays lost.',
    severity: 'warning',
    affectedCitizenIds: ['C004', 'C005'],
    isResolved: true,
    resolution: 'Temporary drainage bunds installed. Work resumed after drainage clearance.',
  },
  {
    category: 'adaptive',
    title: 'Informal Alley Widened by Community',
    description: 'Residents of Van Ness corridor collaboratively clear a 2m-wide alley behind shops, creating an informal pedestrian bypass. Footfall partially restored.',
    severity: 'info',
    affectedCitizenIds: ['C002', 'C004'],
    isResolved: true,
    resolution: 'Community-driven solution; municipality agreed to pave the alley post-construction.',
  },
  {
    category: 'systemic',
    title: 'Cascading Project Delays — 6-Week Slippage',
    description: 'Combination of winter storm delays, utility conflict, and contractor staff absence pushes overall timeline out by 6 weeks. Budget buffer consumed.',
    severity: 'critical',
    affectedCitizenIds: ['C001', 'C002', 'C003', 'C004'],
    isResolved: false,
  },
]

const SUMMARY_TEMPLATES = [
  'This run is defined by a corruption-to-legal cascade: ghost workers trigger an audit, leading to a court challenge that halts Block C. The systemic risk that emerged is institutional capture of the contractor oversight mechanism.',
  'A technical utility conflict in Month 3 compresses the project timeline, forcing a political trade-off between safety and speed. The systemic risk is that rushed re-routing creates a hidden safety liability that surfaces post-completion.',
  'Social mobilisation drives this run — a citizens committee formed in Month 2 creates accountability pressure that paradoxically slows construction but improves quality. The emergent risk is elite capture of the monitoring process.',
  'Environmental and economic pressures intersect: winter storm damage triggers business closures which fuel political pressure for accelerated, unsafe construction. The systemic risk is a positive-feedback loop between weather and budget erosion.',
  'Adaptive community behaviour is the hallmark of this run: informal solutions emerge faster than official ones, but they create legal ambiguity about ownership and maintenance responsibility after project completion.',
]

const SYSTEMIC_RISK_POOL = [
  'Contractor financial instability — two undisclosed loans against project revenue discovered',
  'Material supply chain fragility — single supplier for bitumen creates single point of failure',
  'Worker welfare gap — no formal dispute mechanism for 47 daily-wage labourers',
  'Community information asymmetry — 60% of affected residents unaware of appeal process',
  'Budget contingency exhausted by Month 7 — no buffer for final stretch',
  'Parallel road diversions creating informal settlements risk',
  'Groundwater contamination from construction runoff unmonitored',
  'Political pressure driving unsafe pace of work in final 2 months',
  'Contractor history of using substandard materials in previous MCGM projects',
  'Inspector co-location with contractor offices creating conflict of interest',
]

/** Vary construction progress ±5% per tick around the expected value */
function varyProgress(base: number, seed: string, month: number): number {
  const variation = (seededRandom(seed, month * 17 + 3) - 0.5) * 10
  return Math.min(100, Math.max(0, Math.round(base + variation)))
}

/** Generate a narrative variation using the seed */
function varyNarrative(base: string, seed: string, citizenId: string, month: number): string {
  // Append one of several tonal modifiers based on seed
  const modifiers = [
    ' The situation feels more precarious than last month.',
    ' There are signs things may improve soon.',
    ' Community members are starting to organise.',
    ' The construction crews have been working longer hours.',
    ' Dust and noise have been particularly bad this week.',
    ' A small sense of normalcy has returned in the evenings.',
  ]
  const idx = Math.floor(seededRandom(seed, citizenId.charCodeAt(citizenId.length - 1) + month) * modifiers.length)
  return base + modifiers[idx]
}

async function generateFallbackSimulation(options: DirectorOptions, seed: string): Promise<DirectorSimulation> {
  // Load pre-computed ticks as the base
  const baseMod = await import('@/data/demo_simulation_ticks.json')
  const baseTicks: SimulationTick[] = baseMod.default as unknown as SimulationTick[]

  // Select 4 edge case templates based on seed
  const selectedTemplates = seededPick(EDGE_CASE_TEMPLATES, 4, seed)

  // Assign them to varied months
  const monthPool = [2, 3, 4, 5, 6, 7, 8, 9, 10]
  const selectedMonths = seededPick(monthPool, 4, seed, 100)

  const edgeCases: EdgeCase[] = selectedTemplates.map((tpl, i) => ({
    ...tpl,
    id: `EC${String(i + 1).padStart(3, '0')}`,
    month: selectedMonths[i],
    discoveredAt: Date.now(),
    cascadesTo: i < selectedTemplates.length - 1 ? [`EC${String(i + 2).padStart(3, '0')}`] : undefined,
  }))

  // Vary the ticks
  const ticks: SimulationTick[] = baseTicks.map((tick) => ({
    ...tick,
    constructionProgress: varyProgress(tick.constructionProgress, seed, tick.month),
    citizenUpdates: tick.citizenUpdates.map((cu) => ({
      ...cu,
      narrative: varyNarrative(cu.narrative, seed, cu.citizenId, tick.month),
    })),
  }))

  // Build citizen memories from the tick data
  const citizenMemories: Record<string, CitizenMemory> = {}
  const featuredIds = options.featuredCitizens.map((c) => c.id)

  for (const cid of featuredIds) {
    const events: CitizenMemoryEvent[] = []
    ticks.forEach((tick) => {
      const update = tick.citizenUpdates.find((u) => u.citizenId === cid)
      if (update) {
        const valence = update.newStatus === 'green' ? 0.6
          : update.newStatus === 'amber' ? -0.3
          : update.newStatus === 'red' ? -0.8
          : -0.5
        events.push({
          month: tick.month,
          observation: update.narrative,
          emotionalValence: valence + (seededRandom(seed, tick.month + cid.charCodeAt(1)) - 0.5) * 0.2,
          importance: Math.round(4 + seededRandom(seed, tick.month * 3 + cid.charCodeAt(1)) * 6),
        })
      }
    })

    const allCitizenUpdates = ticks
      .flatMap((t) => t.citizenUpdates)
      .filter((u) => u.citizenId === cid)
    const lastUpdate = allCitizenUpdates[allCitizenUpdates.length - 1]

    const moodFromStatus = lastUpdate?.newStatus === 'green' ? 0.5
      : lastUpdate?.newStatus === 'amber' ? -0.2
      : lastUpdate?.newStatus === 'red' ? -0.7
      : -0.4

    citizenMemories[cid] = {
      citizenId: cid,
      events,
      reflections: events.length >= 3
        ? [`After ${Math.floor(events.length / 3) * 3} months of disruption, I have had to adapt my daily routine significantly.`]
        : [],
      currentMood: moodFromStatus,
      adaptations: events.length > 2
        ? ['Adjusted daily commute timing to avoid peak construction hours', 'Joined local residents\' WhatsApp group for construction updates']
        : [],
    }
  }

  // Select systemic risks based on seed
  const systemicRisks = seededPick(SYSTEMIC_RISK_POOL, 3, seed, 200)

  // Build a varied risk trajectory
  const baseTrajectory = [15, 25, 40, 55, 60, 65, 58, 50, 45, 55, 40, 20]
  const riskTrajectory = baseTrajectory.map((base, i) =>
    Math.min(100, Math.max(0, Math.round(base + (seededRandom(seed, i * 7 + 5) - 0.5) * 20)))
  )

  // Pick a summary based on seed
  const summaryIdx = Math.floor(seededRandom(seed, 999) * SUMMARY_TEMPLATES.length)

  return {
    runId: crypto.randomUUID(),
    seed,
    ticks,
    edgeCases,
    citizenMemories,
    directorSummary: SUMMARY_TEMPLATES[summaryIdx],
    riskTrajectory,
    systemicRisks,
  }
}

// ---------------------------------------------------------------------------
// Gemini-based live simulation
// ---------------------------------------------------------------------------

async function generateLiveSimulation(options: DirectorOptions, seed: string): Promise<DirectorSimulation> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are a Generative Policy Simulation Director for a living city model.
Architecture based on Stanford HAI Generative Agents (Park et al., 2023):
- Citizens have memory streams that influence future behaviour
- Events cascade: small problems compound into systemic failures
- Each simulation run MUST be genuinely different from others

SIMULATION RUN SEED: ${seed}
This seed determines which edge case category intersections to explore.
You MUST use the seed to pick DIFFERENT combinations of edge cases.

Output ONLY a single valid JSON object with no markdown fences.`,
  })

  const userPrompt = buildDirectorPrompt(options, seed)
  const result = await model.generateContent(userPrompt)
  const raw = result.response.text()
  const clean = stripFences(raw)

  // Parse and validate
  const parsed = JSON.parse(clean) as {
    directorSummary: string
    systemicRisks: string[]
    riskTrajectory: number[]
    edgeCases: Array<Omit<EdgeCase, 'discoveredAt'>>
    ticks: SimulationTick[]
    citizenMemories: Record<string, CitizenMemory>
  }

  // Stamp discoveredAt on edge cases (not in LLM output)
  const edgeCases: EdgeCase[] = parsed.edgeCases.map((ec) => ({
    ...ec,
    discoveredAt: Date.now(),
  }))

  return {
    runId: crypto.randomUUID(),
    seed,
    ticks: parsed.ticks,
    edgeCases,
    citizenMemories: parsed.citizenMemories ?? {},
    directorSummary: parsed.directorSummary ?? '',
    riskTrajectory: parsed.riskTrajectory ?? [],
    systemicRisks: parsed.systemicRisks ?? [],
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function runSimulation(options: DirectorOptions): Promise<DirectorSimulation> {
  const seed = options.runSeed ?? crypto.randomUUID()

  // In DEMO_MODE or SKIP_API, skip Gemini entirely
  const skipApi =
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_SKIP_API === 'true'

  if (!skipApi) {
    try {
      return await generateLiveSimulation(options, seed)
    } catch (err) {
      console.warn('[SimulationDirector] Gemini call failed, falling back to randomised pre-computed data:', err)
    }
  }

  // Fallback: varied version of pre-computed demo data
  return generateFallbackSimulation(options, seed)
}
