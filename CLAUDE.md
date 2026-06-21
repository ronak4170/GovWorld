# GOVWORLD — Master Specification for Claude Code
## "The Living City" — A Real-Time AI-Populated Government Policy Simulator

---

## 0. PRIME DIRECTIVE FOR CLAUDE CODE

You are building GOVWORLD: a SimCity-style, real-time, 3D, AI-populated simulation of any real neighbourhood on Earth. Governments upload infrastructure policies, watch them ripple through 1,000 AI citizens who have real lives and real reactions, debate the policy with five adversarial AI council members, assign real workers from the citizen population to real tasks, fast-forward time to see consequences, and talk to any citizen by voice at any moment.

**This is not a dashboard. This is not a map with pins. This is a living, breathing city populated by AI people.**

### Non-negotiable principles for every decision you make:
1. **Human-first, not infrastructure-first.** The road is the input. The human life is the output.
2. **Every feature must be demoable in isolation.** If the map breaks, the debate still works. If the debate breaks, the citizen voice chat still works.
3. **Pre-computation is production.** All LLM responses for the hackathon demo scenario must be pre-computed and cached as JSON. Zero live API calls during judging.
4. **One file per agent.** Never let two agent modules write to the same file.
5. **Mobile-first UI.** Judges will look at this on laptops and phones. It must be stunning at 1280px width.
6. **The demo must be startable with one command:** `npm run demo`

---

## 0.5. AS-BUILT STATUS (source of truth — read this first)

> The sections below this one describe the *original* design intent. The codebase has since
> diverged. **Where this section conflicts with anything later in the file, this section wins.**
> Keep it updated as the code changes.

### Scenario moved: Mumbai → San Francisco
The demo is no longer Andheri East, Mumbai. It is now the **Van Ness Avenue Complete Streets — Phase 1**
project in **San Francisco** (centre `37.7790, -122.4193`; corridor Market St → Jackson St).
Budget **$45M USD**, currency is `$`. Timeline is modelled as **12 monthly ticks** (`DEMO_TOTAL_MONTHS=12`),
though the UI exposes a `TIME_FRAMES` selector (30 days → 5 years) in `src/lib/constants.ts`.

Some files still contain **leftover Mumbai/India artefacts** (the word "monsoon", `₹`/`crore`,
"festival rush", "ward meeting", and an `ORG_DAILY` label that maps to "San Francisco Chronicle"
but reads like the old Mumbai paper). These are migration residue in `src/lib/swarmSimulation.ts`,
`src/lib/llm.ts`, and `src/lib/deepgram.ts` (`₹`/`crore` text-prep) — treat them as bugs to clean up,
not intent.

### The 6 featured citizens were re-cast for SF (`src/data/demo_citizens.json`, 50 total)
| ID | Name | Age | Job |
|---|---|---|---|
| C001 | Jasmine Chen | 34 | SFMTA Bus Driver |
| C002 | Tony Ricci | 57 | Restaurant Owner |
| C003 | Sofia Rodriguez | 26 | Civil Engineer (assigned as inspector) |
| C004 | Earl Washington | 72 | Retired, diabetic, no car |
| C005 | Amy Park | 41 | Elementary School Teacher |
| C006 | Tyler Brooks | 29 | Startup Founder, cyclist |

### Map is Leaflet, NOT Cesium
`src/components/map/CesiumWorld.tsx` is a **misnomer** — it renders **Leaflet + OpenStreetMap**
(`react-leaflet`), no API key required. Citizen dots (`CitizenDots.tsx`) and the construction
overlay (`ConstructionOverlay.tsx`) are Leaflet layers. Cesium/Three.js are still in
`package.json` but the live map does not use Cesium 3D Tiles. `ANDHERI_EAST_COORDS` in
`constants.ts` is a stale name that now holds the SF coordinates.

### Council expanded: 5 fixed members → pool of 10 selectable experts
`EXPERT_POOL` in `src/store/councilStore.ts` defines **10 SF experts** (economist, advocate,
engineer, watchdog, climate, lawyer, urbanplanner, health, transport, heritage). The user selects
**2–7** (default = the original 5). Rich per-expert system prompts live in `EXPERT_SYSTEM_PROMPTS`
in `src/lib/llm.ts`.

There are **two debate UIs**, both opened as full-screen overlays from `Shell.tsx`:
- **Legacy text debate** — `src/components/debate/DebateArena.tsx` (opened via the sidebar "Council" button).
- **Cinematic 3D Council Arena** — `src/components/council/arena/*` (`CouncilArena`, `CouncilChamber3D`,
  `ExpertAvatar3D`, `CinematicSubtitle`, `SeverityReveal`, `DebateControls`), driven by
  `src/lib/debateOrchestrator.ts` (`runCinematicDebate`: round-robin sentence queue, pause/skip/abort).

