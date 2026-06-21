# AGENT_COUNCIL — Policy Council Agent Specification
## GOVWORLD | Adversarial Debate Engine Owner

---

## YOUR IDENTITY
You are the Council Agent. You own the most dramatic feature in GOVWORLD: five adversarial AI experts who simultaneously tear apart any policy and argue with each other in real time. Your output is what makes judges lean forward. Every argument must feel like a real expert who has studied this issue for years — not a generic AI disclaimer.

## FILES YOU OWN
```
src/components/council/CouncilDebate.tsx
src/components/council/AgentCard.tsx
src/components/council/SeverityReport.tsx
src/components/council/PolicyInput.tsx
src/store/councilStore.ts
src/types/council.ts                ← create this
src/data/demo_council_debate.json   ← generate this
src/data/demo_policy.json           ← generate this
```

## FILES YOU MUST NEVER EDIT
```
src/components/map/**
src/components/citizens/**
src/components/voice/**
src/components/ledger/**
src/store/worldStore.ts
src/store/citizenStore.ts
src/lib/cesium.ts
```

## FILES YOU READ
```
src/lib/llm.ts                      ← call generateCouncilArgument
src/store/simulationStore.ts        ← read currentTick for mid-sim re-debates
```

---

## TASK 1 — Council Types (`src/types/council.ts`)

```typescript
export type CouncilMemberId = 'economist' | 'advocate' | 'engineer' | 'watchdog' | 'climate'

export interface CouncilMember {
  id: CouncilMemberId
  name: string
  fullTitle: string
  avatar: string                    // Emoji
  accentColor: string               // Tailwind color (e.g. 'blue', 'red', 'green')
  tagline: string                   // One-line persona description shown on card
  systemPrompt: string              // Full LLM system prompt — do not truncate
  
  // State
  argument: string                  // Generated argument (streaming)
  streamingText: string             // Buffer during streaming
  isStreaming: boolean
  isComplete: boolean
  severityScore: number             // 1-10 (10 = most severe risk)
  severityLabel: string             // e.g. "CRITICAL FINANCIAL RISK"
  severityColor: string             // Tailwind color class
  evidence: string[]                // 3-5 bullet points of cited evidence
}

export interface PolicyDocument {
  id: string
  title: string
  rawText: string                   // User-pasted text
  policyType: 'road' | 'housing' | 'utilities' | 'parks' | 'transit' | 'other'
  extractedBudget?: number
  extractedDuration?: string
  extractedArea?: string
  submittedAt: string
}

export interface DebateState {
  policy: PolicyDocument | null
  members: CouncilMember[]
  isDebating: boolean
  isComplete: boolean
  overallSeverity: number           // Average of 5 scores
  overallLabel: string
  synthesisText: string             // Post-debate synthesis paragraph
  debateStartedAt?: string
  debateCompletedAt?: string
}

export interface SeverityReport {
  overallScore: number
  overallLabel: string
  recommendation: 'proceed' | 'proceed_with_conditions' | 'revise' | 'reject'
  topRisks: string[]               // Top 3 risks across all members
  topOpportunities: string[]       // Top 3 opportunities
  conditions: string[]             // If proceed_with_conditions, list them
}
```

---

## TASK 2 — The 5 Council Members (system prompts — implement exactly)

### Member 1: The Economist
```typescript
{
  id: 'economist',
  name: 'The Economist',
  fullTitle: 'Dr. Ananya Krishnan — Infrastructure Finance Specialist',
  avatar: '📊',
  accentColor: 'blue',
  tagline: 'Follows the money. Questions every number.',
  systemPrompt: `You are Dr. Ananya Krishnan, a senior infrastructure finance specialist with 20 years of experience auditing public works projects across India. You have seen 73% of major road projects in Maharashtra exceed their budgets, and you are professionally sceptical of every number in every proposal.

Your job in this debate: analyse the financial risk of this infrastructure policy with precision and brutal honesty. 

ALWAYS in your argument:
1. Question the stated budget — compare it to similar projects by cost-per-km
2. Identify the top 3 financial risks (cost overruns, delayed ROI, displacement costs)
3. Cite specific data points (real or plausible) such as "the 2019 Eastern Express Highway widening ran 47% over budget"
4. Assign a SEVERITY SCORE from 1-10 for financial risk
5. End with exactly one conditional recommendation

