# AGENT_CITIZENS — Citizen Generation Agent Specification
## GOVWORLD | Citizen Population Owner

---

## YOUR IDENTITY
You are the Citizen Agent. You own every citizen that populates GOVWORLD. You generate them, store them, update their states as the simulation runs, and expose them to every other module. Citizens are the soul of this project — treat them as real people, not data points.

## FILES YOU OWN
```
src/components/citizens/CitizenCard.tsx
src/components/citizens/CitizenList.tsx
src/components/citizens/CitizenStatus.tsx
src/components/citizens/CitizenGenerator.tsx
src/store/citizenStore.ts
src/types/citizen.ts                ← create this
src/data/demo_citizens.json         ← generate this
src/hooks/useCitizen.ts
```

## FILES YOU MUST NEVER EDIT
```
src/components/map/**
src/components/council/**
src/components/voice/**
src/components/ledger/**
src/lib/cesium.ts
src/store/worldStore.ts
src/store/councilStore.ts
```

## FILES YOU READ
```
src/store/simulationStore.ts        ← read currentTick to update citizen states
src/data/demo_citizen_reactions.json ← read tick-by-tick citizen updates
src/lib/llm.ts                      ← call generateCitizenProfile
```

---

## TASK 1 — Citizen Type (`src/types/citizen.ts`)

### Implement exactly — all other agents depend on this
```typescript
export type CitizenStatus = 'green' | 'amber' | 'red' | 'grey'

export interface Citizen {
  // Identity
  id: string                         // Format: "C001", "C002", ... "C050"
  name: string
  age: number
  gender: 'male' | 'female' | 'nonbinary'

  // Work + life
  occupation: string
  employer: string
  monthlyIncome: number              // In INR (Indian Rupees)
  familyStructure: string            // e.g. "Married, 3 children"
  healthStatus: 'healthy' | 'chronic_condition' | 'mobility_limited'

  // Location
  homeCoords: [number, number]       // [lat, lng]
  workCoords: [number, number]
  dailyRoute: [number, number][]     // Ordered waypoints home→work, min 4 waypoints

  // Character
  skills: string[]                   // Max 5 skills
  fears: string                      // One sentence
  hopes: string                      // One sentence
  persona: string                    // Full persona text for voice chat system prompt

  // Simulation state
  statusColor: CitizenStatus
  statusHistory: StatusHistoryEntry[]
  currentPolicyImpact: string        // What's happening to them right now
  isWorker: boolean
  assignedTaskId?: string
  isFeatured: boolean                // true for C001-C006

  // Display
  avatarEmoji: string                // Single emoji representing them
}

export interface StatusHistoryEntry {
  tick: number
  status: CitizenStatus
  narrative: string                  // What happened this month
  routeChange?: [number, number][]   // New route if rerouted
}

export interface CitizenUpdate {
  citizenId: string
  tick: number
  newStatus: CitizenStatus
  narrative: string
  newPolicyImpact: string
  routeChange?: [number, number][]
}
```

---

## TASK 2 — Generate demo_citizens.json

### The 6 featured citizens — implement EXACTLY as specified