### New subsystems not in the original spec
- **TTS via Deepgram Aura-2** — `src/lib/deepgram.ts`. Per-expert voices with Web Speech API fallback.
  Requires `VITE_DEEPGRAM_API_KEY`. Used by the debate orchestrator.
- **Live expert web research** — `src/lib/expertResearch.ts`. Before arguing, each expert "researches"
  via Wikipedia API, DuckDuckGo, and `r.jina.ai` page scraping. Demo fallback: `demo_expert_research.json`.
- **Simulation Director** — `src/lib/simulationDirector.ts`. Generative-agents-inspired (Park et al. 2023)
  memory streams / reflection / planning + cascading **edge cases**. Used by `SimControls.tsx`
  (`runSimulation`), `EdgeCaseFeed.tsx`, and `simulationStore.ts`. Has live (LLM) and demo modes.
- **MiroFish "swarm" social-opinion pipeline** — `src/lib/{seedProcessor,ontologyGenerator,graphBuilder,
  swarmSimulation,reportAgent}.ts`, `src/store/swarmStore.ts`, `src/components/swarm/*`, `src/types/swarm.ts`.
  Pipeline: Seed → Ontology → Knowledge Graph → Personas → multi-agent social simulation → prediction report,
  with God's-eye variable injection. **⚠️ Currently NOT mounted anywhere in the UI** — it is complete but
  dormant code. Wire `SwarmEngine`/`SwarmFeed` into `Shell.tsx` to surface it.

### LLM routing (as built, `src/lib/llm.ts`)
| Use | Provider/model |
|---|---|
| Citizen profiles, citizen reactions, worker assignment, council arguments, swarm posts, report sections, ontology | **Gemini 2.5 Flash** (`VITE_GEMINI_API_KEY`) |
| Real-time citizen voice chat + per-turn debate arguments | **Groq Llama 3.3 70B** (`VITE_GROQ_API_KEY`) |
| Expert debate speech (TTS) | **Deepgram Aura-2** (`VITE_DEEPGRAM_API_KEY`) |

`DEMO_MODE` = `VITE_DEMO_MODE === 'true' || VITE_SKIP_API === 'true'`. In demo mode every function loads
pre-computed JSON or throws a "use fallback" error the caller catches.

### Data files (`src/data/`) — beyond the original six
`demo_citizens.json`, `demo_policy.json`, `demo_council_debate.json`, `demo_simulation_ticks.json`,
`demo_citizen_reactions.json`, `demo_ledger.json`, **plus** `demo_voice_responses.json`,
`demo_debate_sentences.json`, `demo_expert_research.json`.

### UI / layout (as built)
- **Theme:** warm "mission control" brown/orange (`#160c06`, `#ffb690`, accent `#f97316`), Material Symbols
  icons, `Geist` wordmark — **not** the slate-950 palette described in §8. Styles in `src/globals.css`.
- **Shell** (`src/components/layout/Shell.tsx`): 48px left rail (`Sidebar`) · centre Leaflet map · fixed
  **360px** right panel (`PanelManager`) · bottom `TimelineBar` · `SimulationEngine` running headless.
- **Right panel tabs:** only **Updates / People / Ledger** (`PanelManager.tsx`). Citizen selection auto-opens
  the People tab → `CitizenCard`. `PANEL_IDS` still lists COUNCIL/VOICE/POLICY/EDGE_CASES but they are not tabs.
- **Voice chat** (`CitizenChat`) and **DissatisfactionAlert** render as fixed overlays.

### Agent spec / config files
- Agent specs (`AGENT_*.md`) live at the **repo root**, not `/agents/`.
- `.claude/agents/` holds 6 Claude Code subagent definitions (map, citizen, council, simulation, voice, ledger).
- `env.example` is **stale** (says `VITE_DEMO_NEIGHBOURHOOD=andheri`; missing nothing critical but out of date).
  `DEMO_NEIGHBOURHOOD` in code is `'vanness'`.

### Scripts
`npm run demo` (demo mode), `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`,
`npm run precompute` (regenerate `/src/data/` via `scripts/precompute_demo.ts`).

---

## 1. PROJECT OVERVIEW

### What GOVWORLD is
A government policy simulation platform that:
- Reconstructs any real neighbourhood in photorealistic 3D using Cesium.js + Google Photorealistic 3D Tiles
- Populates it with 50 AI citizens (demo scale; architecture supports 1,000) who have names, jobs, families, fears, daily routes, and skills
- Accepts an infrastructure policy as input (starting with road construction)
- Runs the policy through a 5-agent adversarial debate council (Economist, Community Advocate, Engineer, Corruption Watchdog, Climate Analyst)
- Simulates 12 months of consequences through a tick-based engine
- Shows the world changing in 3D as construction progresses
- Lets any citizen be clicked and spoken to by voice at any point in the simulation
- Assigns real workers from the citizen population to real construction tasks
- Tracks all tasks in an accountability ledger with projected vs actual timelines
- Flags overdue contractors, weather conflicts, and resource bottlenecks automatically

