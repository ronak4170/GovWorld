# GOVWORLD — "The Living City"
## A real-time, AI-populated government policy simulator

A SimCity-style simulation of a real neighbourhood. A government uploads an
infrastructure policy, watches it ripple through AI citizens with real lives,
debates it with a council of adversarial AI experts, fast-forwards months of
consequences, and talks to any citizen by voice.

**Human-first, not infrastructure-first.** The road is the input; the human life
is the output.

---

## Demo scenario

- **Project:** Van Ness Avenue Complete Streets — Phase 1, **San Francisco**
  (centre `37.7790, -122.4193`; corridor Market St → Jackson St).
- **Budget:** $45M USD. Currency `$`.
- **Timeline:** 12 monthly ticks (`DEMO_TOTAL_MONTHS=12`). UI also exposes a
  `TIME_FRAMES` selector (30 days → 5 years) in `src/lib/constants.ts`.

> **Migration residue to clean up (treat as bugs, not intent):** leftover
> Mumbai/India artefacts — "monsoon", `₹`/`crore`, "festival rush", "ward
> meeting", and an `ORG_DAILY` label — remain in `src/lib/swarmSimulation.ts`,
> `src/lib/llm.ts`, and `src/lib/deepgram.ts`. `ANDHERI_EAST_COORDS` in
> `constants.ts` is a stale name that now holds the SF coordinates.

### The 6 featured citizens (`src/data/demo_citizens.json`, 50 total)
| ID | Name | Age | Job |
|---|---|---|---|
| C001 | Jasmine Chen | 34 | SFMTA Bus Driver |
| C002 | Tony Ricci | 57 | Restaurant Owner |
| C003 | Sofia Rodriguez | 26 | Civil Engineer (assigned as inspector) |
| C004 | Earl Washington | 72 | Retired, diabetic, no car |
| C005 | Amy Park | 41 | Elementary School Teacher |
| C006 | Tyler Brooks | 29 | Startup Founder, cyclist |

---

## Tech stack

- **Frontend:** React 18 + Vite (TypeScript), Tailwind, Zustand state.
- **Map:** **Leaflet + OpenStreetMap** (`react-leaflet`), no API key.
  Note: `src/components/map/CesiumWorld.tsx` is a misnomer — it renders Leaflet,
  not Cesium. Cesium/Three.js are still in `package.json` but unused by the live
  map. Citizen dots (`CitizenDots.tsx`) and construction (`ConstructionOverlay.tsx`)
  are Leaflet layers.
- **State/data:** Zustand stores + pre-computed JSON in `src/data/`. No database;
  localStorage for persistence.
- **External (free tier):** Open-Meteo (weather), Wikipedia/DuckDuckGo/`r.jina.ai`
  (expert research).

### LLM routing (`src/lib/llm.ts` — all LLM calls go through here)
| Use | Provider |
|---|---|
| Citizen profiles & reactions, worker assignment, council arguments, swarm posts, report sections, ontology | **Gemini 2.5 Flash** (`VITE_GEMINI_API_KEY`) |
| Real-time citizen voice chat + per-turn debate arguments | **Groq Llama 3.3 70B** (`VITE_GROQ_API_KEY`) |
| Expert debate speech (TTS) | **Deepgram Aura-2** (`VITE_DEEPGRAM_API_KEY`) |

`DEMO_MODE` = `VITE_DEMO_MODE === 'true' || VITE_SKIP_API === 'true'`. In demo mode
every function loads pre-computed JSON or throws a "use fallback" error the caller
catches. The demo must work with zero live API calls.

---

## Subsystems

### Council debate
`EXPERT_POOL` in `src/store/councilStore.ts` defines **10 SF experts** (economist,
advocate, engineer, watchdog, climate, lawyer, urbanplanner, health, transport,
heritage). User selects **2–7** (default = the original 5). Per-expert system
prompts in `EXPERT_SYSTEM_PROMPTS` (`src/lib/llm.ts`).

Two debate UIs, both full-screen overlays from `Shell.tsx`:
- **Legacy text debate** — `src/components/debate/DebateArena.tsx` (sidebar "Council").
- **Cinematic 3D Council Arena** — `src/components/council/arena/*` (`CouncilArena`,
  `CouncilChamber3D`, `ExpertAvatar3D`, `CinematicSubtitle`, `SeverityReveal`,
  `DebateControls`), driven by `src/lib/debateOrchestrator.ts` (`runCinematicDebate`:
  round-robin sentence queue, pause/skip/abort).

### Voice & TTS
- **Citizen voice chat** — `CitizenChat` renders as a fixed overlay. Groq response +
  Web Speech API for input/output.
- **Expert TTS** — `src/lib/deepgram.ts`, per-expert Aura-2 voices, Web Speech
  fallback. Requires `VITE_DEEPGRAM_API_KEY`.

### Expert research
`src/lib/expertResearch.ts` — before arguing, each expert "researches" via
Wikipedia, DuckDuckGo, and `r.jina.ai` scraping. Demo fallback:
`demo_expert_research.json`.