```json
[
  {
    "id": "C001",
    "name": "Maria Santos",
    "age": 34,
    "gender": "female",
    "occupation": "BEST Bus Driver",
    "employer": "Brihanmumbai Electric Supply and Transport",
    "monthlyIncome": 18000,
    "familyStructure": "Single mother, 2 children (ages 7 and 9)",
    "healthStatus": "healthy",
    "homeCoords": [19.1078, 72.8645],
    "workCoords": [19.1189, 72.8801],
    "dailyRoute": [
      [19.1078, 72.8645],
      [19.1095, 72.8661],
      [19.1112, 72.8690],
      [19.1145, 72.8723],
      [19.1189, 72.8801]
    ],
    "skills": ["vehicle operation", "route navigation", "passenger management"],
    "fears": "Missing my children's school pickup because of my unpredictable shifts",
    "hopes": "Save enough to move to a quieter neighbourhood before my eldest starts secondary school",
    "statusColor": "green",
    "statusHistory": [],
    "currentPolicyImpact": "Pre-construction: Route runs normally, though traffic is already getting heavier",
    "isWorker": false,
    "isFeatured": true,
    "avatarEmoji": "🚌",
    "persona": "You are Maria Santos, 34, a BEST bus driver and single mother of two children (Aarav, 9, and Priya, 7) living in Andheri East. You earn ₹18,000 a month. You are warm, resilient, and perpetually tired but determined. You speak with slight Goan-Mumbai accent. You worry constantly about your children."
  },
  {
    "id": "C002",
    "name": "Ravi Nair",
    "age": 58,
    "gender": "male",
    "occupation": "Shop Owner (General Provisions)",
    "employer": "Self-employed — Nair General Store",
    "monthlyIncome": 35000,
    "familyStructure": "Married, two adult children who have moved to Pune",
    "healthStatus": "chronic_condition",
    "homeCoords": [19.1101, 72.8699],
    "workCoords": [19.1108, 72.8703],
    "dailyRoute": [
      [19.1101, 72.8699],
      [19.1104, 72.8701],
      [19.1108, 72.8703]
    ],
    "skills": ["retail management", "inventory", "customer relations", "Hindi/Malayalam/Marathi"],
    "fears": "Losing the shop my father started 30 years ago because of construction I had no say in",
    "hopes": "That my shop survives long enough for me to retire with dignity",
    "statusColor": "green",
    "statusHistory": [],
    "currentPolicyImpact": "Pre-construction: Business is steady. Sahar Road brings foot traffic to my door.",
    "isWorker": false,
    "isFeatured": true,
    "avatarEmoji": "🛒",
    "persona": "You are Ravi Nair, 58, owner of Nair General Store on Sahar Road for 30 years. Your father started this shop. You have high blood pressure. You are proud, stubborn, and deeply attached to this street. You speak in formal English with occasional Malayali expressions. You feel forgotten by the government."
  },
  {
    "id": "C003",
    "name": "Priya Mehra",
    "age": 26,
    "gender": "female",
    "occupation": "Civil Engineer (Unemployed)",
    "employer": "Unemployed — 4 months between jobs",
    "monthlyIncome": 0,
    "familyStructure": "Single, lives with parents to save money",
    "healthStatus": "healthy",
    "homeCoords": [19.1055, 72.8721],
    "workCoords": [19.1055, 72.8721],
    "dailyRoute": [
      [19.1055, 72.8721],
      [19.1072, 72.8709],
      [19.1089, 72.8697]
    ],
    "skills": ["civil engineering", "road inspection", "AutoCAD", "site management", "quality control"],
    "fears": "That my engineering degree means nothing if I can't find work in a year of trying",
    "hopes": "To build infrastructure that actually serves people, not just ticks boxes",
    "statusColor": "amber",
    "statusHistory": [],
    "currentPolicyImpact": "Pre-construction: Applying for jobs daily. The road project might be an opportunity.",
    "isWorker": false,
    "assignedTaskId": null,
    "isFeatured": true,
    "avatarEmoji": "👷",
    "persona": "You are Priya Mehra, 26, a civil engineer who has been unemployed for 4 months. You live with your parents. You are sharp, frustrated, and idealistic. You care deeply about ethical construction. You speak in crisp, precise English. You get excited about technical details."
  },
  {
    "id": "C004",
    "name": "Arjun Pillai",
    "age": 72,
    "gender": "male",
    "occupation": "Retired (former bank clerk)",
    "employer": "Retired",
    "monthlyIncome": 12000,
    "familyStructure": "Widower, lives alone. Son in Canada.",
    "healthStatus": "chronic_condition",
    "homeCoords": [19.1122, 72.8671],
    "workCoords": [19.1122, 72.8671],
    "dailyRoute": [
      [19.1122, 72.8671],
      [19.1110, 72.8685],
      [19.1098, 72.8699]
    ],
    "skills": ["patience", "banking records"],
    "fears": "Dying before I see my son again. Not being able to get to my doctor when I need to.",
    "hopes": "That the new road makes it easier for the autorickshaws to reach my area",
    "statusColor": "green",
    "statusHistory": [],
    "currentPolicyImpact": "Pre-construction: I cannot easily reach the clinic 2km away. Autos don't come here.",
    "isWorker": false,
    "isFeatured": true,
    "avatarEmoji": "👴",
    "persona": "You are Arjun Pillai, 72, a retired bank clerk and widower with diabetes and a bad hip. Your son is in Canada. You are gentle, philosophical, and quietly lonely. You speak slowly and thoughtfully. You grew up in Kerala but have lived in Mumbai for 40 years."
  },
  {
    "id": "C005",
    "name": "Fatima Sheikh",
    "age": 41,
    "gender": "female",
    "occupation": "Primary School Teacher",
    "employer": "Municipal School No. 47, Andheri East",
    "monthlyIncome": 22000,
    "familyStructure": "Married, husband is a tailor. Two daughters (14 and 16).",
    "healthStatus": "healthy",
    "homeCoords": [19.1066, 72.8733],
    "workCoords": [19.1089, 72.8701],
    "dailyRoute": [
      [19.1066, 72.8733],
      [19.1074, 72.8719],
      [19.1082, 72.8710],
      [19.1089, 72.8701]
    ],
    "skills": ["teaching", "Urdu/Hindi/Marathi", "classroom management", "community organising"],
    "fears": "That construction dust and noise will ruin my students' concentration during their board exam year",
    "hopes": "That the new road brings better bus connectivity so my students can reach tutoring classes",
    "statusColor": "green",
    "statusHistory": [],
    "currentPolicyImpact": "Pre-construction: Classroom is 40 metres from Sahar Road. Worried about the dust.",
    "isWorker": false,
    "isFeatured": true,
    "avatarEmoji": "📚",
    "persona": "You are Fatima Sheikh, 41, a primary school teacher of 15 years. You are passionate, firm, and fiercely protective of your students. You speak clearly and with authority. You quote education statistics. You are an active member of your school's parent-teacher association."
  },
  {
    "id": "C006",
    "name": "Dev Patel",
    "age": 29,
    "gender": "male",
    "occupation": "Startup Co-founder (EdTech)",
    "employer": "LearnFlux Technologies (self-founded)",
    "monthlyIncome": 45000,
    "familyStructure": "Single, rents an apartment with two flatmates",
    "healthStatus": "healthy",
    "homeCoords": [19.1143, 72.8682],
    "workCoords": [19.1098, 72.8734],
    "dailyRoute": [
      [19.1143, 72.8682],
      [19.1131, 72.8694],
      [19.1118, 72.8708],
      [19.1098, 72.8734]
    ],
    "skills": ["product management", "fundraising", "cycling", "Python", "pitching investors"],
    "fears": "That Mumbai's infrastructure will always lag behind Bangalore and I'll have to relocate my startup",
    "hopes": "To build a company in Mumbai that proves the city can be a startup hub",
    "statusColor": "green",
    "statusHistory": [],
    "currentPolicyImpact": "Pre-construction: I cycle to work every day. Sahar Road has a narrow cycling lane I depend on.",
    "isWorker": false,
    "isFeatured": true,
    "avatarEmoji": "🚴",
    "persona": "You are Dev Patel, 29, a startup co-founder who cycles to work. You are optimistic, data-driven, and quick to compare Mumbai to global cities. You speak in startup language mixed with genuine civic passion. You follow urban planning Twitter accounts and have opinions about cycling infrastructure."
  }
]
```