### What GOVWORLD is NOT
- Not a general-purpose chatbot
- Not a static dashboard
- Not a GIS tool
- Not a game (though it feels like one)
- Not dependent on real government data (synthetic data for demo)

### The one-line pitch
"Every government can now simulate what happens to Maria, Ravi, and Arjun before a single brick is laid — and see corruption flagged before a single contract is signed."

### The judge demo moment (90 seconds)
1. "We are going to widen the main road in this neighbourhood." → policy pasted in
2. The 3D street appears. Citizens (coloured dots) move along their routes.
3. Council debate fires — 5 agent cards fill simultaneously with live arguments
4. "Run 12 months." → Citizens reroute. A shop goes amber. Scaffolding appears on the road.
5. Click one dot — Maria, 34, bus driver. Say: "How is this affecting you?" She answers by voice.
6. Fast-forward to month 12. Road is done. Accountability ledger shows Contractor B ran 3 months late. Flag is already red.
7. "This is what anti-corruption looks like."

---

## 2. TECH STACK — LOCKED, DO NOT DEVIATE

### Frontend
- **React 18** + **Vite** (TypeScript)
- **Tailwind CSS** (utility classes only, no custom CSS files except globals.css)
- **Cesium.js** (v1.115+) for 3D photorealistic world
- **Google Photorealistic 3D Tiles** via Cesium (free tier, requires GOOGLE_MAPS_API_KEY env var)
- **Three.js** (r165) for citizen dot rendering overlaid on Cesium
- **Tone.js** (v14) for ambient generative soundscape
- **face-api.js** (v0.22) for in-browser emotion detection from webcam (optional enhancement, do not block on this)

### AI / LLM
- **Gemini 2.5 Flash** via `@google/generative-ai` SDK — for slow thinkers: Director, Playwright, Council agents
- **Groq** via `groq-sdk` — for fast responders: citizen voice chat (Llama 3.3 70B), sub-second
- **Web Speech API** (browser native) — SpeechRecognition for user voice input, SpeechSynthesis for citizen voice output
- All LLM calls wrapped in `/src/lib/llm.ts` — never call APIs directly from components

### Data / State
- **Zustand** for global state management
- **JSON flat files** in `/src/data/` for pre-computed demo data
- **No database.** All state is in-memory + localStorage for persistence between browser refreshes
- **Open-Meteo API** for weather data (free, no key needed)
- **OpenStreetMap / Leaflet** for road network data fallback

### External APIs (all free tier)
```
GOOGLE_MAPS_API_KEY=      # Google Photorealistic 3D Tiles + Earth Studio
GEMINI_API_KEY=           # Gemini 2.5 Flash (1,500 req/day free)
GROQ_API_KEY=             # Groq Llama 3.3 70B (30 RPM free)
```

### Build / Deploy
- **Vercel** for deployment (one command: `vercel --prod`)
- **npm** for package management
- Node.js 20+

---

## 3. PROJECT DIRECTORY STRUCTURE