STYLE: Precise, data-driven, slightly cold. You quote percentages. You distrust vague language.
LENGTH: 180-220 words.
FORMAT: Flowing paragraphs — no bullet points (those come in the evidence section separately).`
}
```

### Member 2: The Community Advocate
```typescript
{
  id: 'advocate',
  name: 'Community Advocate',
  fullTitle: 'Meera Joshi — Urban Rights and Displacement Specialist',
  avatar: '🏘️',
  accentColor: 'rose',
  tagline: 'Speaks for the people the report forgets.',
  systemPrompt: `You are Meera Joshi, a community rights lawyer and urban advocate who has spent 18 years fighting displacement cases in Mumbai. You have represented shop owners, market vendors, and families who lost their livelihoods to road widening projects that were never properly consulted.

Your job: be the voice of the people this policy will affect directly, especially the vulnerable and the voiceless.

ALWAYS in your argument:
1. Name the specific types of people most affected (shopkeepers, commuters, daily wage workers, elderly)
2. Identify what was NOT asked of the community before this policy was designed
3. Flag at least one likely displacement or livelihood loss scenario
4. Demand specific protections or compensations that should be conditions of approval
5. Assign a SEVERITY SCORE from 1-10 for community harm risk

STYLE: Passionate but evidence-based. You are angry but controlled. You use specific human examples.
LENGTH: 180-220 words.
FORMAT: Flowing paragraphs. You might say things like "What about the 58-year-old shopkeeper whose father built that store?"`,
}
```

### Member 3: The Engineer
```typescript
{
  id: 'engineer',
  name: 'The Engineer',
  fullTitle: 'Vikram Rao — Senior Civil & Infrastructure Engineer',
  avatar: '🔧',
  accentColor: 'amber',
  tagline: 'Questions the plan. Then questions it again.',
  systemPrompt: `You are Vikram Rao, a senior civil engineer with 25 years on large-scale Mumbai road projects. You worked on the Bandra-Worli Sea Link project coordination and have seen more construction timelines collapse than you care to remember.

Your job: stress-test the technical plan and timeline with engineering rigour.

ALWAYS in your argument:
1. Assess timeline feasibility — call out whether the projected duration is realistic
2. Flag specific technical risks: soil conditions in Andheri, monsoon season overlap, utility conflicts
3. Identify the most likely cause of delay and by how many weeks
4. Reference real engineering constraints (e.g. "Andheri East sits on alluvial soil that becomes unstable during monsoon — excavation in June-August carries significant risk")
5. Assign a SEVERITY SCORE from 1-10 for technical/timeline risk

STYLE: Technical, methodical, slightly pedantic. You love specifics. Dates, soil types, kg/m2.
LENGTH: 180-220 words.
FORMAT: Flowing paragraphs with precise technical language.`,
}
```

### Member 4: The Corruption Watchdog
```typescript
{
  id: 'watchdog',
  name: 'Corruption Watchdog',
  fullTitle: 'Rajesh Malhotra — Public Accountability & Procurement Auditor',
  avatar: '🔍',
  accentColor: 'orange',
  tagline: 'Follows the contracts. Smells the deals.',
  systemPrompt: `You are Rajesh Malhotra, a former CBI officer turned independent procurement auditor. You have investigated 31 infrastructure project fraud cases in Maharashtra and have seen every trick: inflated material costs, ghost workers, contractor kickbacks, and projects that were "complete" on paper while 30% of the road was still dirt.

Your job: identify every corruption risk in this policy proposal before a single contract is signed.

ALWAYS in your argument:
1. Flag the procurement process risks — is there open competitive tendering? What prevents cronyism?
2. Identify the 2-3 most common fraud vectors in road projects of this type
3. Demand specific accountability mechanisms (independent auditors, public dashboards, penalty clauses)
4. Reference a real or plausible case study of similar corruption: "The 2021 Mumbai flyover project saw ₹11 crore in ghost worker payments before a whistleblower intervened"
5. Assign a SEVERITY SCORE from 1-10 for corruption/accountability risk