### Background citizens (C007–C050)
Generate 44 background citizens with:
- Demographically diverse (age 18–75, various occupations, income levels)
- All have homeCoords and workCoords within 2km radius of [19.1136, 72.8697]
- All have 4–6 waypoint dailyRoutes
- statusColor starts as 'green' for all
- isFeatured: false for all
- Occupations should include: auto-rickshaw driver, IT worker, domestic helper, nurse, factory worker, street vendor, student, pharmacist, security guard, delivery rider
- Generate realistic Mumbai names reflecting the city's diversity

---

## TASK 3 — Citizen Store (`src/store/citizenStore.ts`)

```typescript
import { create } from 'zustand'
import type { Citizen, CitizenUpdate } from '../types/citizen'

interface CitizenState {
  citizens: Citizen[]
  selectedCitizenId: string | null
  isLoading: boolean

  // Getters (computed)
  getFeaturedCitizens: () => Citizen[]
  getCitizenById: (id: string) => Citizen | undefined
  getCitizensByStatus: (status: Citizen['statusColor']) => Citizen[]
  getWorkers: () => Citizen[]

  // Actions
  initialiseCitizens: (citizens: Citizen[]) => void
  selectCitizen: (id: string | null) => void
  applyCitizenUpdate: (update: CitizenUpdate) => void
  applyTickUpdates: (updates: CitizenUpdate[]) => void
  assignWorker: (citizenId: string, taskId: string) => void
  unassignWorker: (citizenId: string) => void
  resetAllStatus: () => void
}

export const useCitizenStore = create<CitizenState>((set, get) => ({
  citizens: [],
  selectedCitizenId: null,
  isLoading: false,

  getFeaturedCitizens: () => get().citizens.filter(c => c.isFeatured),
  getCitizenById: (id) => get().citizens.find(c => c.id === id),
  getCitizensByStatus: (status) => get().citizens.filter(c => c.statusColor === status),
  getWorkers: () => get().citizens.filter(c => c.isWorker),

  initialiseCitizens: (citizens) => set({ citizens, isLoading: false }),
  selectCitizen: (id) => set({ selectedCitizenId: id }),

  applyCitizenUpdate: (update) => set(state => ({
    citizens: state.citizens.map(c =>
      c.id === update.citizenId
        ? {
            ...c,
            statusColor: update.newStatus,
            currentPolicyImpact: update.newPolicyImpact,
            dailyRoute: update.routeChange ?? c.dailyRoute,
            statusHistory: [...c.statusHistory, {
              tick: update.tick,
              status: update.newStatus,
              narrative: update.narrative,
              routeChange: update.routeChange,
            }]
          }
        : c
    )
  })),

  applyTickUpdates: (updates) => {
    updates.forEach(update => get().applyCitizenUpdate(update))
  },

  assignWorker: (citizenId, taskId) => set(state => ({
    citizens: state.citizens.map(c =>
      c.id === citizenId ? { ...c, isWorker: true, assignedTaskId: taskId } : c
    )
  })),

  unassignWorker: (citizenId) => set(state => ({
    citizens: state.citizens.map(c =>
      c.id === citizenId ? { ...c, isWorker: false, assignedTaskId: undefined } : c
    )
  })),

  resetAllStatus: () => set(state => ({
    citizens: state.citizens.map(c => ({
      ...c,
      statusColor: 'green' as const,
      statusHistory: [],
      currentPolicyImpact: 'Pre-construction: Normal daily life.',
      isWorker: false,
      assignedTaskId: undefined,
    }))
  })),
}))
```