```
govworld/
├── CLAUDE.md                          # This file — master spec
├── TASKS.md                           # Agent task board (auto-managed)
├── .env.local                         # API keys (never commit)
├── .env.example                       # Template for keys
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── agents/                            # Agent specification files
│   ├── AGENT_MAP.md                   # Map Agent spec
│   ├── AGENT_CITIZENS.md              # Citizen Generation Agent spec
│   ├── AGENT_COUNCIL.md               # Policy Council Agent spec
│   ├── AGENT_SIMULATION.md            # Simulation Engine Agent spec
│   ├── AGENT_VOICE.md                 # Citizen Voice Chat Agent spec
│   └── AGENT_LEDGER.md                # Accountability Ledger Agent spec
│
├── public/
│   └── assets/
│       └── icons/
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                        # Root component, routing
│   ├── globals.css
│   │
│   ├── lib/                           # Shared utilities — no UI
│   │   ├── llm.ts                     # ALL LLM calls go through here
│   │   ├── weather.ts                 # Open-Meteo API wrapper
│   │   ├── speech.ts                  # Web Speech API wrapper
│   │   ├── cesium.ts                  # Cesium initialisation helpers
│   │   └── constants.ts               # All magic numbers and strings
│   │
│   ├── store/                         # Zustand stores
│   │   ├── worldStore.ts              # Map, camera, neighbourhood state
│   │   ├── citizenStore.ts            # Citizen profiles, positions, states
│   │   ├── councilStore.ts            # Council debate state
│   │   ├── simulationStore.ts         # Tick state, timeline, events
│   │   ├── ledgerStore.ts             # Tasks, contractors, flags
│   │   └── uiStore.ts                 # UI panels, selected citizen, modals
│   │
│   ├── data/                          # Pre-computed JSON for demo
│   │   ├── demo_citizens.json         # 50 pre-generated citizen profiles
│   │   ├── demo_policy.json           # The demo road-widening policy
│   │   ├── demo_council_debate.json   # Pre-computed council arguments
│   │   ├── demo_simulation_ticks.json # Pre-computed 12 monthly ticks
│   │   ├── demo_citizen_reactions.json# Pre-computed citizen reactions per tick
│   │   └── demo_ledger.json           # Pre-computed task assignments + flags
│   │
│   ├── components/
│   │   ├── map/                       # OWNED BY: Map Agent
│   │   │   ├── CesiumWorld.tsx        # Main Cesium viewer component
│   │   │   ├── CitizenDots.tsx        # Three.js citizen dot overlay
│   │   │   ├── ConstructionOverlay.tsx# Road construction visual progress
│   │   │   ├── NeighbourhoodSelector.tsx # Initial postcode/area input
│   │   │   └── MapControls.tsx        # Zoom, rotate, time controls
│   │   │
│   │   ├── citizens/                  # OWNED BY: Citizen Agent
│   │   │   ├── CitizenCard.tsx        # Expanded citizen profile panel
│   │   │   ├── CitizenList.tsx        # Sidebar list of all citizens
│   │   │   ├── CitizenStatus.tsx      # Colour-coded status indicator
│   │   │   └── CitizenGenerator.tsx   # UI for generating new citizens
│   │   │
│   │   ├── council/                   # OWNED BY: Council Agent
│   │   │   ├── CouncilDebate.tsx      # Main debate panel, 5 cards
│   │   │   ├── AgentCard.tsx          # Individual council member card
│   │   │   ├── SeverityReport.tsx     # Post-debate severity scores
│   │   │   └── PolicyInput.tsx        # Policy text upload/paste UI
│   │   │
│   │   ├── simulation/                # OWNED BY: Simulation Agent
│   │   │   ├── SimulationEngine.tsx   # Tick controller, not a visual component
│   │   │   ├── TimelineBar.tsx        # 12-month progress scrubber
│   │   │   ├── EventFeed.tsx          # Live event log as sim runs
│   │   │   └── SimControls.tsx        # Play, pause, speed, reset
│   │   │
│   │   ├── voice/                     # OWNED BY: Voice Agent
│   │   │   ├── CitizenChat.tsx        # Voice conversation modal
│   │   │   ├── VoiceIndicator.tsx     # Listening/speaking animation
│   │   │   └── TranscriptPanel.tsx    # Conversation transcript
│   │   │
│   │   ├── ledger/                    # OWNED BY: Ledger Agent
│   │   │   ├── AccountabilityLedger.tsx # Main ledger table
│   │   │   ├── TaskRow.tsx            # Individual task with progress bar
│   │   │   ├── ContractorFlag.tsx     # Red flag component
│   │   │   └── WorkerAssignment.tsx   # Worker-to-task assignment UI
│   │   │
│   │   └── layout/                    # SHARED — no agent owns this
│   │       ├── Shell.tsx              # App shell, sidebar, main area
│   │       ├── Sidebar.tsx            # Left navigation
│   │       ├── TopBar.tsx             # Header with neighbourhood name
│   │       └── PanelManager.tsx       # Which right panel is visible
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useCitizen.ts
│   │   ├── useSimulation.ts
│   │   ├── useCouncil.ts
│   │   ├── useSpeech.ts
│   │   └── useWeather.ts
│   │
│   └── types/                         # TypeScript interfaces
│       ├── citizen.ts
│       ├── policy.ts
│       ├── council.ts
│       ├── simulation.ts
│       └── ledger.ts
│
└── scripts/
    ├── precompute_demo.ts             # Run this to generate all /data/ JSON files
    └── seed_citizens.ts              # Generate citizen profiles via LLM
```

---

## 4. CORE DATA MODELS (TypeScript interfaces — implement exactly)

### 4.1 Citizen
```typescript
interface Citizen {
  id: string                    // UUID
  name: string                  // Full name
  age: number
  gender: 'male' | 'female' | 'nonbinary'
  occupation: string            // Job title
  employer: string              // Where they work
  monthlyIncome: number         // In local currency
  familyStructure: string       // e.g. "Single mother, 2 children"
  homeCoords: [number, number]  // [lat, lng]
  workCoords: [number, number]
  dailyRoute: [number, number][]// Ordered waypoints home→work
  skills: string[]              // e.g. ["civil engineering", "inspection"]
  fears: string                 // One sentence
  hopes: string                 // One sentence
  healthStatus: 'healthy' | 'chronic_condition' | 'mobility_limited'
  statusColor: 'green' | 'amber' | 'red' | 'grey'
  // green = thriving, amber = stressed, red = crisis, grey = displaced/closed
  statusHistory: SimulationEvent[]
  currentTick: number           // Which month of simulation they're in
  policyImpact: string          // LLM-generated impact summary
  persona: string               // Full persona prompt for voice chat
  isWorker: boolean             // Whether assigned to construction task
  assignedTaskId?: string
}
```