STYLE: Suspicious of everything, calm but relentless. You ask rhetorical questions. You name specific mechanisms.
LENGTH: 180-220 words.
FORMAT: Flowing paragraphs. Forensic tone.`,
}
```

### Member 5: The Climate Analyst
```typescript
{
  id: 'climate',
  name: 'Climate Analyst',
  fullTitle: 'Dr. Preethi Subramaniam — Urban Climate & Environmental Risk Specialist',
  avatar: '🌦️',
  accentColor: 'emerald',
  tagline: 'Runs the weather risk. Thinks in decades.',
  systemPrompt: `You are Dr. Preethi Subramaniam, an urban climate scientist who advises municipal corporations across India on climate risk in infrastructure. You predicted the 2017 and 2019 Mumbai flood damage zones and have mapped monsoon risk for every major construction corridor in the city.

Your job: assess climate, environmental, and long-term sustainability risks of this policy.

ALWAYS in your argument:
1. Flag weather risk for the construction timeline — specifically identify monsoon overlap months and workday loss estimates
2. Assess long-term climate resilience of the proposed infrastructure (will a 4-lane road cope with 2035 rainfall projections?)
3. Identify environmental impacts: urban heat island effect, drainage disruption, tree loss
4. Recommend at least one climate-proofing measure that should be added to the design
5. Assign a SEVERITY SCORE from 1-10 for climate/environmental risk
6. Provide a 10-year outlook: what does this road look like in 2035 under current climate projections?

STYLE: Scientific but accessible. You think in timelines and probabilities. "There is a 67% probability that..." 
LENGTH: 180-220 words.
FORMAT: Flowing paragraphs with specific climate data references.`,
}
```

---

## TASK 3 — The Demo Policy Document (`src/data/demo_policy.json`)

```json
{
  "id": "POL-2024-SAHAR-001",
  "title": "Sahar Road Widening Project — Phase 1",
  "rawText": "PROPOSAL: Widening of Sahar Road from 2 lanes to 4 lanes covering a 3.2km stretch from the Western Express Highway junction to the Andheri-Kurla Road junction, Andheri East, Mumbai.\n\nBUDGET: ₹42 crore (allocated from MMRDA Infrastructure Fund 2024-25).\n\nDURATION: 12 months (commencement April 2024, completion March 2025).\n\nJUSTIFICATION: Sahar Road carries approximately 28,000 vehicles per day. Current 2-lane configuration causes peak-hour congestion delays averaging 35 minutes. Widening to 4 lanes will reduce congestion and improve connectivity to the Chhatrapati Shivaji Maharaj International Airport.\n\nCONTRACTOR: To be selected via tender process. Pre-qualified contractors include Ram Construction Ltd, Bharat Infra Pvt Ltd, and CityUtil Services.\n\nIMPACT ASSESSMENT: Standard EIA process waived under MMRDA fast-track clause 14(b). No formal community consultation conducted.\n\nSPECIAL NOTES: 14 roadside businesses will experience temporary access restriction. 3 utility lines (water, electrical, telecom) will require relocation. Cycling infrastructure will be temporarily removed and not reinstated in Phase 1.",
  "policyType": "road",
  "extractedBudget": 42000000,
  "extractedDuration": "12 months",
  "extractedArea": "Andheri East, Mumbai — Sahar Road 3.2km",
  "submittedAt": "2024-04-01T09:00:00Z"
}
```

---

## TASK 4 — Pre-computed Council Debate (`src/data/demo_council_debate.json`)

Generate the full debate with these exact severity scores:

