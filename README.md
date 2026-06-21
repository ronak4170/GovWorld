# GovWorld — The Living City

> An AI-populated city simulation that lets governments see the human consequences of infrastructure decisions — before a single brick is laid.

Think SimCity, but every citizen is an AI person with a name, a job, a family, and a voice. You paste a policy. The city comes alive. People react. Things go wrong. The truth comes out.

---

## What It Does

1. **Policy input** — paste any infrastructure policy (road widening, BRT lane, utility upgrade).
2. **Living map** — 50 AI citizens appear as dots moving along their daily routes on an interactive map.
3. **Council debate** — 2–7 adversarial AI experts (economist, engineer, climate analyst, community advocate, corruption watchdog, and more) stream arguments about the policy in a cinematic 3D arena, each backed by live web research.
4. **12-month simulation** — fast-forward through monthly consequences; citizen statuses update, construction overlays advance, and flags fire automatically.
5. **Voice chat** — click any citizen dot, press *Talk*, and hold a live voice conversation with them in character.
6. **Accountability ledger** — every construction task is tracked with contractor history, delay flags, and budget burn.

---

## Demo Scenario

**Van Ness Avenue Complete Streets — Phase 1**
San Francisco · Market St → Jackson St · $45M · 12 monthly ticks

### Featured Citizens

| ID | Name | Age | Role | Arc |
|----|------|-----|------|-----|
| C001 | Jasmine Chen | 34 | SFMTA Bus Driver | Route disrupted for 8 months; normalises at Month 12 |
| C002 | Tony Ricci | 57 | Restaurant Owner | Storefront access blocked; revenue drops, then recovers |
| C003 | Sofia Rodriguez | 26 | Civil Engineer | Assigned as on-site inspector from Month 2 |
| C004 | Earl Washington | 72 | Retired (diabetic, no car) | New road finally connects him to his clinic |
| C005 | Amy Park | 41 | Elementary School Teacher | Dust and noise affect her classroom for 6 months |
| C006 | Tyler Brooks | 29 | Startup Founder, cyclist | Cycling lane removed; considers relocating |

### The 90-Second Judge Demo

1. Policy is pre-loaded → press **Run Policy Council** → debate cards stream simultaneously.
2. Press **Run 12 Months** → citizen dots change colour and scaffolding appears on the map.
3. Click **Jasmine Chen** → press *Talk* → ask "How is this affecting you?" → she answers by voice, in character.
4. Scrub to Month 12 → road complete → **Earl** turns green and **Contractor B** is red-flagged in the ledger.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 · Vite · TypeScript |
| Styling | Tailwind CSS — warm "mission control" theme (`#160c06` / `#ffb690` / `#f97316`) |
| 2D map | Leaflet + OpenStreetMap via `react-leaflet` (no API key required) |
| 3D globe | Cesium (optional, requires an Ion token) |
| 3D council arena | Three.js + `@react-three/fiber` + Drei |
| Ambient sound | Tone.js |
| State | Zustand |
| Citizens, council, simulation | **Gemini 2.5 Flash** (`@google/generative-ai`) |
| Real-time voice chat | **Groq Llama 3.3 70B** (`groq-sdk`) |
| Text-to-speech | **Deepgram Aura-2**, with Web Speech API fallback |
| Voice input | Web Speech API (`SpeechRecognition`) |
| Live council research | **Browserbase** (server-side Search + Fetch) |
| Observability & evals | **Arize Phoenix** + OpenTelemetry / OpenInference |

---

## Quick Start

### Demo mode — zero API calls

```bash
npm install
npm run demo
```

Opens at `http://localhost:5173` with all data pre-loaded from `src/data/`. No keys needed.

### Live mode

```bash
cp .env.example .env.local
# fill in your keys (see API Keys below)
npm run dev        # app only
npm run dev:full   # app + research API server (Vite + Express together)
```

`dev:full` runs Vite alongside the local Express shim (`server/dev.ts`, port 3001) that serves the Browserbase research endpoint — the same code Vercel runs as a serverless function in production (`api/research.ts`). Vite proxies `/api` → `localhost:3001`.

---

## API Keys

Copy `.env.example` to `.env.local` and fill in the keys you need. Never commit `.env.local`.