### Simulation Director
`src/lib/simulationDirector.ts` — generative-agents-inspired (Park et al. 2023)
memory streams / reflection / planning + cascading **edge cases**. Used by
`SimControls.tsx` (`runSimulation`), `EdgeCaseFeed.tsx`, `simulationStore.ts`.
Live (LLM) and demo modes.

### Swarm (social-opinion pipeline) — ⚠️ dormant
`src/lib/{seedProcessor,ontologyGenerator,graphBuilder,swarmSimulation,reportAgent}.ts`,
`src/store/swarmStore.ts`, `src/components/swarm/*`, `src/types/swarm.ts`.
Pipeline: Seed → Ontology → Knowledge Graph → Personas → multi-agent social
simulation → prediction report, with God's-eye variable injection. **Complete but
NOT mounted in the UI.** Wire `SwarmEngine`/`SwarmFeed` into `Shell.tsx` to surface it.

---

## UI / layout

- **Theme:** warm "mission control" brown/orange (`#160c06`, `#ffb690`, accent
  `#f97316`), Material Symbols icons, `Geist` wordmark. Styles in `src/globals.css`.
- **Shell** (`src/components/layout/Shell.tsx`): 48px left rail (`Sidebar`) ·
  centre Leaflet map · fixed **360px** right panel (`PanelManager`) · bottom
  `TimelineBar` · headless `SimulationEngine`.
- **Right panel tabs:** only **Updates / People / Ledger** (`PanelManager.tsx`).
  Citizen selection auto-opens People → `CitizenCard`. `PANEL_IDS` still lists
  COUNCIL/VOICE/POLICY/EDGE_CASES but they are not tabs.
- **Overlays:** `CitizenChat`, `DissatisfactionAlert`, and the two debate UIs.

---

## Data files (`src/data/`)
`demo_citizens.json`, `demo_policy.json`, `demo_council_debate.json`,
`demo_simulation_ticks.json`, `demo_citizen_reactions.json`, `demo_ledger.json`,
`demo_voice_responses.json`, `demo_debate_sentences.json`, `demo_expert_research.json`.

---

## Core data models (`src/types/`)

```typescript
interface Citizen {
  id: string; name: string; age: number
  gender: 'male' | 'female' | 'nonbinary'
  occupation: string; employer: string; monthlyIncome: number
  familyStructure: string
  homeCoords: [number, number]; workCoords: [number, number]
  dailyRoute: [number, number][]
  skills: string[]; fears: string; hopes: string
  healthStatus: 'healthy' | 'chronic_condition' | 'mobility_limited'
  statusColor: 'green' | 'amber' | 'red' | 'grey'  // thriving/stressed/crisis/displaced
  statusHistory: SimulationEvent[]
  currentTick: number; policyImpact: string; persona: string
  isWorker: boolean; assignedTaskId?: string
}

interface Policy {
  id: string; title: string; description: string
  policyType: 'road' | 'housing' | 'utilities' | 'parks' | 'transit'
  targetArea: string; budget: number
  plannedStartDate: string; plannedEndDate: string
  affectedZone: GeoJSON.Polygon; submittedAt: string
}

interface SimulationTick {
  month: number; label: string; constructionProgress: number
  weatherEvent?: string
  citizenUpdates: CitizenUpdate[]; events: SimulationEvent[]
  mapOverlays: MapOverlay[]
}

interface SimulationEvent {
  id: string; tick: number
  type: 'construction' | 'displacement' | 'employment' | 'closure' | 'completion' | 'flag'
  title: string; description: string
  affectedCitizenIds: string[]
  severity: 'info' | 'warning' | 'critical'
}

interface LedgerTask {
  id: string; title: string
  contractor: string; contractorHistory: string
  assignedWorkers: string[]
  projectedStartDate: string; projectedEndDate: string
  actualStartDate?: string; actualEndDate?: string
  progressPercent: number
  status: 'pending' | 'active' | 'delayed' | 'flagged' | 'complete'
  delayDays: number; flagReason?: string; weatherImpactDays: number
  budget: number; spentToDate: number
}
```

---

## Scripts
- `npm run demo` — demo mode (loads JSON, zero API calls)
- `npm run dev` / `npm run build`
- `npm run typecheck` / `npm run lint`
- `npm run precompute` — regenerate `src/data/` via `scripts/precompute_demo.ts`

---

## Conventions
- All LLM calls go through `src/lib/llm.ts` — never call APIs from components.
- All magic numbers/strings live in `src/lib/constants.ts`.
- Components read shared state from Zustand stores, not from each other.
- TypeScript interfaces in `src/types/` are read-only contracts.
- Every failure must degrade gracefully (JSON fallback, Web Speech fallback,
  text input if mic unavailable). Never show a white screen.

---

## Config files
- Agent specs (`AGENT_*.md`) live at the **repo root**, not `/agents/`.
- `.claude/agents/` holds 6 Claude Code subagent definitions (map, citizen,
  council, simulation, voice, ledger).
- `env.example` is stale (`VITE_DEMO_NEIGHBOURHOOD=andheri`); code uses
  `DEMO_NEIGHBOURHOOD = 'vanness'`.