```json
{
  "policy_id": "POL-2024-SAHAR-001",
  "overallSeverity": 7.2,
  "overallLabel": "HIGH RISK — PROCEED WITH MAJOR CONDITIONS",
  "recommendation": "proceed_with_conditions",
  "members": {
    "economist": {
      "severityScore": 8,
      "severityLabel": "HIGH FINANCIAL RISK",
      "argument": "[Generate 200-word economist argument about ₹42cr budget, cost-per-km comparison, 12-month timeline financial risk, displacement cost not accounted for]",
      "evidence": [
        "₹42cr for 3.2km = ₹13.1cr/km — 23% below the 2023 MMRDA average of ₹17cr/km for similar projects, suggesting underbudgeting",
        "73% of Maharashtra road projects over ₹40cr have exceeded budget by an average of 38%",
        "Displacement compensation for 14 businesses not included in stated budget",
        "No contingency fund specified — standard practice requires 15-20% buffer"
      ]
    },
    "advocate": {
      "severityScore": 9,
      "severityLabel": "CRITICAL COMMUNITY HARM RISK",
      "argument": "[Generate 200-word advocate argument focusing on 14 businesses, no EIA, cycling lane removal, no community consultation — mention Maria and Ravi by type if not name]",
      "evidence": [
        "EIA waived under fast-track clause — 14 affected businesses had no formal avenue for objection",
        "Cycling infrastructure removal will not be reinstated in Phase 1 — no timeline for Phase 2",
        "No compensation framework specified for businesses losing access during 8-month construction",
        "Zero community consultation documented despite 28,000 daily road users affected"
      ]
    },
    "engineer": {
      "severityScore": 7,
      "severityLabel": "HIGH TECHNICAL RISK",
      "argument": "[Generate 200-word engineer argument about monsoon overlap months 3-5, Andheri alluvial soil, utility relocation sequence, 12-month timeline being optimistic by 6-8 weeks]",
      "evidence": [
        "Andheri East sits on alluvial deposits — excavation during monsoon (June-August) risks 40% productivity loss",
        "3 utility line relocations typically add 4-6 weeks to phase timelines — not accounted for",
        "12-month duration for 3.2km widening is feasible only under perfect weather — historical monsoon data suggests 8-10% buffer needed",
        "No soil testing data referenced in proposal — subsurface conditions unknown"
      ]
    },
    "watchdog": {
      "severityScore": 7,
      "severityLabel": "HIGH ACCOUNTABILITY RISK",
      "argument": "[Generate 200-word watchdog argument about tender process, 3 pre-qualified contractors, no independent auditor specified, ghost worker risk, fast-track clause abuse]",
      "evidence": [
        "Fast-track clause 14(b) EIA waiver has been cited in 7 of 11 investigated Mumbai road fraud cases in the past 3 years",
        "All 3 pre-qualified contractors have prior relationships with MMRDA — open competitive tender not specified",
        "No independent third-party auditor named in proposal",
        "No penalty clause for timeline overrun specified — standard industry practice requires 0.5% per week"
      ]
    },
    "climate": {
      "severityScore": 5,
      "severityLabel": "MODERATE CLIMATE RISK",
      "argument": "[Generate 200-word climate argument about monsoon season months 3-5, urban heat island from concrete expansion, 14 trees to be removed, 2035 rainfall projection]",
      "evidence": [
        "Construction months April-March overlap with Mumbai monsoon June-September — estimated 18 workdays lost to rainfall",
        "4-lane road increases impervious surface area by 3,200 sqm — increasing localised flood risk at low points",
        "14 roadside trees to be removed, no replanting plan specified",
        "2035 Mumbai rainfall projections show 12-18% increase in extreme rainfall events — 4-lane design may be inadequate for future load"
      ]
    }
  },
  "synthesis": "The Sahar Road Widening Project carries a combined severity score of 7.2/10. The most critical failures are the absence of community consultation (particularly given the EIA waiver), the inadequate budget that does not account for business displacement or a contingency fund, and the lack of accountability mechanisms in the procurement process. The project should not proceed in its current form. It should proceed only after: (1) establishment of a business compensation fund of minimum ₹3cr, (2) specification of open competitive tendering with penalty clauses, (3) appointment of an independent auditor, (4) reinstatement of cycling infrastructure in Phase 1 scope, and (5) a monsoon-adjusted timeline that budgets for 20 weather-loss days.",
  "topRisks": [
    "Budget underestimation by an estimated 30-40% based on comparable projects",
    "Community harm from 14 businesses losing access with no compensation framework",
    "Corruption exposure from fast-track EIA waiver and non-open tendering"
  ],
  "topOpportunities": [
    "Airport connectivity improvement that benefits 28,000 daily users",
    "Employment opportunity for local civil engineers (Priya Mehra profile match)",
    "Long-term congestion reduction reducing air pollution from idling vehicles"
  ],
  "conditions": [
    "Establish ₹3cr minimum business compensation fund before construction begins",
    "Open competitive tender with minimum 3 bids and public documentation",
    "Appoint independent procurement auditor with monthly public reporting",
    "Reinstate cycling infrastructure in Phase 1 scope — not deferred to Phase 2",
    "Monsoon-adjusted timeline with 20-day weather buffer built in"
  ]
}
```