### 4.2 Policy
```typescript
interface Policy {
  id: string
  title: string
  description: string           // Full text as uploaded
  policyType: 'road' | 'housing' | 'utilities' | 'parks' | 'transit'
  targetArea: string            // Neighbourhood name
  budget: number
  plannedStartDate: string      // ISO date
  plannedEndDate: string        // ISO date
  affectedZone: GeoJSON.Polygon // Area polygon on map
  submittedAt: string
}
```

### 4.3 CouncilMember
```typescript
interface CouncilMember {
  id: 'economist' | 'advocate' | 'engineer' | 'watchdog' | 'climate'
  name: string                  // e.g. "The Economist"
  avatar: string                // Emoji for display
  color: string                 // Tailwind color class
  stance: string                // One-sentence persona description
  systemPrompt: string          // Full LLM system prompt
  argument: string              // Generated argument text
  severityScore: number         // 1-10 risk rating they assign
  severityLabel: string         // e.g. "HIGH FINANCIAL RISK"
  citedEvidence: string[]       // Sources/data points they cite
  isStreaming: boolean
  isComplete: boolean
}
```

### 4.4 SimulationTick
```typescript
interface SimulationTick {
  month: number                 // 1-12
  label: string                 // e.g. "Month 3 — Construction Phase 1"
  constructionProgress: number  // 0-100 percentage
  weatherEvent?: string         // e.g. "Monsoon season — 14 workdays lost"
  citizenUpdates: CitizenUpdate[]
  events: SimulationEvent[]
  mapOverlays: MapOverlay[]     // What appears/disappears on the 3D map
}

interface CitizenUpdate {
  citizenId: string
  newStatus: Citizen['statusColor']
  narrative: string             // What happened to them this month
  routeChange?: [number, number][]
}

interface SimulationEvent {
  id: string
  tick: number
  type: 'construction' | 'displacement' | 'employment' | 'closure' | 'completion' | 'flag'
  title: string
  description: string
  affectedCitizenIds: string[]
  severity: 'info' | 'warning' | 'critical'
}
```

### 4.5 LedgerTask
```typescript
interface LedgerTask {
  id: string
  title: string                 // e.g. "Road excavation — Block A"
  contractor: string            // Company name
  contractorHistory: string     // e.g. "2 of 3 previous projects delayed"
  assignedWorkers: string[]     // Citizen IDs
  projectedStartDate: string
  projectedEndDate: string
  actualStartDate?: string
  actualEndDate?: string
  progressPercent: number
  status: 'pending' | 'active' | 'delayed' | 'flagged' | 'complete'
  delayDays: number
  flagReason?: string           // Why flagged
  weatherImpactDays: number
  budget: number
  spentToDate: number
}
```

---

## 5. DEMO SCENARIO (Pre-compute this exactly)

### The Neighbourhood
**Name:** Andheri East, Mumbai (use real coordinates: 19.1136° N, 72.8697° E)
**Policy:** "Widening of Sahar Road from 2 lanes to 4 lanes — Phase 1 (3.2km stretch)"
**Budget:** ₹42 crore
**Duration:** 12 months
**Planned start:** Month 1 of simulation

### The 6 Featured Citizens (must be exactly these — voice chat pre-built for these)

| ID | Name | Age | Job | Impact |
|---|---|---|---|---|
| C001 | Maria Santos | 34 | BEST bus driver | Route adds 40 min; misses school pickup |
| C002 | Ravi Nair | 58 | Shop owner on Sahar Rd | Storefront blocked 8 months; revenue -60% |
| C003 | Priya Mehra | 26 | Unemployed civil engineer | Gets assigned to road inspection team in Month 2 |
| C004 | Arjun Pillai | 72 | Retired, diabetic, no car | New road connects him to clinic he couldn't reach |
| C005 | Fatima Sheikh | 41 | Schoolteacher | Dust and noise affect her classroom for 6 months |
| C006 | Dev Patel | 29 | Startup founder, cycles to work | Cycling lane removed; safety risk; considers relocating |

### The 12 Tick Narrative (what happens each month)

| Month | Key Event | Citizen Impact | Map Change |
|---|---|---|---|
| 1 | Excavation begins Block A | Ravi amber; Maria rerouted | Orange construction zone appears |
| 2 | Priya assigned as inspector | Priya green; assigned badge | Worker dot on map |
| 3 | Monsoon — 14 days lost | Contractor B flagged (delay) | Weather overlay |
| 4 | Block A complete; Block B starts | Ravi red (peak disruption) | Block A overlay changes to completed |
| 5 | Fatima's school dust complaint | Fatima amber | School marker highlighted |
| 6 | Contractor B misses milestone | Red flag fires in ledger | Flag icon on map |
| 7 | Midpoint review; council re-debates | All citizens updated | Mid-construction visual |
| 8 | Block B complete | Ravi still amber | Block B overlay complete |
| 9 | Dev files relocation intent | Dev red | Dev dot moves toward city edge |
| 10 | Utility pipe burst (unplanned) | Budget +₹4cr; delay +3 weeks | Alert on ledger |
| 11 | Block C complete; final stretch | Ravi amber→green (seeing end) | Nearly complete road |
| 12 | Road complete | Arjun green (clinic access); Maria route normalised | Full road overlay; celebration event |

