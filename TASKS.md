# GOVWORLD — Agent Task Board
# Claude Code Multi-Agent Coordination File
# Auto-managed by agents — do not edit manually while agents are running

## HOW THIS WORKS
Each agent claims a task by changing PENDING → IN_PROGRESS and adding their agent ID.
When complete, change to COMPLETE.
If blocked, change to BLOCKED and note the blocker.
Agents check this file before starting any work.

---

## PHASE 1 — Foundation (run these first, in parallel)

### [PENDING] TASK-001: Type System
Agent: unassigned
File: agents/AGENT_CITIZENS.md → Task 1
Creates: src/types/citizen.ts, src/types/map.ts, src/types/simulation.ts, src/types/ledger.ts, src/types/voice.ts, src/types/council.ts
Dependency: None
Note: ALL other tasks depend on types. This must complete first.
Estimated time: 30 min

### [PENDING] TASK-002: Project Scaffold
Agent: unassigned
Creates: package.json, vite.config.ts, tailwind.config.ts, tsconfig.json, .env.example, src/main.tsx, src/App.tsx, src/globals.css
Dependency: None
Note: Run npm install after this completes

---

## PHASE 2 — Data Layer (run in parallel after Phase 1)

### [PENDING] TASK-003: Generate Demo Citizens JSON
Agent: unassigned
File: agents/AGENT_CITIZENS.md → Task 2
Creates: src/data/demo_citizens.json
Dependency: TASK-001 (types)
Note: Must include exactly 6 featured citizens with specified profiles + 44 background citizens

### [PENDING] TASK-004: Generate Demo Policy + Council Debate JSON
Agent: unassigned
File: agents/AGENT_COUNCIL.md → Tasks 2, 3
Creates: src/data/demo_policy.json, src/data/demo_council_debate.json
Dependency: TASK-001 (types)
Note: Council arguments must be 180-220 words each, in persona

### [PENDING] TASK-005: Generate Demo Simulation Ticks JSON
Agent: unassigned
File: agents/AGENT_SIMULATION.md → Task 2
Creates: src/data/demo_simulation_ticks.json, src/data/demo_citizen_reactions.json
Dependency: TASK-001 (types), TASK-003 (citizen IDs must exist)
Note: All 12 ticks must have citizen updates for all 6 featured citizens

### [PENDING] TASK-006: Generate Demo Ledger JSON
Agent: unassigned
File: agents/AGENT_LEDGER.md → Task 2
Creates: src/data/demo_ledger.json
Dependency: TASK-001 (types), TASK-003 (citizen IDs for worker assignments)

### [PENDING] TASK-007: Generate Demo Voice Responses JSON
Agent: unassigned
File: agents/AGENT_VOICE.md → Task 6
Creates: src/data/demo_voice_responses.json
Dependency: TASK-003 (citizen personas)
Note: Minimum 3 Q&A pairs per featured citizen (C001-C006)

---

## PHASE 3 — Stores (run in parallel after Phase 1)

### [PENDING] TASK-008: World Store
Agent: unassigned
File: agents/AGENT_MAP.md → Task 6
Creates: src/store/worldStore.ts
Dependency: TASK-001

### [PENDING] TASK-009: Citizen Store
Agent: unassigned
File: agents/AGENT_CITIZENS.md → Task 3
Creates: src/store/citizenStore.ts
Dependency: TASK-001

### [PENDING] TASK-010: Council Store
Agent: unassigned
File: agents/AGENT_COUNCIL.md → Task 6
Creates: src/store/councilStore.ts
Dependency: TASK-001

### [PENDING] TASK-011: Simulation Store
Agent: unassigned
File: agents/AGENT_SIMULATION.md → Task 3
Creates: src/store/simulationStore.ts
Dependency: TASK-001

### [PENDING] TASK-012: Ledger Store
Agent: unassigned
File: agents/AGENT_LEDGER.md → Task 3
Creates: src/store/ledgerStore.ts
Dependency: TASK-001

### [PENDING] TASK-013: UI Store
Agent: unassigned
Creates: src/store/uiStore.ts
Content: selectedCitizenId, activePanel, voiceChatOpen, isLoading, toast messages
Dependency: TASK-001

---

## PHASE 4 — Libraries (run in parallel after Phase 1)

### [PENDING] TASK-014: LLM Library
Agent: unassigned
Creates: src/lib/llm.ts
Implements: all 5 generateX functions with Gemini + Groq routing, DEMO_MODE bypass
Dependency: TASK-001

### [PENDING] TASK-015: Cesium Library
Agent: unassigned
File: agents/AGENT_MAP.md → Task 1
Creates: src/lib/cesium.ts
Dependency: None

