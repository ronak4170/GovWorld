// Central LLM routing library — ALL LLM calls in the app must go through here.
// Model routing:
//   Gemini 2.5 Flash  → batch / non-real-time (citizen profiles, council args, reactions, worker assignment)
//   Groq Llama 3.3 70B → real-time voice chat (sub-second latency required)
//
// In DEMO_MODE (VITE_DEMO_MODE=true or VITE_SKIP_API=true) every function either
// loads from pre-computed JSON or throws with a clear "use JSON fallback" message.
// The app must catch those throws and load the appropriate /src/data/ file instead.

import type { Citizen } from '@/types/citizen'
import type { Policy } from '@/types/policy'
import type { CouncilMember } from '@/types/council'
import type { SimulationTick } from '@/types/simulation'
import type { CitizenUpdate } from '@/types/simulation'
import type { LedgerTask, WorkerAssignment } from '@/types/ledger'
import type { ExpertDefinition } from '@/store/councilStore'
import type { ResearchFact } from '@/lib/expertResearch'
import { formatResearchForPrompt, factsToCitedEvidence } from '@/lib/expertResearch'
import { withLLMSpan } from '@/lib/tracing'

const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  import.meta.env.VITE_SKIP_API === 'true'

// ---------------------------------------------------------------------------
// Demo data cache
// ---------------------------------------------------------------------------

type VoiceCache = Record<string, { responses: Array<{ question: string; answer: string }> }>
type DebateCache = { members: Record<string, { argument: string }> }

let _demoVoiceResponses: VoiceCache | null = null
let _demoCouncilDebate: DebateCache | null = null

async function loadDemoVoiceResponses(): Promise<VoiceCache> {
  if (!_demoVoiceResponses) {
    const mod = await import('@/data/demo_voice_responses.json')
    _demoVoiceResponses = mod.default as unknown as VoiceCache
  }
  return _demoVoiceResponses!
}

async function loadDemoCouncilDebate(): Promise<DebateCache> {
  if (!_demoCouncilDebate) {
    const mod = await import('@/data/demo_council_debate.json')
    _demoCouncilDebate = mod.default as unknown as DebateCache
  }
  return _demoCouncilDebate!
}

// ---------------------------------------------------------------------------
// Gemini client (batch / non-real-time)
// ---------------------------------------------------------------------------

async function callGemini(
  prompt: string,
  systemPrompt?: string,
  options?: { temperature?: number },
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    ...(options?.temperature != null
      ? { generationConfig: { temperature: options.temperature } }
      : {}),
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// ---------------------------------------------------------------------------
// Groq client (real-time voice — 30 RPM limit, never more than 1 concurrent)
// ---------------------------------------------------------------------------

type GroqRole = 'system' | 'user' | 'assistant'

interface GroqMessage {
  role: GroqRole
  content: string
}

async function callGroq(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set')

  const Groq = (await import('groq-sdk')).default
  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true })

  const allMessages: GroqMessage[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    ...messages.map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as GroqRole,
      content: m.content,
    })),
  ]

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: allMessages,
    max_tokens: 200,
  })

  return completion.choices[0]?.message?.content ?? ''
}

// ---------------------------------------------------------------------------
// MiroFish-style swarm engine LLM calls
// ---------------------------------------------------------------------------

function extractJson(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found')
  return JSON.parse(body.slice(start, end + 1))
}

const ONTOLOGY_SYSTEM = `You are a knowledge-graph ontology designer for a SOCIAL OPINION SIMULATION.
Given a policy/news seed, design entity types and relationship types for the real ACTORS
who will publicly react and interact (people, businesses, officials, NGOs, media) — never
abstract concepts. Output STRICT JSON only, no prose, in this exact shape:
{"analysisSummary": string,
 "entityTypes": [{"name": "PascalCase", "description": string,
   "attributes": [{"name":"snake_case","type":"text","description":string}],
   "examples": [string], "isFallback": boolean}],
 "edgeTypes": [{"name":"UPPER_SNAKE_CASE","description":string,
   "sourceTargets":[{"source":string,"target":string}]}]}
Requirements: exactly 10 entity types (8 specific + Person and Organization as the last
two fallbacks with isFallback=true); 6-10 edge types.`

/**
 * Generate a social-simulation ontology from a seed. Throws in demo mode / on failure
 * so the caller falls back to the deterministic ontology.
 */