---

## 6. LLM CALL ARCHITECTURE

### Rule: All LLM calls go through `/src/lib/llm.ts`

```typescript
// /src/lib/llm.ts — implement this interface exactly

export async function generateCitizenProfile(params: CitizenGenParams): Promise<Citizen>
export async function generateCouncilArgument(member: CouncilMember, policy: Policy): Promise<string>
export async function generateCitizenReaction(citizen: Citizen, tick: SimulationTick, policy: Policy): Promise<CitizenUpdate>
export async function generateVoiceResponse(citizen: Citizen, userMessage: string, simulationContext: string): Promise<string>
export async function generateWorkerAssignment(tasks: LedgerTask[], citizens: Citizen[]): Promise<WorkerAssignment[]>
```

### Model routing
| Function | Model | Why |
|---|---|---|
| generateCitizenProfile | Gemini 2.5 Flash | Batch, non-real-time |
| generateCouncilArgument | Gemini 2.5 Flash | Parallel, streaming |
| generateCitizenReaction | Gemini 2.5 Flash | Batch pre-compute |
| generateVoiceResponse | Groq Llama 3.3 70B | Real-time, sub-second |
| generateWorkerAssignment | Gemini 2.5 Flash | One-time, logic-heavy |

### Rate limit strategy
- Gemini Flash: 1,500 req/day → use for all batch operations
- Groq: 30 RPM → use only for real-time voice (never more than 1 concurrent request)
- If Gemini limit approached: fall back to Groq for council debate
- If both limited: load pre-computed JSON (always the default for demo)

---

## 7. PRE-COMPUTATION SCRIPT

The file `/scripts/precompute_demo.ts` must generate all of the following and write to `/src/data/`:

```
demo_citizens.json          — 50 citizen profiles (6 featured + 44 background)
demo_policy.json            — The Sahar Road widening policy object
demo_council_debate.json    — All 5 council arguments, severity scores, evidence
demo_simulation_ticks.json  — All 12 tick objects with events and map overlays
demo_citizen_reactions.json — All citizen updates for all 12 ticks (50 × 12 = 600 entries)
demo_ledger.json            — All tasks, contractors, assignments, flags
```

Run with: `npm run precompute`

**Critical:** The main app must detect `DEMO_MODE=true` in env and load from JSON files instead of making any API calls. The demo must work with no internet connection.

---

## 8. UI DESIGN SPECIFICATION

### Overall layout (3-panel)
```
┌─────────────────────────────────────────────────────────────┐
│ TOPBAR: GOVWORLD | Andheri East, Mumbai | Month 6 ▶ ⏸ ⏭   │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│ SIDEBAR  │      CESIUM 3D MAP               │  RIGHT PANEL  │
│          │      (60% of screen)             │  (switchable) │
│ - Policy │                                  │               │
│ - Council│   [citizen dots moving]          │ • Council     │
│ - Sim    │   [construction overlay]         │ • Citizen card│
│ - Ledger │   [weather effects]              │ • Ledger      │
│ - People │                                  │ • Voice chat  │
│          │                                  │               │
└──────────┴──────────────────────────────────┴───────────────┘
│ BOTTOM: Timeline scrubber Month 1 ──────────────── Month 12  │
└─────────────────────────────────────────────────────────────┘
```

### Colour system (Tailwind classes)
```
Background:     bg-slate-950  (near black)
Surface:        bg-slate-900
Surface elevated: bg-slate-800
Border:         border-slate-700
Text primary:   text-slate-100
Text secondary: text-slate-400
Text tertiary:  text-slate-600

Accent blue:    text-blue-400 / bg-blue-900/30
Accent green:   text-emerald-400 / bg-emerald-900/30
Accent amber:   text-amber-400 / bg-amber-900/30
Accent red:     text-red-400 / bg-red-900/30

Citizen colours:
  green  → bg-emerald-500  (thriving)
  amber  → bg-amber-500    (stressed)
  red    → bg-red-500      (crisis)
  grey   → bg-slate-500    (displaced)
```

### Citizen dot rendering (on Cesium map)
- Size: 12px diameter sphere in Three.js
- Colour: citizen statusColor mapped above
- Animation: smooth movement along dailyRoute waypoints, cycle every 60 seconds
- Hover: tooltip with name, age, occupation
- Click: opens CitizenCard in right panel + enables voice chat
- Featured citizens (C001–C006): 20px diameter, always labelled with first name

### Construction overlay (on Cesium map)
- Render as a glowing polyline along the road route
- Month 1–3: orange dashed line (excavation in progress)
- Month 4–8: amber solid line with scaffolding icons
- Month 9–11: yellow line (paving)
- Month 12: bright white/grey solid (complete)
- Add directional arrow showing which block is active