```env
# === Required for live LLM features ===
VITE_GEMINI_API_KEY=        # aistudio.google.com — free tier
VITE_GROQ_API_KEY=          # console.groq.com — free tier
VITE_DEEPGRAM_API_KEY=      # console.deepgram.com — free tier (TTS)

# === Live council research (server-side only — never bundled into the browser) ===
BROWSERBASE_API_KEY=        # browserbase.com — powers expert web research
BROWSERBASE_PROJECT_ID=

# === Optional ===
VITE_CESIUM_TOKEN=          # cesium.com/ion — only for the 3D globe view
VITE_GOOGLE_MAPS_API_KEY=   # console.cloud.google.com — not used by the Leaflet map

# === Demo flags (no keys needed) ===
VITE_DEMO_MODE=false        # true = run entirely from pre-computed JSON
VITE_SKIP_API=false         # true = force demo data even if keys are present
VITE_DEMO_NEIGHBOURHOOD=andheri  # which neighbourhood to load in demo
VITE_AUTO_DEMO=false        # true = auto-run the demo on load (unattended kiosks)
```

> **Demo mode** is active whenever `VITE_DEMO_MODE=true` or `VITE_SKIP_API=true`. Every LLM call then loads from pre-computed JSON in `src/data/` instead of hitting an API.

The `BROWSERBASE_*` keys are **not** prefixed `VITE_`, so they stay server-side and are never exposed in the client bundle.

---

## Available Scripts