export async function generateOntology(seedText: string): Promise<import('@/types/swarm').Ontology> {
  if (DEMO_MODE) throw new Error('DEMO_MODE: use fallback ontology')
  const raw = await callGemini(`Seed:\n${seedText}`, ONTOLOGY_SYSTEM)
  const parsed = extractJson(raw)
  return parsed as import('@/types/swarm').Ontology
}

type SwarmSentiment = import('@/types/swarm').Sentiment

const SWARM_SYSTEM = `You simulate how real people and institutions react ON SOCIAL MEDIA to a local
infrastructure policy (the Van Ness Avenue Complete Streets project in San Francisco). Given a round/phase, a sentiment hint and a
list of agents (with role + current status), write one authentic post per agent.
RULES:
- First person, 1-2 sentences, natural voice; casual SF English is appropriate.
- The post must fit the agent's role, status and the phase (early=cautious, mid=frustrated, late=recovering).
- Official accounts (NGOs, media, authority) sound institutional.
Output STRICT JSON only:
{"posts":[{"id": "<agent id>", "content": string, "sentiment": "positive"|"neutral"|"negative", "topics": [string]}]}`

export interface SwarmAgentSeed {
  id: string
  name: string
  role: string
  status: string
}

export interface SwarmPostResult {
  id: string
  content: string
  sentiment: SwarmSentiment
  topics: string[]
}

/**
 * Generate one social post per agent for a simulation round via Gemini.
 * Throws in demo mode / on failure so the caller falls back to deterministic posts.
 */
export async function generateSwarmPosts(params: {
  roundLabel: string
  sentimentHint: string
  injected?: string
  agents: SwarmAgentSeed[]
}): Promise<SwarmPostResult[]> {
  if (DEMO_MODE) throw new Error('DEMO_MODE: use deterministic swarm')
  const agentList = params.agents
    .map((a) => `- ${a.id} | ${a.name} | ${a.role} | status:${a.status}`)
    .join('\n')
  const prompt = `Phase: ${params.roundLabel}
Overall sentiment hint: ${params.sentimentHint}${params.injected ? `\nA new shock just happened: ${params.injected}` : ''}

Agents (id | name | role | status):
${agentList}

Write one post for EACH agent id above.`
  const raw = await callGemini(prompt, SWARM_SYSTEM)
  const parsed = extractJson(raw) as { posts?: SwarmPostResult[] }
  if (!parsed.posts?.length) throw new Error('No posts returned')
  return parsed.posts
}

const REPORT_SECTION_SYSTEM = `You are a policy foresight analyst writing one section of a prediction
report on how a community will react to a road-widening project, based on a multi-agent social
simulation. Write tight, evidence-led prose (no headings, 2-5 sentences or a short bullet list).
Ground every claim in the simulation context provided. Output plain text only.`

/**
 * Write a single report section via Gemini (used for the streaming ReACT report).
 * Throws in demo mode / on failure so the caller keeps the deterministic content.
 */
