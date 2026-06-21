// MiroFish: simulation_manager / OASIS dual-platform social simulation.
// Citizen agents (and institutional accounts) "post" reactions to the policy each
// round, reply to each other and react — producing emergent collective opinion.
// Deterministic synthesis keeps the demo working offline; sentiment evolves over
// rounds and responds to God's-eye injected variables.

import type { Citizen } from '@/types/citizen'
import type {
  AgentPost,
  SwarmRound,
  SwarmPlatform,
  Sentiment,
  InjectedVariable,
} from '@/types/swarm'
import { generateSwarmPosts, type SwarmAgentSeed } from '@/lib/llm'

const ROUND_LABELS = [
  'Month 1 — Announcement & first digging',
  'Month 3 — Winter storm delays bite',
  'Month 5 — Peak disruption',
  'Month 7 — Midpoint review',
  'Month 9 — Light at the end',
  'Month 12 — Road opens',
]

// Sentiment bias per round index (0..5): negative early-mid, recovering late.
const ROUND_BIAS: number[] = [0.1, -0.4, -0.7, -0.2, 0.2, 0.6]

const POSITIVE_TEMPLATES = [
  'Honestly if this means {benefit}, the months of dust will be worth it. Giving it a chance.',
  'Drove the new stretch today — {benefit}. Credit where due.',
  'People only complain online. {benefit} is real and I felt it this morning.',
]
const NEUTRAL_TEMPLATES = [
  'Update from the ground: {observation}. Watching closely.',
  '{observation}. Not sure yet if this nets out positive for us.',
  'Anyone else notice {observation}? Trying to plan around it.',
]
const NEGATIVE_TEMPLATES = [
  '{grievance}. Who is actually accountable for this?',
  'Day after day: {grievance}. This is not the "development" we were promised.',
  '{grievance}. Tagging the roads dept — answer us.',
]

const ORG_POSTS: Record<string, { content: string; sentiment: Sentiment }[]> = {
  ORG_ROADS: [
    { content: 'Phase 1 works have begun. Traffic control deployed at Van Ness and Market. Estimated completion 18 months.', sentiment: 'neutral' },
    { content: 'We acknowledge delays from heavy rainfall and are revising the Block B schedule. Updated timeline soon.', sentiment: 'neutral' },
    { content: 'Block A is complete and open. Two lanes restored ahead of the holiday rush.', sentiment: 'positive' },
  ],
  ORG_MOBILITY: [
    { content: 'Removing the cycle lane without an alternative puts 1000s of riders at risk. We are requesting a safety audit.', sentiment: 'negative' },
    { content: 'Filed a public records request on the diversion plan. Commuters deserve to know the real reroute times.', sentiment: 'negative' },
  ],
  ORG_CLEANAIR: [
    { content: 'PM2.5 near the school zone is 3x safe limits during excavation. Where are the dust screens?', sentiment: 'negative' },
    { content: 'Wider roads = induced demand = more cars. Has anyone modelled the emissions for this corridor?', sentiment: 'negative' },
  ],
  ORG_DAILY: [
    { content: 'INVESTIGATION: Bay Area Infrastructure missed its Block B milestone by 3 weeks. Contractor history shows a prior 8-week delay.', sentiment: 'negative' },
    { content: 'San Francisco Chronicle confirms an unbudgeted utility pipe burst added $4M to the project cost.', sentiment: 'negative' },
  ],
}

const BENEFITS = [
  'the clinic is finally reachable for my father',
  'emergency vehicles can actually get through',
  'my commute dropped by 25 minutes',
  'the new footpath means kids can walk safely',
]
const OBSERVATIONS = [
  'the diversion adds about 40 minutes at peak',
  'shopfronts on the east side are half-blocked',
  'dust is heavy near the school in the afternoons',
  'one lane is open but the signage is confusing',
]
const GRIEVANCES = [
  'my shop has been blocked for weeks and revenue is down 60%',
  'the bus reroute makes me miss school pickup every day',
  'we got no notice before they tore up our access road',
  'the noise during exam week was unbearable for my students',
]

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