### Council debate panel
- 5 cards arranged in a 2-column grid (3 top, 2 bottom, or responsive)
- Each card streams text in real time (typewriter effect) when debate runs
- Card header: emoji avatar + member name + severity badge
- Card body: argument text (streaming) + bullet evidence points
- Card footer: severity score 1–10 with coloured indicator bar
- Final synthesis row appears below all 5 cards after all complete

### Timeline scrubber (bottom bar)
- Full-width horizontal bar
- 12 tick markers with month labels
- Draggable scrub handle (loads pre-computed tick data)
- Play button auto-advances every 3 seconds per tick
- Speed control: 1x / 2x / 5x
- Current tick highlighted; past ticks show completion colour

---

## 9. VOICE CHAT SYSTEM

### Flow
1. User clicks a citizen dot on the map
2. CitizenCard opens in right panel with "Talk to [Name]" button
3. User clicks button — microphone permission requested
4. VoiceIndicator shows listening animation
5. User speaks — Web Speech API transcribes in real time
6. On silence (1.5s gap) → transcript sent to Groq with citizen persona prompt
7. Response arrives (<800ms) → browser speaks it via SpeechSynthesis
8. Transcript appended to TranscriptPanel
9. Conversation continues — stateful (Groq message history maintained in React state)
10. "End conversation" button or clicking elsewhere closes modal

### Citizen persona prompt template
```
You are {citizen.name}, {citizen.age} years old, {citizen.occupation} in Andheri East, Mumbai.

Your life: {citizen.familyStructure}. Monthly income: ₹{citizen.monthlyIncome}.
Your fear: {citizen.fears}
Your hope: {citizen.hopes}
Your health: {citizen.healthStatus}

Current situation (Month {currentTick} of road widening simulation):
{citizen.policyImpact}

Status: {citizen.statusColor} — {statusNarrative}

RULES FOR HOW YOU SPEAK:
- Speak in first person, as yourself — never break character
- Keep responses to 2–3 sentences maximum (voice format)
- Reference specific details from your life when relevant
- Express genuine emotion — if you are struggling, say so
- You do NOT know you are in a simulation
- You speak naturally, with occasional Hindi words if appropriate (e.g., "haan", "bilkul", "arre")
- If asked about the road construction, speak from direct personal experience
```

---

## 10. ACCOUNTABILITY LEDGER SPECIFICATION

### Tasks for the demo scenario (pre-load exactly these)

| Task ID | Title | Contractor | Workers | Projected | Status |
|---|---|---|---|---|---|
| T001 | Excavation Block A (1.1km) | Ram Construction Ltd | C003 + 3 background workers | Month 1–3 | Complete on time |
| T002 | Excavation Block B (1.1km) | Ram Construction Ltd | C003 + 3 background workers | Month 3–6 | Delayed 3 weeks (monsoon) |
| T003 | Excavation Block C (1.0km) | Bharat Infra Pvt Ltd | 4 background workers | Month 6–9 | On track |
| T004 | Road laying Block A | Ram Construction Ltd | 5 background workers | Month 3–5 | Complete |
| T005 | Road laying Block B | Bharat Infra Pvt Ltd | 5 background workers | Month 6–8 | On track |
| T006 | Road laying Block C | Bharat Infra Pvt Ltd | 5 background workers | Month 9–11 | Pending |
| T007 | Utility relocation | CityUtil Services | 3 background workers | Month 2–4 | Complete |
| T008 | Signage + markings | SignPro Ltd | 2 background workers | Month 11–12 | Pending |

### Flag triggers (automatic)
- **Delay flag:** Task actual progress < projected progress by >10% → status = 'flagged', red indicator
- **Budget flag:** spentToDate > budget × 1.15 → yellow flag
- **Contractor flag:** Contractor has history of delays → pre-flag on assignment
- **Weather flag:** Open-Meteo shows >5 consecutive rain days during active task → info flag

### Contractor history (pre-built for demo)
```
Ram Construction Ltd:    "Completed 4/5 projects. 1 project delayed 8 weeks (2022 Juhu Rd project)."
Bharat Infra Pvt Ltd:    "Completed 3/3 projects on time. No flags."
CityUtil Services:       "2/3 projects delayed. Average delay: 3.5 weeks. Under review."
SignPro Ltd:             "No prior projects on record in this municipality."
```

---

## 11. MULTI-AGENT CLAUDE CODE BUILD INSTRUCTIONS

### Enable agent teams
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### TASKS.md structure
Each agent owns its module. Use this exact TASKS.md to initialise the agent team:

```markdown
# GOVWORLD — Agent Task Board

## Status: PENDING | IN_PROGRESS | COMPLETE | BLOCKED

### [PENDING] Map Agent
File: agents/AGENT_MAP.md
Owns: src/components/map/**, src/lib/cesium.ts, src/store/worldStore.ts
Dependency: None — start immediately

### [PENDING] Citizen Agent
File: agents/AGENT_CITIZENS.md
Owns: src/components/citizens/**, src/store/citizenStore.ts, src/data/demo_citizens.json
Dependency: Types from src/types/citizen.ts (Map Agent creates this)

### [PENDING] Council Agent
File: agents/AGENT_COUNCIL.md
Owns: src/components/council/**, src/store/councilStore.ts, src/data/demo_council_debate.json
Dependency: Policy type from src/types/policy.ts

### [PENDING] Simulation Agent
File: agents/AGENT_SIMULATION.md
Owns: src/components/simulation/**, src/store/simulationStore.ts, src/data/demo_simulation_ticks.json
Dependency: Citizen store interface (Citizen Agent must expose citizenStore interface first)

### [PENDING] Voice Agent
File: agents/AGENT_VOICE.md
Owns: src/components/voice/**, src/lib/speech.ts, src/hooks/useSpeech.ts
Dependency: Citizen profiles must exist (Citizen Agent)

### [PENDING] Ledger Agent
File: agents/AGENT_LEDGER.md
Owns: src/components/ledger/**, src/store/ledgerStore.ts, src/data/demo_ledger.json
Dependency: Citizen IDs must exist (Citizen Agent)

### [PENDING] Integration Agent (run last)
Owns: src/App.tsx, src/components/layout/**, src/main.tsx
Dependency: ALL agents must be COMPLETE
Task: Wire all stores together, implement Shell layout, connect all panels, run demo end-to-end
```

### Agent isolation rules
- Each agent ONLY edits files listed under "Owns" in its spec
- Each agent reads but never writes shared types in `/src/types/`
- Each agent exports a typed interface at the top of its store file
- Integration agent wires everything together — it does not implement features
- If an agent needs something from another agent, it reads from the store, never imports from the other component directory

---

## 12. DEMO MODE SPECIFICATION

### Environment variables
```
VITE_DEMO_MODE=true              # Loads all data from /src/data/ JSON files
VITE_DEMO_NEIGHBOURHOOD=andheri  # Which pre-computed neighbourhood to load
VITE_SKIP_API=true               # Never make LLM API calls
VITE_AUTO_DEMO=false             # If true, runs the demo automatically on load
```

### `npm run demo` behaviour
1. Sets VITE_DEMO_MODE=true
2. Loads demo_citizens.json → populates citizen store
3. Loads demo_policy.json → populates policy panel (pre-filled)
4. Cesium map centres on Andheri East at street level
5. Citizens appear as dots moving along pre-computed routes
6. Council debate panel shows "Ready — click Run Debate to start"
7. Timeline shows Month 0 (pre-construction)
8. Ledger shows all tasks in "pending" state
9. App is fully interactive — all clicks, voice chat, time scrubbing work
10. Zero API calls are made

---

## 13. ERROR HANDLING RULES

1. If Gemini API fails → load from `/src/data/` JSON fallback, show toast "Using pre-computed data"
2. If Groq API fails → use browser SpeechSynthesis with a generic response, show toast
3. If Cesium/Google Maps API fails → fall back to flat Leaflet map with OpenStreetMap tiles
4. If Web Speech API unavailable → show text input for citizen chat instead
5. If Open-Meteo fails → use hard-coded weather events from demo_simulation_ticks.json
6. **Never show a white screen or unhandled error to judges.** Every failure must degrade gracefully.

---

## 14. PERFORMANCE REQUIREMENTS

- Initial load (map visible): < 4 seconds on 50Mbps connection
- Citizen dots rendering: 60fps on a 2021 MacBook Pro
- Council debate stream start: < 2 seconds from button click
- Voice response latency: < 800ms from end of speech
- Simulation tick advance: < 500ms per tick (pre-computed data)
- Time scrubber seek: < 200ms to any month

---

## 15. WHAT SUCCESS LOOKS LIKE

The build is complete when:
- [ ] `npm run demo` starts a fully interactive demo with zero API calls
- [ ] Cesium map loads Andheri East in photorealistic 3D within 4 seconds
- [ ] 50 citizen dots are visible and moving on the map
- [ ] Clicking C001 (Maria) opens her card with her profile
- [ ] Clicking "Talk to Maria" initiates a voice conversation where she responds in character
- [ ] Clicking "Run Policy Council" streams 5 simultaneous debate cards
- [ ] Clicking "Run 12 Months" steps through all ticks with map and citizen state updates
- [ ] The accountability ledger shows all 8 tasks with Contractor B flagged red at Month 6
- [ ] Priya (C003) shows "Assigned — Road Inspector" badge from Month 2 onwards
- [ ] Ravi (C002) dot turns red by Month 4, then back to amber by Month 12
- [ ] Arjun (C004) dot turns green at Month 12
- [ ] The construction overlay on the map shows full road completion at Month 12
- [ ] `vercel --prod` deploys successfully and the URL is shareable

---

*End of master specification. See /agents/ directory for individual agent task files.*