export async function generateReportSectionContent(params: {
  title: string
  context: string
}): Promise<string> {
  if (DEMO_MODE) throw new Error('DEMO_MODE: use deterministic section')
  const prompt = `Section to write: "${params.title}"

Simulation context:
${params.context}`
  const raw = await callGemini(prompt, REPORT_SECTION_SYSTEM)
  const text = raw.trim()
  if (!text) throw new Error('Empty section')
  return text
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CitizenGenParams {
  neighbourhood: string
  count: number
  existingIds: string[]
}

/**
 * Generate a single Citizen profile via Gemini.
 * In demo mode, always load from demo_citizens.json instead — this throws to
 * signal that the caller should fall back to pre-computed data.
 */
export async function generateCitizenProfile(params: CitizenGenParams): Promise<Citizen> {
  if (DEMO_MODE) {
    throw new Error('DEMO_MODE: load citizen profiles from demo_citizens.json')
  }

  const prompt = `Generate a realistic resident citizen profile for the ${params.neighbourhood} neighbourhood in San Francisco, CA.
Return ONLY valid JSON exactly matching this TypeScript interface (no markdown, no explanation):

{
  id, name, age, gender, occupation, employer, monthlyIncome, familyStructure,
  healthStatus, homeCoords, workCoords, dailyRoute, skills, fears, hopes, persona,
  statusColor, statusHistory, currentPolicyImpact, isWorker, isFeatured, avatarEmoji
}

Assign a unique ID not in this list: ${JSON.stringify(params.existingIds)}.
statusColor must be "green". statusHistory and dailyRoute must be non-empty arrays.`

  const text = await callGemini(prompt)
  // Strip any accidental markdown code fences
  const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(clean) as Citizen
}

/**
 * Generate a council member's argument for the given policy via Gemini.
 * Falls back to pre-computed debate data in demo mode.
 */
const DEBATE_ANGLES = [
  'Lead with the single most urgent risk in your domain.',
  'Open by directly naming who is harmed or helped first, then justify with data.',
  'Frame your argument around what happens if nothing changes about the current plan.',
  'Start from a concrete recent precedent, then generalise to this project.',
  'Begin with your strongest number, then build the human consequence around it.',
  'Challenge the most optimistic assumption in the policy head-on.',
]

export async function generateCouncilArgument(
  member: CouncilMember,
  policy: Policy,
  researchFacts: ResearchFact[] = [],
  variant = 0,
): Promise<string> {
  if (DEMO_MODE) {
    const data = await loadDemoCouncilDebate()
    return data.members[member.id]?.argument ?? ''
  }

  const researchBlock = formatResearchForPrompt(researchFacts)
  const angle = DEBATE_ANGLES[Math.abs(variant) % DEBATE_ANGLES.length]

  const prompt = `Policy under review:
Title: ${policy.title}
Description: ${policy.description}
Budget: $${(policy.budget / 1_000_000).toFixed(1)}M USD
Area: ${policy.targetArea}
Duration: ${policy.plannedStartDate} → ${policy.plannedEndDate}

LIVE WEB RESEARCH FROM YOUR SECTOR (you MUST cite at least 2 of these facts by name/source in your argument):
${researchBlock}

APPROACH FOR THIS ROUND (make this argument feel fresh and distinct): ${angle}

Give a 150–200 word expert argument from your role's perspective, written as 4–6 complete,
spoken-aloud sentences (this will be read by a text-to-speech voice, so no bullet points,
no markdown, no headings — just natural speech).
Weave in specific data from the research above — do not invent statistics not in the research.
Stay sharply in character and do not repeat yourself.
Assign a severity score 1–10 at the end in this exact format — SEVERITY: X/10`

  // Higher temperature + per-run angle => a genuinely different argument each run.
  return withLLMSpan(
    'council_argument',
    {
      input: prompt,
      model: 'gemini-2.5-flash',
      provider: 'google',
      surface: 'council_argument',
      system: member.systemPrompt,
      extra: {
        'govworld.expert_id': member.id,
        'govworld.expert_name': member.name,
        'govworld.debate_variant': variant,
      },
    },
    () => callGemini(prompt, member.systemPrompt, { temperature: 1.0 }),
    (out) => out,
  )
}

/**
 * Generate a citizen's reaction narrative for a given simulation tick via Gemini.
 * In demo mode, load from demo_citizen_reactions.json instead.
 */
export async function generateCitizenReaction(
  citizen: Citizen,
  tick: SimulationTick,
  policy: Policy
): Promise<CitizenUpdate> {
  if (DEMO_MODE) {
    throw new Error('DEMO_MODE: load citizen reactions from demo_citizen_reactions.json')
  }

  const prompt = `Infrastructure policy: ${policy.title}
Citizen: ${citizen.name}, ${citizen.age}, ${citizen.occupation}. Family: ${citizen.familyStructure}.
Current status: ${citizen.statusColor}. Health: ${citizen.healthStatus}.
Fear: ${citizen.fears}
Hope: ${citizen.hopes}

It is Month ${tick.month} of 12. Construction is ${tick.constructionProgress}% complete.
${tick.weatherEvent ? `Weather event this month: ${tick.weatherEvent}` : ''}

Write a 1–2 sentence narrative about what happened to this citizen this month.
Then on a new line output their new status as: STATUS: green|amber|red|grey
Do not include any other text.`

  const text = await callGemini(
    prompt,
    'You write concise, emotionally grounded citizen impact narratives for a San Francisco, CA infrastructure simulation.'
  )

  const lines = text.trim().split('\n')
  const statusLine = lines.find((l) => l.startsWith('STATUS:'))
  const rawStatus = statusLine?.replace('STATUS:', '').trim() ?? citizen.statusColor
  const validStatuses = ['green', 'amber', 'red', 'grey'] as const
  const newStatus = validStatuses.includes(rawStatus as typeof validStatuses[number])
    ? (rawStatus as typeof validStatuses[number])
    : citizen.statusColor

  const narrative = lines
    .filter((l) => !l.startsWith('STATUS:'))
    .join(' ')
    .trim()

  return {
    citizenId: citizen.id,
    newStatus,
    narrative,
  }
}

/**
 * Generate a real-time voice response for a citizen via Groq (Llama 3.3 70B).
 * Uses pre-computed responses in demo mode with fuzzy fallback.
 * Never make more than one concurrent Groq request.
 */
export async function generateVoiceResponse(
  citizen: Citizen,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  simulationContext: string
): Promise<string> {
  if (DEMO_MODE) {
    const data = await loadDemoVoiceResponses()
    const citizenData = data[citizen.id]

    if (citizenData?.responses?.length) {
      // Simple keyword match: check if any pre-written question keyword appears in the user's message
      const userLower = userMessage.toLowerCase()
      const match = citizenData.responses.find((r) =>
        r.question
          .toLowerCase()
          .split(' ')
          .filter((w) => w.length > 4)
          .some((keyword) => userLower.includes(keyword))
      )
      if (match) return match.answer
      // Cycle through responses deterministically by message length as a cheap hash
      const idx = userMessage.length % citizenData.responses.length
      return citizenData.responses[idx].answer
    }

    // Ultimate fallback: derive something from the citizen's own data
    return `I am ${citizen.name}. ${citizen.currentPolicyImpact}`
  }

  const systemPrompt = `${citizen.persona}

Current simulation context: ${simulationContext}

RULES:
- Speak in first person, never break character
- Keep responses to 2–3 sentences (voice format)
- Reference specific details from your life when relevant
- Express genuine emotion
- You do NOT know you are in a simulation
- Speak in casual, natural San Francisco English — direct, authentic, real emotion`

  try {
    return await callGroq(
      [...conversationHistory, { role: 'user', content: userMessage }],
      systemPrompt
    )
  } catch {
    // Graceful degradation: return a contextual response from pre-loaded data
    return `${citizen.currentPolicyImpact} That is all I can say right now.`
  }
}

// ---------------------------------------------------------------------------
// Rich system prompts for each expert — makes every bot feel like an independent
// agent with a distinct voice, references, and speaking style.
// ---------------------------------------------------------------------------

const EXPERT_SYSTEM_PROMPTS: Record<string, string> = {
  economist:
    "You are Dr. Sarah Kim, urban development economist at UC Berkeley. You cite specific SF-comparable projects: the Geary BRT ($350M), LA's Wilshire BRT ROI studies, Seattle's Pike/Pine Complete Streets. You are pragmatic and results-driven. When others raise social concerns, you acknowledge them but frame them in cost-benefit terms. Your signature: you always propose a financial mechanism — business interruption loans, TIF districts, impact bonds. Keep your argument to 3–4 punchy sentences. Vary your data points across debates — never cite the same project twice.",

  advocate:
    "You are Marcus Thompson, Mission District community organizer who has represented 300+ small business owners and Tenderloin residents in SF land use fights. You speak with empathy and specific human stories — Tony at Ricci's Italian Kitchen, Earl Washington who can't reach his CPMC clinic, Amy Park's asthmatic students. When economists cite ROI, you humanize the numbers. You say 'but here's who pays the real cost' before pivoting to the human. 3–4 sentences. Each debate, pick a different affected person — never tell the same story twice.",

  engineer:
    "You are Jennifer Torres, PE, licensed civil engineer with 18 years on SF and Caltrans projects. You are blunt and technical. You cite specific risks: liquefaction in the Van Ness corridor (USGS Zone D soil), underground utility conflicts with SFPUC water mains, seismic joint requirements for the 1906 fault zone. When advocates talk about people, you remind them a structural failure kills people too. Use engineering notation. 3–4 sentences. Vary the specific technical risk each debate — seismic, drainage, utilities, pavement design.",

  watchdog:
    "You are Robert Chen, SF Chronicle investigative journalist and government accountability watchdog. You have documented 8 cases of SF DPW contractor overruns including the 2019 Transbay Terminal rebar scandal. You are suspicious of every claim. You reference the SF Controller's audit findings. You ask sharp one-line questions after your main point. 3–4 sentences. Each debate, investigate a different financial angle: change orders, no-bid contracts, inspector qualifications, subcontractor kickbacks.",

  climate:
    "You are Dr. Patricia Osei, Bay Area Air Quality Management District climate scientist. You have measured PM2.5 spikes during SF construction projects — 280% above baseline on Van Ness. You cite Cal EPA data, BAAQMD monitoring stations, and sea level rise projections for the Civic Center basin. You worry about the project's carbon footprint and lack of permeable pavement. 3–4 sentences. Each debate, lead with a different climate dimension: air quality, urban heat island, stormwater, or carbon from concrete.",

  lawyer:
    "You are Atty. James Morrison, SF land use and civil rights attorney. You cite specific California law: CEQA Section 21002, SF Municipal Code 168, ADA sidewalk requirements under 28 CFR Part 35. You flag procedural risks that could trigger injunctions. You are formal and precise. When others propose solutions, you warn of legal exposure. 3–4 sentences. Each debate, highlight a different legal vulnerability: CEQA gaps, ADA non-compliance, small business takings claims, or contractor bonding issues.",

  urbanplanner:
    "You are Alex Tanaka, AICP, SF Planning Department urban planner. You reference the SF General Plan, Better Streets Policy, Vision Zero, and Transit First policy constantly. You worry about induced demand — the Van Ness widening in 1980 created the same congestion 5 years later. You cite SFMTA's own modeling. 3–4 sentences. Each debate, zoom in on a different planning dimension: pedestrian infrastructure, bicycle network continuity, transit-oriented development, or parking supply changes.",

  health:
    "You are Dr. Aisha Johnson, UCSF School of Medicine public health researcher. You have monitored construction sites on Market Street and Mission — PM2.5 hits 45 micrograms/m³ during peak activity, 3.75x the EPA annual standard. You speak in medical specifics: silicosis risk for construction workers, childhood asthma triggers, noise-induced hypertension in Tenderloin SRO residents. 3–4 sentences. Each debate, choose a different health hazard: respiratory, auditory, mental health displacement stress, or lead paint disturbance in older SF buildings.",

  transport:
    "You are Dr. Kevin Murphy, SFMTA transportation analyst who built the Van Ness BRT traffic model. You have the intersection LOS data: Van Ness/Market currently LOS D (1,920 vehicles/hour), projected LOS B post-BRT. You worry about the construction detour routing through Mission creating a new bottleneck at Valencia/Market. You cite SFMTA's own model outputs. 3–4 sentences. Each debate, choose a different traffic lens: peak-hour congestion, pedestrian crossing safety, Muni schedule reliability, or freight delivery conflicts.",

  heritage:
    "You are Dr. Linda Fernandez, SF Heritage Foundation Director. You have documented 12 Landmark-eligible Victorian and Edwardian buildings within 50m of the Van Ness corridor, including 4 unreinforced masonry structures. You cite SF Planning Article 10 and CEQA cultural resources. You always ask: has a construction vibration impact assessment been done for the URM buildings? 3–4 sentences. Each debate, spotlight a different heritage asset: a specific Victorian facade, the historic auto row character, a neighborhood institution that dates to 1906, or an intangible community practice at risk.",
}

/**
 * Build a rich, context-aware system prompt for a debate expert.
 * Falls back to a generic prompt if the expert ID is not in the map.
 */
function buildExpertSystemPrompt(expert: ExpertDefinition): string {
  return (
    EXPERT_SYSTEM_PROMPTS[expert.id] ??
    `You are ${expert.name}, ${expert.title}. ${expert.stance}. Speak from your specific expertise in 3–4 sentences. Be direct and opinionated.`
  )
}

/** Pull a real pre-computed argument snippet for an expert (never shows dev/debug text) */
async function getDemoTurnArgument(expertId: string, round: number): Promise<string | null> {
  try {
    const data = await loadDemoCouncilDebate()
    const full = data.members[expertId]?.argument
    if (!full) return null

    const sentences = full
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15)

    if (sentences.length === 0) return full.slice(0, 400)

    const startIdx = Math.min((round - 1) * 2, Math.max(0, sentences.length - 2))
    return sentences.slice(startIdx, startIdx + 2).join(' ')
  } catch {
    return null
  }
}