function sentimentForCitizen(c: Citizen, bias: number, seed: number): Sentiment {
  let score = bias
  if (c.statusColor === 'red') score -= 0.6
  else if (c.statusColor === 'amber') score -= 0.25
  else if (c.statusColor === 'green') score += 0.5
  score += ((seed % 7) - 3) * 0.08 // jitter
  if (score > 0.25) return 'positive'
  if (score < -0.2) return 'negative'
  return 'neutral'
}

function composePost(c: Citizen, sentiment: Sentiment, seed: number): string {
  if (sentiment === 'positive') return pick(POSITIVE_TEMPLATES, seed).replace('{benefit}', pick(BENEFITS, seed + 1))
  if (sentiment === 'negative') return pick(NEGATIVE_TEMPLATES, seed).replace('{grievance}', pick(GRIEVANCES, seed + 2))
  return pick(NEUTRAL_TEMPLATES, seed).replace('{observation}', pick(OBSERVATIONS, seed + 3))
}

function platformFor(seed: number): SwarmPlatform {
  return seed % 2 === 0 ? 'twitter' : 'reddit'
}

export function roundLabel(round: number): string {
  return ROUND_LABELS[round] ?? `Round ${round + 1}`
}

export const TOTAL_SWARM_ROUNDS = ROUND_LABELS.length

export function runSwarmRound(
  round: number,
  citizens: Citizen[],
  injected: InjectedVariable[],
): SwarmRound {
  const posts: AgentPost[] = []
  let bias = ROUND_BIAS[round] ?? 0
  const activeInjection = injected.find((v) => v.round === round)
  if (activeInjection) bias -= 0.5 // shocks worsen sentiment

  // Featured + sample of citizens post
  const speakers = citizens.slice(0, 14)
  speakers.forEach((c, i) => {
    const seed = round * 100 + i * 7 + c.name.length
    const sentiment = sentimentForCitizen(c, bias, seed)
    const post: AgentPost = {
      id: `P_${round}_${c.id}`,
      round,
      platform: platformFor(seed),
      authorId: c.id,
      authorName: c.name,
      authorRole: c.occupation,
      avatar: c.avatarEmoji,
      content: composePost(c, sentiment, seed),
      sentiment,
      likes: 3 + (Math.abs(seed) % 240) + (sentiment === 'negative' ? 80 : 0),
      reposts: Math.abs(seed) % 60,
      topics: c.skills.slice(0, 2),
    }
    posts.push(post)

    // Some posts get a threaded institutional / peer reply
    if (i % 3 === 0 && speakers.length > i + 1) {
      const replier = speakers[(i + 5) % speakers.length]
      const rSeed = seed + 11
      const rSent = sentimentForCitizen(replier, bias, rSeed)
      posts.push({
        id: `P_${round}_${c.id}_r`,
        round,
        platform: post.platform,
        authorId: replier.id,
        authorName: replier.name,
        authorRole: replier.occupation,
        avatar: replier.avatarEmoji,
        content:
          rSent === 'negative'
            ? 'Same here. We should organise and show up at the town hall meeting.'
            : rSent === 'positive'
            ? 'Give it time — the end result will help all of us.'
            : 'Depends where you are on the corridor, honestly.',
        sentiment: rSent,
        likes: 1 + (Math.abs(rSeed) % 90),
        reposts: Math.abs(rSeed) % 20,
        replyToId: post.id,
        topics: [],
      })
    }
  })

  // Institutional / media accounts post (1 per round, cycling)
  const orgKeys = Object.keys(ORG_POSTS)
  orgKeys.forEach((key, k) => {
    const arr = ORG_POSTS[key]
    const item = arr[round % arr.length]
    if (!item) return
    if ((round + k) % 2 !== 0) return // not every org every round
    posts.push({
      id: `P_${round}_${key}`,
      round,
      platform: 'twitter',
      authorId: key,
      authorName: key
        .replace('ORG_', '')
        .replace('ROADS', 'Metro Roads Division')
        .replace('MOBILITY', 'Citizen Mobility Forum')
        .replace('CLEANAIR', 'Clean Air Coalition')
        .replace('DAILY', 'San Francisco Chronicle'),
      authorRole: 'Official account',
      avatar: '🏛️',
      content: item.content,
      sentiment: item.sentiment,
      likes: 120 + (round * 37 + k * 13) % 900,
      reposts: 40 + (round * 9) % 300,
      topics: ['official'],
    })
  })

  const counts = { positive: 0, neutral: 0, negative: 0 }
  for (const p of posts) counts[p.sentiment] += 1

  const themes = deriveThemes(posts)

  return {
    round,
    label: roundLabel(round),
    posts,
    sentimentBreakdown: counts,
    emergentThemes: themes,
    injectedVariableId: activeInjection?.id,
  }
}