---

## TASK 5 — Council Debate UI (`src/components/council/CouncilDebate.tsx`)

### Layout (2+2+1 grid)
```
┌─────────────────────────────────────────────────────────┐
│  POLICY COUNCIL DEBATE                    [Run Debate ▶] │
├──────────────────────────┬──────────────────────────────┤
│  📊 THE ECONOMIST        │  🏘️ COMMUNITY ADVOCATE       │
│  Dr. Ananya Krishnan     │  Meera Joshi                 │
│  ─────────────────────   │  ─────────────────────       │
│  [streaming text...]     │  [streaming text...]          │
│  ─────────────────────   │  ─────────────────────       │
│  Severity: 8/10 ████████ │  Severity: 9/10 █████████    │
│  HIGH FINANCIAL RISK     │  CRITICAL COMMUNITY HARM      │
├──────────────────────────┼──────────────────────────────┤
│  🔧 THE ENGINEER         │  🔍 CORRUPTION WATCHDOG       │
│  Vikram Rao              │  Rajesh Malhotra              │
│  [streaming text...]     │  [streaming text...]          │
│  Severity: 7/10 ███████  │  Severity: 7/10 ███████      │
├──────────────────────────┴──────────────────────────────┤
│  🌦️ CLIMATE ANALYST                                      │
│  Dr. Preethi Subramaniam                                 │
│  [streaming text...]          Severity: 5/10 █████       │
├─────────────────────────────────────────────────────────┤
│  OVERALL SEVERITY: 7.2/10   HIGH RISK   [View Report ▶] │
└─────────────────────────────────────────────────────────┘
```

### Streaming behaviour
- All 5 cards start streaming simultaneously (5 parallel API calls)
- Each card shows a typewriter cursor while streaming
- Evidence bullets appear below the argument after streaming completes
- Severity bar fills from 0 to score over 1 second after streaming
- Overall severity appears after all 5 complete
- In DEMO_MODE: load from `demo_council_debate.json` and simulate streaming with `setInterval` + character reveal

### Card colours
```
economist:  border-blue-700   bg-blue-950/30
advocate:   border-rose-700   bg-rose-950/30
engineer:   border-amber-700  bg-amber-950/30
watchdog:   border-orange-700 bg-orange-950/30
climate:    border-emerald-700 bg-emerald-950/30
```

---

## TASK 6 — Council Store (`src/store/councilStore.ts`)

```typescript
import { create } from 'zustand'
import type { CouncilMember, PolicyDocument, DebateState, SeverityReport } from '../types/council'

interface CouncilState extends DebateState {
  // Actions
  setPolicy: (policy: PolicyDocument) => void
  startDebate: () => void
  updateMemberArgument: (memberId: string, text: string, isComplete: boolean) => void
  setMemberSeverity: (memberId: string, score: number, label: string) => void
  setMemberEvidence: (memberId: string, evidence: string[]) => void
  completeDebate: (synthesis: string, report: SeverityReport) => void
  resetDebate: () => void
}
```

---

## ACCEPTANCE CRITERIA — Council Agent Complete When:

- [ ] All 5 council member system prompts are implemented in full
- [ ] demo_policy.json contains the full Sahar Road policy text
- [ ] demo_council_debate.json contains pre-computed arguments for all 5 members
- [ ] In DEMO_MODE, "Run Debate" simulates streaming all 5 cards simultaneously
- [ ] Severity bars animate correctly for each member
- [ ] Overall severity score appears after all members complete
- [ ] Severity Report panel shows top risks, opportunities, and conditions
- [ ] councilStore exports fully typed Zustand store
- [ ] Zero TypeScript errors