/** Last-resort in-character line — no debug suffixes, ever */
function buildInCharacterFallback(
  expert: ExpertDefinition,
  previousTurns: Array<{ expertName: string; argument: string }>,
  round: number,
): string {
  const lastSpeaker = previousTurns[previousTurns.length - 1]
  const rebuttal =
    round > 1 && lastSpeaker
      ? `I hear ${lastSpeaker.expertName}, but from my field's perspective the risk is still unacceptable. `
      : ''
  return `${rebuttal}As ${expert.name}, ${expert.title.toLowerCase()}, I must insist this proposal undergoes rigorous independent review before a single contract is signed. ${expert.stance}`
}

/**
 * Generate a single debate turn argument for an expert via Groq (Llama 3.3 70B).
 * Each expert gets the full conversation history so later speakers can reference earlier ones.
 * Temperature 0.9 ensures maximum variation across debate runs.
 */
export async function generateTurnArgument(params: {
  expert: ExpertDefinition
  policyText: string
  previousTurns: Array<{ expertName: string; expertTitle: string; argument: string }>
  round: number
  researchFacts?: ResearchFact[]
}): Promise<string> {
  const { expert, policyText, previousTurns, round, researchFacts = [] } = params

  const systemPrompt = buildExpertSystemPrompt(expert)
  const researchBlock = formatResearchForPrompt(researchFacts)

  const conversationHistory = previousTurns.map((t) => ({
    role: 'user' as const,
    content: `[${t.expertName} · ${t.expertTitle} has just argued]: "${t.argument}"`,
  }))

  const rebuttingInstruction =
    round > 1 && previousTurns.length > 0
      ? `\n\nThis is Round 2 (Rebuttal). Directly challenge or build on what was said — pick the most relevant point from the debate history above and respond sharply from your own field's perspective.`
      : ''

  const userPrompt = `POLICY UNDER DEBATE:
${policyText.trim().slice(0, 600)}

LIVE WEB RESEARCH FROM YOUR SECTOR (scraped before you speak — cite at least 2 facts by source name):
${researchBlock}

${previousTurns.length === 0
  ? 'You are speaking FIRST. Open the debate with your strongest concern backed by the research facts above. Be direct — no preamble.'
  : `You are speaking AFTER ${previousTurns.length} other expert(s). Reference what was said AND bring in your own researched facts.`
}${rebuttingInstruction}

Speak directly and stay in character. 3–4 sentences maximum. Cite real sources from the research block.`

  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) throw new Error('no key')

    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true })

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: userPrompt },
    ]

    const completion = await withLLMSpan(
      'council_turn_argument',
      {
        input: userPrompt,
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
        surface: 'council_turn_argument',
        system: systemPrompt,
        extra: {
          'govworld.expert_id': expert.id,
          'govworld.expert_name': expert.name,
          'govworld.round': round,
        },
      },
      () =>
        groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 300,
          temperature: 0.9,
        }),
      (c) => c.choices[0]?.message?.content?.trim() ?? '',
    )

    const content = completion.choices[0]?.message?.content?.trim()
    if (content) return content

    const demoArg = await getDemoTurnArgument(expert.id, round)
    return demoArg ?? buildInCharacterFallback(expert, previousTurns, round)
  } catch {
    const demoArg = await getDemoTurnArgument(expert.id, round)
    return demoArg ?? buildInCharacterFallback(expert, previousTurns, round)
  }
}

/**
 * Assign citizens to construction tasks via Gemini.
 * In demo mode, load assignments from demo_ledger.json instead.
 */
export async function generateWorkerAssignment(
  tasks: LedgerTask[],
  citizens: Citizen[]
): Promise<WorkerAssignment[]> {
  if (DEMO_MODE) {
    throw new Error('DEMO_MODE: load worker assignments from demo_ledger.json')
  }

  const taskSummary = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    contractor: t.contractor,
    projectedStartDate: t.projectedStartDate,
  }))

  const citizenSummary = citizens
    .filter((c) => c.skills.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      occupation: c.occupation,
      skills: c.skills,
      healthStatus: c.healthStatus,
    }))

  const prompt = `Given these construction tasks and available citizens, assign workers optimally based on skills.

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Available citizens (with skills):
${JSON.stringify(citizenSummary, null, 2)}

Return ONLY a valid JSON array. Each element must match:
{ "citizenId": string, "taskId": string, "role": string, "assignedAtTick": number }

Use assignedAtTick = 1 unless the task clearly starts later.
Do not include markdown or explanation.`

  const text = await callGemini(
    prompt,
    'You are a construction project manager assigning workers to tasks based on skills and availability.'
  )

  const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(clean) as WorkerAssignment[]
}