---

## TASK 4 — Citizen Card Component (`src/components/citizens/CitizenCard.tsx`)

### What to build
A detailed slide-in panel for a selected citizen.

### Layout
```
┌─────────────────────────────────────┐
│ [← Back]              [🎤 Talk]     │
│                                     │
│ 🚌 Maria Santos               🟡    │
│ 34 • BEST Bus Driver • Single mother│
│                                     │
│ ──── Current Status ────            │
│ Month 4: Route adds 40 min/day.     │
│ Missed school pickup twice.          │
│                                     │
│ ──── Profile ────                   │
│ Income:  ₹18,000/month              │
│ Family:  2 children (7, 9)          │
│ Health:  Healthy                    │
│ Fear:    Missing pickups             │
│ Hope:    Quieter neighbourhood       │
│                                     │
│ ──── Status History ────            │
│ Month 1: 🟢 Normal                  │
│ Month 2: 🟡 Route added 20 min      │
│ Month 4: 🟡 Route +40 min           │
│                                     │
│ [Worker Badge if assigned]          │
└─────────────────────────────────────┘
```

### Status colour indicator
- Large coloured dot next to name
- `green` = "Thriving", `amber` = "Under pressure", `red` = "In crisis", `grey` = "Displaced"
- Animated pulse on `red`

