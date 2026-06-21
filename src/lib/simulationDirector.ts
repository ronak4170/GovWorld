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

EDGE CASE TAXONOMY — select 6-8 from these categories based on the seed "${seed}" (vary the mix every run):

CORRUPTION: ghost workers on payroll | inflated material invoices | permit delayed for informal payment | substandard materials used to cut costs | contractor colludes with inspector
TECHNICAL: unexpected underground utility found | soil liquefaction risk discovered | groundwater table higher than designed | structural design error found mid-construction | equipment breakdown halting critical path
SOCIAL: community organises protest blocking site access | local media exposes poor conditions | politician uses project as campaign flashpoint | NGO files complaint | residents form monitoring committee
ECONOMIC: key supplier defaults, halting materials | worker wages unpaid, triggering strike | local shop closures cascade into micro-recession | contractor financing collapses | subcontractor walks off
ENVIRONMENTAL: winter storm flooding sweeps materials | archaeological heritage artifact found | protected migratory birds nesting on site | toxic soil discovered from old industrial use | air quality monitoring triggers work halt
SAFETY: worker fatality triggers OSHA investigation | dust-related respiratory illness spike | traffic fatality at unmarked crossing | scaffolding failure injures bystander | child struck by construction vehicle
POLITICAL: upcoming election freezes approvals for 3 weeks | budget reallocation cuts $5M | new mayor demands project review | anti-corruption audit launched | opposition files public interest litigation
ADAPTIVE: community informally widens parallel alley as alternative | street vendors relocate and form new market | residents crowdfund to hire independent engineer inspector | local NGO maps affected households for compensation | displaced workers self-organise for retraining
LEGAL: land boundary dispute freezes Block C | court order halts work pending CEQA review | worker files wrongful injury suit | contractor files arbitration claim for scope creep | ADA noncompliance suit over interim sidewalks
SYSTEMIC: cascading delays consume the budget buffer | contingency exhausted before final stretch | single-bid procurement removes cost control | no independent milestone verification before payment

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

/** Edge case templates used to generate varied fallback results.
 *  Pool is intentionally large and spans every category so each re-roll
 *  surfaces a different combination. */