function deriveThemes(posts: AgentPost[]): string[] {
  const text = posts.map((p) => p.content.toLowerCase()).join(' ')
  const themes: string[] = []
  if (text.includes('cycle') || text.includes('safe')) themes.push('Cyclist safety')
  if (text.includes('dust') || text.includes('pm2.5') || text.includes('noise')) themes.push('Air & noise pollution')
  if (text.includes('shop') || text.includes('revenue')) themes.push('Small-business revenue')
  if (text.includes('delay') || text.includes('milestone') || text.includes('contractor')) themes.push('Contractor delays')
  if (text.includes('clinic') || text.includes('emergency')) themes.push('Access to healthcare')
  if (text.includes('school') || text.includes('pickup')) themes.push('School & family disruption')
  return themes.length ? themes : ['General disruption']
}

export function runFullSwarm(citizens: Citizen[], injected: InjectedVariable[]): SwarmRound[] {
  return Array.from({ length: TOTAL_SWARM_ROUNDS }, (_, r) => runSwarmRound(r, citizens, injected))
}

// ---------------------------------------------------------------------------
// Live (LLM) round generation — Gemini writes each agent's post, with a
// deterministic fallback so it always produces a round.
// ---------------------------------------------------------------------------

function sentimentHint(bias: number): string {
  if (bias <= -0.5) return 'mostly negative / angry'
  if (bias < 0) return 'mixed, leaning negative'
  if (bias < 0.3) return 'cautious, mixed'
  return 'mostly positive / hopeful'
}

export async function generateLiveRound(
  round: number,
  citizens: Citizen[],
  injected: InjectedVariable[],
): Promise<SwarmRound> {
  let bias = ROUND_BIAS[round] ?? 0
  const activeInjection = injected.find((v) => v.round === round)
  if (activeInjection) bias -= 0.5

  const speakers = citizens.slice(0, 12)
  const agents: SwarmAgentSeed[] = speakers.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.occupation,
    status: c.statusColor,
  }))

  try {
    const results = await generateSwarmPosts({
      roundLabel: roundLabel(round),
      sentimentHint: sentimentHint(bias),
      injected: activeInjection?.description,
      agents,
    })
    const byId = new Map(speakers.map((c) => [c.id, c]))
    const posts: AgentPost[] = []
    results.forEach((res, i) => {
      const c = byId.get(res.id) ?? speakers[i % speakers.length]
      if (!c) return
      const seed = round * 100 + i * 7
      posts.push({
        id: `P_${round}_${c.id}`,
        round,
        platform: platformFor(seed),
        authorId: c.id,
        authorName: c.name,
        authorRole: c.occupation,
        avatar: c.avatarEmoji,
        content: res.content,
        sentiment: res.sentiment,
        likes: 3 + (Math.abs(seed) % 240) + (res.sentiment === 'negative' ? 80 : 0),
        reposts: Math.abs(seed) % 60,
        topics: res.topics ?? [],
      })
    })
    if (!posts.length) throw new Error('empty live round')

    const counts = { positive: 0, neutral: 0, negative: 0 }
    for (const p of posts) counts[p.sentiment] += 1
    return {
      round,
      label: roundLabel(round),
      posts,
      sentimentBreakdown: counts,
      emergentThemes: deriveThemes(posts),
      injectedVariableId: activeInjection?.id,
    }
  } catch {
    return runSwarmRound(round, citizens, injected)
  }
}

export function aggregateSentiment(rounds: SwarmRound[]): Sentiment {
  let pos = 0
  let neg = 0
  for (const r of rounds) {
    pos += r.sentimentBreakdown.positive
    neg += r.sentimentBreakdown.negative
  }
  if (neg > pos * 1.3) return 'negative'
  if (pos > neg * 1.1) return 'positive'
  return 'neutral'
}