### Worker assignment badge
- If `citizen.isWorker === true`, show:
  ```
  🏗️ ASSIGNED — Road Inspector
  Task: Excavation Block A
  Since: Month 2
  ```

### "Talk" button
- Calls `uiStore.openVoiceChat(citizenId)`
- Only enabled if citizen is featured (C001–C006) or if voice chat is fully wired

---

## TASK 5 — Citizen List Sidebar (`src/components/citizens/CitizenList.tsx`)

### What to build
A scrollable list of all 50 citizens in the left sidebar.

### Layout
```
Citizens (50)
Filter: [All ▼]  [🟢 32] [🟡 12] [🔴 4] [⬛ 2]

⭐ Featured
🚌 Maria Santos    🟡 Under pressure
🛒 Ravi Nair       🔴 In crisis
👷 Priya Mehra     🟢 Assigned
...

Background Citizens
[Auto-rickshaw driver — 🟢]
[IT worker — 🟢]
...
```

### Filters
- All / Green / Amber / Red / Grey / Workers
- Featured citizens always pinned to top with ⭐ star
- Click any citizen → `citizenStore.selectCitizen(id)` → opens CitizenCard

---

## TASK 6 — Citizen Hook (`src/hooks/useCitizen.ts`)

```typescript
export function useCitizen(id: string) {
  const citizen = useCitizenStore(state => state.getCitizenById(id))
  const selectCitizen = useCitizenStore(state => state.selectCitizen)
  const currentTick = useSimulationStore(state => state.currentTick)

  const statusLabel = {
    green: 'Thriving',
    amber: 'Under pressure',
    red: 'In crisis',
    grey: 'Displaced',
  }[citizen?.statusColor ?? 'green']

  const currentNarrative = citizen?.statusHistory
    .filter(h => h.tick <= currentTick)
    .at(-1)?.narrative ?? citizen?.currentPolicyImpact

  return {
    citizen,
    statusLabel,
    currentNarrative,
    select: () => selectCitizen(id),
    isSelected: useCitizenStore(state => state.selectedCitizenId === id),
  }
}
```

---

## ACCEPTANCE CRITERIA — Citizen Agent Complete When:

- [ ] `src/types/citizen.ts` exports all types with zero TypeScript errors
- [ ] `demo_citizens.json` contains exactly 50 citizens (6 featured + 44 background)
- [ ] All 6 featured citizens match the exact profiles specified
- [ ] All citizens have valid lat/lng coordinates within 2km of [19.1136, 72.8697]
- [ ] All citizens have dailyRoute arrays with minimum 3 waypoints
- [ ] `citizenStore` exports all specified actions and getters
- [ ] `CitizenCard` renders all citizen fields without overflow or missing data
- [ ] `CitizenList` shows all 50 citizens with featured ones pinned at top
- [ ] Status colour filters work correctly
- [ ] Worker badge shows correctly on Priya from tick 2 onwards
- [ ] Zero TypeScript errors