const EDGE_CASE_TEMPLATES: Omit<EdgeCase, 'id' | 'month' | 'discoveredAt'>[] = [
  // ── Corruption ──────────────────────────────────────────────
  {
    category: 'corruption',
    title: 'Ghost Workers on Contractor Payroll',
    description: 'Internal audit flags 8 non-existent workers on Bay Area Infrastructure Inc. payroll. $180,000 in fraudulent wages identified over 3 months.',
    severity: 'critical',
    affectedCitizenIds: ['C002', 'C003'],
    isResolved: false,
  },
  {
    category: 'corruption',
    title: 'Inflated Material Invoices Uncovered',
    description: 'Forensic accounting finds aggregate and rebar billed 32% above market rate across Blocks A–B. Estimated $1.2M overcharge under DA review.',
    severity: 'critical',
    affectedCitizenIds: ['C003'],
    isResolved: false,
  },
  {
    category: 'corruption',
    title: 'Inspector Conflict of Interest Flagged',
    description: 'Ethics Commission learns the lead site inspector previously consulted for the prime contractor. All Block A sign-offs ordered re-reviewed.',
    severity: 'warning',
    affectedCitizenIds: ['C003'],
    isResolved: false,
  },
  // ── Technical ───────────────────────────────────────────────
  {
    category: 'technical',
    title: 'Unexpected Utility Conflict at Block B',
    description: 'Excavation uncovers an unmapped AT&T fiber bundle and PG&E power cables 0.8m below surface. Block B halted for 11 working days.',
    severity: 'warning',
    affectedCitizenIds: ['C001', 'C004'],
    isResolved: false,
  },
  {
    category: 'technical',
    title: 'Soil Liquefaction Risk Discovered',
    description: 'Geotech cores reveal Block C sits on bay-fill prone to liquefaction. Foundation design must be revised; +$2.1M and a 4-week redesign.',
    severity: 'critical',
    affectedCitizenIds: ['C003', 'C006'],
    isResolved: false,
  },
  {
    category: 'technical',
    title: 'Groundwater Higher Than Designed',
    description: 'Trench dewatering pumps run 24/7 after the water table is found 1.5m above survey. Schedule slips and utility costs climb.',
    severity: 'warning',
    affectedCitizenIds: ['C004'],
    isResolved: true,
    resolution: 'Wellpoint dewatering system installed; trenching resumed.',
  },
  // ── Social ──────────────────────────────────────────────────
  {
    category: 'social',
    title: 'Residents Form Monitoring Committee',
    description: 'Twelve affected households form the Van Ness Corridor Citizens Watch, demanding weekly progress updates and a dedicated grievance hotline.',
    severity: 'info',
    affectedCitizenIds: ['C002', 'C005'],
    isResolved: true,
    resolution: 'SF Public Works agreed to bi-weekly town halls.',
  },
  {
    category: 'social',
    title: 'Local Media Exposes Site Conditions',
    description: 'A San Francisco Chronicle investigation runs photos of exposed trenches near the school. Public pressure forces an emergency safety audit.',
    severity: 'warning',
    affectedCitizenIds: ['C005', 'C002'],
    isResolved: false,
  },
  {
    category: 'social',
    title: 'Protest Blocks Site Access',
    description: 'Cyclist-safety advocates stage a sit-in after the bike lane is removed without an interim diversion. Work paused at the south staging area.',
    severity: 'warning',
    affectedCitizenIds: ['C006'],
    isResolved: false,
  },
  // ── Economic ────────────────────────────────────────────────
  {
    category: 'economic',
    title: 'Local Business Micro-Recession',
    description: 'Five storefronts along the corridor report revenue down 40–70%. Two have given notice to vacate. Risk of permanent closures identified.',
    severity: 'critical',
    affectedCitizenIds: ['C002'],
    isResolved: false,
  },
  {
    category: 'economic',
    title: 'Key Aggregate Supplier Defaults',
    description: 'The sole regional aggregate supplier files for bankruptcy mid-pour. Materials sourcing stalls Block B paving for 9 days.',
    severity: 'warning',
    affectedCitizenIds: ['C001'],
    isResolved: false,
  },
  {
    category: 'economic',
    title: 'Subcontractor Walks Off Over Unpaid Invoices',
    description: 'The electrical subcontractor halts work, citing 60 days of unpaid invoices. Signal and lighting installation freezes.',
    severity: 'critical',
    affectedCitizenIds: ['C003'],
    isResolved: false,
  },
  // ── Environmental ───────────────────────────────────────────
  {
    category: 'environmental',
    title: 'Winter Storm Flooding Damages Site',
    description: 'An atmospheric river sweeps loose gravel and debris into storm drains. SF Public Works issues an environmental notice. 6 workdays lost.',
    severity: 'warning',
    affectedCitizenIds: ['C004', 'C005'],
    isResolved: true,
    resolution: 'Temporary drainage berms installed; work resumed after clearance.',
  },
  {
    category: 'environmental',
    title: 'Historic Artifact Found During Excavation',
    description: 'Crews unearth 19th-century cobblestones and a streetcar rail. The Planning Department orders an archaeological review of Block A.',
    severity: 'warning',
    affectedCitizenIds: ['C002'],
    isResolved: false,
  },
  {
    category: 'environmental',
    title: 'Contaminated Soil from Former Gas Station',
    description: 'Petroleum-contaminated soil is found at a legacy fuel-station parcel. Hazmat remediation required before excavation continues.',
    severity: 'critical',
    affectedCitizenIds: ['C004', 'C005'],
    isResolved: false,
  },
  // ── Safety ──────────────────────────────────────────────────
  {
    category: 'safety',
    title: 'Dust-Related Illness Spike at Local School',
    description: 'School health records show a 23% rise in respiratory complaints. The Bay Area AQMD issues a formal notice; a wet-sweeping mandate follows.',
    severity: 'warning',
    affectedCitizenIds: ['C005'],
    isResolved: false,
  },
  {
    category: 'safety',
    title: 'Worker Injury Triggers Cal/OSHA Probe',
    description: 'A scaffolding collapse injures two laborers. Cal/OSHA opens an investigation and issues a partial stop-work order on Block B.',
    severity: 'critical',
    affectedCitizenIds: ['C003'],
    isResolved: false,
  },
  {
    category: 'safety',
    title: 'Pedestrian Struck at Unmarked Crossing',
    description: 'A senior is struck by a delivery truck at a crossing where signage was removed. The intersection is closed pending a safety redesign.',
    severity: 'critical',
    affectedCitizenIds: ['C004'],
    isResolved: false,
  },
  // ── Political ───────────────────────────────────────────────
  {
    category: 'political',
    title: 'Pre-Election Approval Freeze',
    description: 'With city elections called, all new contractor sub-awards are frozen for 3 weeks pending pre-election ethics-compliance review.',
    severity: 'warning',
    affectedCitizenIds: [],
    isResolved: true,
    resolution: 'Freeze lifted after the notification period ended.',
  },
  {
    category: 'political',
    title: 'Budget Reallocation Cuts $5M',
    description: 'The Board of Supervisors redirects $5M to emergency storm repairs citywide. The corridor team must de-scope street trees and two shelters.',
    severity: 'critical',
    affectedCitizenIds: ['C006', 'C005'],
    isResolved: false,
  },
  {
    category: 'political',
    title: 'New Supervisor Demands Project Review',
    description: 'A newly seated district supervisor calls for a full project audit, freezing the Block C notice-to-proceed for two weeks.',
    severity: 'warning',
    affectedCitizenIds: [],
    isResolved: false,
  },
  // ── Adaptive ────────────────────────────────────────────────
  {
    category: 'adaptive',
    title: 'Merchants Launch Pop-Up Market',
    description: 'Displaced storefronts band together to run a weekend pop-up market on a closed side street, partially restoring foot traffic and morale.',
    severity: 'info',
    affectedCitizenIds: ['C002', 'C004'],
    isResolved: true,
    resolution: 'City granted a temporary event permit; market continues monthly.',
  },
  {
    category: 'adaptive',
    title: 'Residents Crowdfund Independent Inspector',
    description: 'Neighbors raise funds to hire an independent civil engineer to verify milestone claims, creating bottom-up accountability pressure.',
    severity: 'info',
    affectedCitizenIds: ['C003', 'C006'],
    isResolved: true,
    resolution: 'Findings shared publicly; DPW agreed to reconcile two disputed milestones.',
  },
  // ── Legal ───────────────────────────────────────────────────
  {
    category: 'legal',
    title: 'Court Order Halts Work Pending CEQA Review',
    description: 'A neighborhood group wins a Superior Court order pausing Block C until an environmental review challenge is resolved.',
    severity: 'critical',
    affectedCitizenIds: ['C002', 'C006'],
    isResolved: false,
  },
  {
    category: 'legal',
    title: 'Contractor Files Arbitration for Scope Creep',
    description: 'The prime contractor files a $3.4M arbitration claim, alleging design changes expanded scope. Payments enter dispute.',
    severity: 'warning',
    affectedCitizenIds: ['C003'],
    isResolved: false,
  },
  {
    category: 'legal',
    title: 'ADA Noncompliance Suit Filed',
    description: 'A disability-rights group sues over inaccessible interim sidewalks. The city must retrofit temporary ADA ramps within 30 days.',
    severity: 'warning',
    affectedCitizenIds: ['C004'],
    isResolved: false,
  },
  // ── Systemic ────────────────────────────────────────────────
  {
    category: 'systemic',
    title: 'Cascading Project Delays — 6-Week Slippage',
    description: 'Winter storm delays, a utility conflict, and contractor staff shortages compound, pushing the timeline out 6 weeks and consuming the buffer.',
    severity: 'critical',
    affectedCitizenIds: ['C001', 'C002', 'C003', 'C004'],
    isResolved: false,
  },
  {
    category: 'systemic',
    title: 'Budget Contingency Exhausted by Month 7',
    description: 'Compounding change-orders burn through the 10% contingency before the final stretch, leaving no buffer for the Block C unknowns.',
    severity: 'critical',
    affectedCitizenIds: ['C002', 'C003'],
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
  'Material supply chain fragility — single regional asphalt supplier is a single point of failure',
  'Worker welfare gap — no formal dispute mechanism for 47 day-laborers on site',
  'Community information asymmetry — 60% of affected residents unaware of the appeal process',
  'Budget contingency exhausted by Month 7 — no buffer for the final stretch',
  'Interim traffic diversions pushing congestion onto unprepared side streets',
  'Stormwater runoff from the site discharging untreated into the Bay sewer system',
  'Political pressure driving an unsafe pace of work in the final 2 months',
  'Contractor history of substandard materials on prior SF Public Works projects',
  'Inspector co-location with contractor offices creating a conflict of interest',
  'Single-bid procurement on Block C limiting competitive cost control',
  'No independent verification of milestone completion before payment release',
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

/** Map an edge-case category to a timeline event type for the Updates feed. */
const CATEGORY_EVENT_TYPE: Record<EdgeCaseCategory, SimulationEvent['type']> = {
  corruption: 'flag',
  technical: 'construction',
  social: 'flag',
  economic: 'closure',
  environmental: 'construction',
  safety: 'flag',
  political: 'flag',
  adaptive: 'employment',
  legal: 'flag',
  systemic: 'flag',
}

/** Turn an edge case into a timeline event so it surfaces in the Updates feed. */
function edgeCaseToEvent(ec: EdgeCase): SimulationEvent {
  return {
    id: `EVT-${ec.id}`,
    tick: ec.month,
    type: CATEGORY_EVENT_TYPE[ec.category] ?? 'flag',
    title: ec.title,
    description: ec.description,
    affectedCitizenIds: ec.affectedCitizenIds,
    severity: ec.severity,
  }
}

async function generateFallbackSimulation(options: DirectorOptions, seed: string): Promise<DirectorSimulation> {
  // Load pre-computed ticks as the base
  const baseMod = await import('@/data/demo_simulation_ticks.json')
  const baseTicks: SimulationTick[] = baseMod.default as unknown as SimulationTick[]

  // Pick a varied NUMBER of edge cases (5–7) so each re-roll differs in count too
  const ecCount = 5 + Math.floor(seededRandom(seed, 42) * 3) // 5, 6, or 7
  const selectedTemplates = seededPick(EDGE_CASE_TEMPLATES, ecCount, seed)

  // Assign each to a distinct month across the whole timeline, ordered chronologically
  const monthPool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const selectedMonths = seededPick(monthPool, ecCount, seed, 100).sort((a, b) => a - b)

  const edgeCases: EdgeCase[] = selectedTemplates
    .map((tpl, i) => ({ tpl, month: selectedMonths[i] }))
    .map(({ tpl, month }, i, arr) => ({
      ...tpl,
      id: `EC${String(i + 1).padStart(3, '0')}`,
      month,
      discoveredAt: Date.now(),
      // Cascade to the next chronological edge case (forward in time)
      cascadesTo: i < arr.length - 1 ? [`EC${String(i + 2).padStart(3, '0')}`] : undefined,
    }))

  // Index edge-case-derived events by month
  const edgeEventsByMonth = new Map<number, SimulationEvent[]>()
  for (const ec of edgeCases) {
    const list = edgeEventsByMonth.get(ec.month) ?? []
    list.push(edgeCaseToEvent(ec))
    edgeEventsByMonth.set(ec.month, list)
  }

  // Vary the ticks AND inject the unique edge-case events, so the Updates feed
  // (not just the Edge Cases panel) changes on every re-roll.
  const ticks: SimulationTick[] = baseTicks.map((tick) => ({
    ...tick,
    constructionProgress: varyProgress(tick.constructionProgress, seed, tick.month),
    citizenUpdates: tick.citizenUpdates.map((cu) => ({
      ...cu,
      narrative: varyNarrative(cu.narrative, seed, cu.citizenId, tick.month),
    })),
    events: [...tick.events, ...(edgeEventsByMonth.get(tick.month) ?? [])],
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