| Command | What it does |
|---------|-------------|
| `npm run demo` | Start in demo mode — no API calls, fully interactive |
| `npm run dev` | Start the app in live mode with hot reload |
| `npm run dev:api` | Run only the Express research server (`server/dev.ts`) |
| `npm run dev:full` | Run Vite + the research server together (via `concurrently`) |
| `npm run live` | Live mode with Phoenix tracing enabled (`VITE_PHOENIX_TRACING=true`) |
| `npm run build` | Production build (`tsc` + Vite) |
| `npm run preview` | Preview the production build |
| `npm run precompute` | Re-generate all `src/data/` JSON via LLM (requires API keys) |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run lint` | ESLint across `src/` |

---

## Live Council Research

Council experts back their arguments with real web sources via **Browserbase**:

- `api/research.ts` — Vercel serverless function: `POST /api/research` with `{ queries[], scrapeUrls?, maxFacts? }` → `{ facts[] }`.
- `api/_browserbase.ts` — the Search + Fetch implementation; holds the API key server-side.
- `server/dev.ts` — local Express shim so `npm run dev:full` works end-to-end without the Vercel CLI.

When research is unavailable, the council falls back to its pre-computed demo facts.

---

## Observability & Evals (Arize Phoenix)

The `eval/` directory wires **Arize Phoenix** into the adversarial council debate to run a full *trace → eval → close-the-loop* cycle. Every expert argument is traced, scored by an LLM-as-judge, and the failure explanations drive a measurable prompt fix.

- **Tracing** — `src/lib/tracing.ts` wraps `generateCouncilArgument` (Gemini) and `generateTurnArgument` (Groq) in OpenInference LLM spans, exported via OTLP/HTTP. The Vite dev server proxies `/v1/traces` → Phoenix at `localhost:6006`, keeping the browser same-origin (no CORS, no key in the client). Enabled only when `VITE_PHOENIX_TRACING=true` (`npm run live`); a no-op in demo mode.
- **Judge** — `eval/judge.py` runs Claude as an LLM-as-judge over council spans, scoring `evidence_citation` and `argument_quality`, logging annotations, and printing the before/after delta.
- **Seed** — `eval/seed_traces.py` emits reproducible before/after spans so the loop runs without the UI.

**Headline result:** Phoenix surfaced that, without an explicit "cite ≥2 named sources" instruction, experts cited zero sources. Adding that mandate to `EXPERT_SYSTEM_PROMPTS` in `src/lib/llm.ts` moved `evidence_citation` from 0% → 100% and `argument_quality` from 50% → 100%. See `eval/README.md` for the full run instructions.

---

## Project Structure

```
govworld/
├── src/
│   ├── App.tsx                  # Root: loads demo data, renders Shell
│   ├── components/
│   │   ├── map/                 # Leaflet map, citizen dots, construction overlay, Cesium globe
│   │   ├── citizens/            # CitizenCard, CitizenList, CitizenStatus
│   │   ├── council/ debate/     # Debate panels, AgentCard, cinematic 3D arena
│   │   ├── simulation/          # Tick engine, TimelineBar, EventFeed, SimControls
│   │   ├── voice/               # CitizenChat, VoiceIndicator, TranscriptPanel
│   │   ├── ledger/              # AccountabilityLedger, TaskRow, ContractorFlag
│   │   ├── swarm/               # Social-opinion swarm engine + views
│   │   ├── notifications/       # Dissatisfaction alerts
│   │   ├── common/              # Shared UI primitives
│   │   └── layout/              # Shell, Sidebar, TopBar, PanelManager
│   ├── store/                   # Zustand: world, citizen, council, simulation, ledger, swarm, ui
│   ├── lib/                     # llm.ts, speech.ts, deepgram.ts, tracing.ts, constants.ts, …
│   ├── data/                    # Pre-computed demo JSON (citizens, policy, debate, ticks, ledger)
│   ├── hooks/                   # useCitizen, useSimulation, useCouncil, useSpeech, useWeather
│   └── types/                   # citizen, policy, council, simulation, ledger, swarm
├── api/                         # Vercel serverless: research.ts + _browserbase.ts
├── server/dev.ts                # Local Express shim for the research API
├── eval/                        # Arize Phoenix evals: judge.py, seed_traces.py, README.md
├── scripts/precompute_demo.ts   # Regenerates src/data/ via Gemini + Groq
├── .claude/agents/              # Claude Code subagent definitions (6 agents)
├── AGENT_*.md                   # Per-agent task specs (map, citizens, council, sim, voice, ledger)
├── DESIGN.md · nvidia/DESIGN.md # Design-system references
├── CLAUDE.md                    # Master specification + as-built status
└── TASKS.md                     # Multi-agent task board
```

---

## Agent Architecture

GovWorld was built with six isolated Claude Code subagents, each owning a module slice:

| Agent | Owns | Key responsibility |
|-------|------|--------------------|
| Map | `components/map/`, `store/worldStore` | Leaflet map, citizen dots, construction overlays |
| Citizen | `components/citizens/`, `store/citizenStore` | 50 AI citizen profiles, status tracking |
| Council | `components/council/`, `store/councilStore` | 10-expert pool, cinematic 3D debate arena |
| Simulation | `components/simulation/`, `store/simulationStore` | 12-tick engine, generative-agents memory loop, edge cases |
| Voice | `components/voice/`, `lib/speech.ts` | Deepgram TTS, Groq voice chat, Web Speech fallback |
| Ledger | `components/ledger/`, `store/ledgerStore` | Task tracking, contractor flags, worker assignment |

All LLM calls route through `src/lib/llm.ts` — never called directly from components.

---

## Council Expert Pool

Users pick 2–7 experts from a pool of 10 San Francisco domain specialists:

Economist · Community Advocate · Civil Engineer · Corruption Watchdog · Climate Analyst · Transportation Lawyer · Urban Planner · Public Health Officer · Transit Expert · Heritage Preservation Officer

The 3D Council Arena (`src/components/council/arena/`) runs a round-robin sentence queue with pause, skip, and abort controls. Expert voices are synthesised via Deepgram Aura-2 with a distinct voice per expert.

---

## Simulation Engine

- **Director** (`src/lib/simulationDirector.ts`) — generative-agents-inspired memory streams, reflection, and planning (Park et al., 2023).
- **Edge cases** fire automatically: contractor delays, weather impacts, utility bursts, budget overruns.
- **Swarm pipeline** (`src/lib/swarmSimulation.ts`) — a social-opinion simulation: Seed → Ontology → Knowledge Graph → Personas → multi-agent social posts → prediction report, with views under `components/swarm/`.

---

## Accountability Ledger

Eight pre-built construction tasks for the Van Ness demo, with:

- Automatic **delay flags** when actual progress falls more than 10% behind projection.
- **Budget flags** when spend exceeds 115% of contract.
- Pre-loaded **contractor history** (Ram Construction, Bharat Infra, CityUtil Services, SignPro Ltd).
- **Weather-impact** days drawn from the Open-Meteo API, with fallback demo data.

---

## Deployment

```bash
vercel --prod
```

`api/research.ts` deploys as a Vercel serverless function; set `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` in the project's environment variables. The app degrades gracefully: if any API fails, it falls back to pre-computed demo JSON and shows a toast — judges never see a white screen.

---

## License

Private / hackathon project.