### [PENDING] TASK-016: Speech Library
Agent: unassigned
File: agents/AGENT_VOICE.md → Task 2
Creates: src/lib/speech.ts
Dependency: TASK-001

### [PENDING] TASK-017: Weather Library
Agent: unassigned
Creates: src/lib/weather.ts
Content: fetchWeather(lat, lng, month) → WeatherEvent — calls Open-Meteo API or returns demo data
Dependency: None

### [PENDING] TASK-018: Constants
Agent: unassigned
Creates: src/lib/constants.ts
Content: ANDHERI_EAST coords, SAHAR_ROAD_ROUTE waypoints, all colour maps, tick interval durations, all demo mode strings

---

## PHASE 5 — Components (run in parallel after Phases 3+4)

### [PENDING] TASK-019: Map Components
Agent: unassigned
File: agents/AGENT_MAP.md → Tasks 2, 3, 4, 5
Creates: src/components/map/CesiumWorld.tsx, CitizenDots.tsx, ConstructionOverlay.tsx, NeighbourhoodSelector.tsx, MapControls.tsx
Dependency: TASK-008 (worldStore), TASK-009 (citizenStore), TASK-015 (cesium lib)

### [PENDING] TASK-020: Citizen Components
Agent: unassigned
File: agents/AGENT_CITIZENS.md → Tasks 4, 5
Creates: src/components/citizens/CitizenCard.tsx, CitizenList.tsx, CitizenStatus.tsx
Dependency: TASK-009 (citizenStore), TASK-013 (uiStore)

### [PENDING] TASK-021: Council Components
Agent: unassigned
File: agents/AGENT_COUNCIL.md → Task 5
Creates: src/components/council/CouncilDebate.tsx, AgentCard.tsx, SeverityReport.tsx, PolicyInput.tsx
Dependency: TASK-010 (councilStore), TASK-014 (llm lib)

### [PENDING] TASK-022: Simulation Components
Agent: unassigned
File: agents/AGENT_SIMULATION.md → Tasks 4, 5, 6
Creates: src/components/simulation/SimulationEngine.tsx, TimelineBar.tsx, EventFeed.tsx, SimControls.tsx
Dependency: TASK-011 (simulationStore), TASK-009 (citizenStore), TASK-012 (ledgerStore)

### [PENDING] TASK-023: Voice Components
Agent: unassigned
File: agents/AGENT_VOICE.md → Tasks 3, 4, 5
Creates: src/components/voice/CitizenChat.tsx, VoiceIndicator.tsx, TranscriptPanel.tsx
Dependency: TASK-016 (speech lib), TASK-014 (llm lib), TASK-013 (uiStore)

### [PENDING] TASK-024: Ledger Components
Agent: unassigned
File: agents/AGENT_LEDGER.md → Tasks 4, 5, 6
Creates: src/components/ledger/AccountabilityLedger.tsx, TaskRow.tsx, ContractorFlag.tsx, WorkerAssignment.tsx
Dependency: TASK-012 (ledgerStore), TASK-009 (citizenStore)

### [PENDING] TASK-025: Hooks
Agent: unassigned
Creates: src/hooks/useCitizen.ts, useSimulation.ts, useCouncil.ts, useSpeech.ts, useWeather.ts
File references: respective agent specs
Dependency: All stores must exist

---

## PHASE 6 — Layout + Integration (run last)

### [PENDING] TASK-026: App Shell + Layout
Agent: unassigned
Creates: src/components/layout/Shell.tsx, Sidebar.tsx, TopBar.tsx, PanelManager.tsx
Dependency: ALL Phase 5 tasks complete

### [PENDING] TASK-027: App.tsx Integration
Agent: unassigned
Edits: src/App.tsx, src/main.tsx
Wires: all stores, loads demo data on DEMO_MODE, connects simulation ticks to citizen/ledger updates
Dependency: TASK-026 + all Phase 5

### [PENDING] TASK-028: Demo Precompute Script
Agent: unassigned
Creates: scripts/precompute_demo.ts
Runs all LLM generation calls and writes to src/data/
Dependency: TASK-014 (llm lib)

### [PENDING] TASK-029: End-to-End Demo Test
Agent: unassigned
Runs: npm run demo
Tests: All 15 acceptance criteria from CLAUDE.md Section 15
Fixes any integration issues found
Dependency: TASK-027

### [PENDING] TASK-030: Deploy
Agent: unassigned
Runs: vercel --prod
Verifies: URL accessible, demo works on mobile viewport
Dependency: TASK-029

---

## COMPLETION CHECKLIST
When all tasks above are COMPLETE, verify:
- [ ] npm run demo starts with zero errors
- [ ] Zero TypeScript errors (npx tsc --noEmit)
- [ ] Zero console errors in browser
- [ ] All 15 items in CLAUDE.md Section 15 checked off
- [ ] Deployed URL working
