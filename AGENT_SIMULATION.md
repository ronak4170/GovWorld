# AGENT_SIMULATION — Simulation Engine Agent Specification
## GOVWORLD | Time Machine & Tick Engine Owner

---

## YOUR IDENTITY
You are the Simulation Agent. You own time itself in GOVWORLD. You control the tick engine that advances the city through 12 months, fire events, update citizen states, trigger map changes, and drive the accountability ledger forward. When the judge clicks "Run 12 Months" and the world changes before their eyes — that is you.

## FILES YOU OWN
```
src/components/simulation/SimulationEngine.tsx
src/components/simulation/TimelineBar.tsx
src/components/simulation/EventFeed.tsx
src/components/simulation/SimControls.tsx
src/store/simulationStore.ts
src/types/simulation.ts             ← create this
src/data/demo_simulation_ticks.json ← generate this
src/data/demo_citizen_reactions.json ← generate this
src/hooks/useSimulation.ts
```

## FILES YOU MUST NEVER EDIT
```
src/components/map/**
src/components/citizens/**
src/components/council/**
src/components/voice/**
src/components/ledger/**
src/lib/cesium.ts
src/store/worldStore.ts
src/store/councilStore.ts
```

## FILES YOU READ (never write)
```
src/store/citizenStore.ts           ← trigger applyTickUpdates
src/store/worldStore.ts             ← trigger construction overlay updates
src/store/ledgerStore.ts            ← trigger task status updates
src/data/demo_simulation_ticks.json ← source of truth for demo
src/data/demo_citizen_reactions.json
src/lib/weather.ts                  ← check weather for active tick
```

---

## TASK 1 — Simulation Types (`src/types/simulation.ts`)

```typescript
export interface SimulationTick {
  month: number                     // 1-12
  label: string                     // e.g. "Month 3 — Monsoon Season Begins"
  headline: string                  // One-sentence summary shown in event feed
  constructionProgress: number      // 0-100 overall percent complete
  activeBlock: 'A' | 'B' | 'C' | 'complete' | null
  weatherEvent: WeatherEvent | null
  citizenUpdates: CitizenTickUpdate[]
  events: SimulationEvent[]
  mapOverlays: MapOverlayInstruction[]
  ledgerUpdates: LedgerTickUpdate[]
}

export interface WeatherEvent {
  type: 'monsoon' | 'heatwave' | 'flooding' | 'normal'
  description: string               // e.g. "Heavy monsoon — 14 workdays lost"
  workdaysLost: number
  severity: 'low' | 'medium' | 'high'
}

export interface CitizenTickUpdate {
  citizenId: string
  newStatus: 'green' | 'amber' | 'red' | 'grey'
  narrative: string                 // What happened to this person this month
  newPolicyImpact: string           // Updated impact summary
  routeChange?: [number, number][]  // New route if rerouted
  specialEvent?: string             // e.g. "ASSIGNED: Road Inspector"
}

export interface SimulationEvent {
  id: string
  tick: number
  type: 'construction' | 'displacement' | 'employment' | 'closure' | 'completion' | 'flag' | 'weather' | 'financial' | 'community'
  icon: string                      // Emoji
  title: string
  description: string
  affectedCitizenIds: string[]
  severity: 'info' | 'warning' | 'critical'
  color: string                     // Tailwind color
}

export interface MapOverlayInstruction {
  action: 'show' | 'hide' | 'update'
  overlayId: string
  overlayType: 'construction_zone' | 'completed_road' | 'weather' | 'flag' | 'worker'
  coords?: [number, number]
  color?: string
  label?: string
}

export interface LedgerTickUpdate {
  taskId: string
  newStatus: 'pending' | 'active' | 'delayed' | 'flagged' | 'complete'
  progressPercent: number
  flagReason?: string
  actualDate?: string
}

export interface SimulationState {
  currentTick: number               // 0 = pre-construction, 1-12 = months
  totalTicks: number                // Always 12
  isRunning: boolean
  isPaused: boolean
  speed: 1 | 2 | 5                  // Multiplier for tick interval
  allTicks: SimulationTick[]        // Pre-loaded tick data
  tickEvents: SimulationEvent[]     // All events fired so far
  constructionProgress: number      // 0-100
}
```

---

## TASK 2 — Pre-compute All 12 Ticks (`src/data/demo_simulation_ticks.json`)

Generate this file exactly. Every field must be populated.

```json
{
  "ticks": [
    {
      "month": 1,
      "label": "Month 1 — Construction Begins",
      "headline": "Excavation of Block A begins. Sahar Road partially closed.",
      "constructionProgress": 8,
      "activeBlock": "A",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C001",
          "newStatus": "amber",
          "narrative": "Maria's bus route now diverts 2km around Block A. Journey time up 20 minutes each way.",
          "newPolicyImpact": "Month 1: Route diverted — 20 extra minutes each way. Children's pickup still manageable.",
          "routeChange": [[19.1078,72.8645],[19.1060,72.8630],[19.1050,72.8670],[19.1189,72.8801]]
        },
        {
          "citizenId": "C002",
          "newStatus": "amber",
          "narrative": "Orange construction fencing now covers 40% of Ravi's shop frontage. Foot traffic noticeably down.",
          "newPolicyImpact": "Month 1: Fencing reduces storefront visibility. Revenue down ~25%."
        },
        {
          "citizenId": "C003",
          "newStatus": "amber",
          "narrative": "Priya visits the construction site hoping to find work. Not yet assigned.",
          "newPolicyImpact": "Month 1: Still unemployed. Watching the project from the outside."
        }
      ],
      "events": [
        {
          "id": "EVT-001-001",
          "tick": 1,
          "type": "construction",
          "icon": "🏗️",
          "title": "Excavation Begins — Block A",
          "description": "Ram Construction Ltd begins excavation on the western 1.1km of Sahar Road. Road width reduced to one lane in each direction.",
          "affectedCitizenIds": ["C001", "C002", "C006"],
          "severity": "info",
          "color": "orange"
        },
        {
          "id": "EVT-001-002",
          "tick": 1,
          "type": "displacement",
          "icon": "🚧",
          "title": "14 Businesses Partially Obstructed",
          "description": "Construction fencing begins impacting storefronts along Block A. No compensation framework yet active.",
          "affectedCitizenIds": ["C002"],
          "severity": "warning",
          "color": "amber"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T001", "newStatus": "active", "progressPercent": 5, "actualDate": "2024-04-01" },
        { "taskId": "T007", "newStatus": "active", "progressPercent": 10, "actualDate": "2024-04-15" }
      ]
    },
    {
      "month": 2,
      "label": "Month 2 — Priya Gets Assigned",
      "headline": "Priya Mehra hired as road quality inspector. Utility relocation begins.",
      "constructionProgress": 18,
      "activeBlock": "A",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C003",
          "newStatus": "green",
          "narrative": "Priya is hired as a quality control inspector on Block A. First income in 5 months.",
          "newPolicyImpact": "Month 2: EMPLOYED — Road Inspector, Ram Construction. ₹28,000/month.",
          "specialEvent": "ASSIGNED: Road Inspector — Task T001"
        },
        {
          "citizenId": "C001",
          "newStatus": "amber",
          "narrative": "Route diversion continues. School pickup still manageable but stressful.",
          "newPolicyImpact": "Month 2: Route adds 20 min. Managing but exhausted."
        }
      ],
      "events": [
        {
          "id": "EVT-002-001",
          "tick": 2,
          "type": "employment",
          "icon": "✅",
          "title": "Priya Mehra Assigned — Quality Inspector",
          "description": "C003 Priya Mehra (civil engineer, formerly unemployed) assigned to road inspection team. System identified her skills match from citizen population.",
          "affectedCitizenIds": ["C003"],
          "severity": "info",
          "color": "emerald"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T001", "newStatus": "active", "progressPercent": 30 },
        { "taskId": "T007", "newStatus": "active", "progressPercent": 45 }
      ]
    },
    {
      "month": 3,
      "label": "Month 3 — Monsoon Begins. Contractor B Delayed.",
      "headline": "Monsoon season arrives. 14 workdays lost. Contractor B flags first delay.",
      "constructionProgress": 26,
      "activeBlock": "A",
      "weatherEvent": {
        "type": "monsoon",
        "description": "Mumbai monsoon onset — heavy rainfall June 8-22. 14 workdays lost on excavation.",
        "workdaysLost": 14,
        "severity": "high"
      },
      "citizenUpdates": [
        {
          "citizenId": "C001",
          "newStatus": "amber",
          "narrative": "Monsoon makes the bus diversion route dangerous. One near-miss with a flooded underpass. Maria files an internal report.",
          "newPolicyImpact": "Month 3: Monsoon + diversion = dangerous conditions. Filing route safety report."
        },
        {
          "citizenId": "C005",
          "newStatus": "amber",
          "narrative": "Rain + construction dust creates muddy spray reaching Fatima's classroom windows. 3 days of class disrupted.",
          "newPolicyImpact": "Month 3: Classroom dust and mud. Students distracted. Board exam prep affected."
        }
      ],
      "events": [
        {
          "id": "EVT-003-001",
          "tick": 3,
          "type": "weather",
          "icon": "🌧️",
          "title": "Monsoon Season — 14 Workdays Lost",
          "description": "Heavy monsoon rainfall halts Block A excavation for 14 workdays. Timeline at risk.",
          "affectedCitizenIds": ["C001","C002","C003","C005","C006"],
          "severity": "warning",
          "color": "blue"
        },
        {
          "id": "EVT-003-002",
          "tick": 3,
          "type": "flag",
          "icon": "🚩",
          "title": "Contractor B — First Delay Flag",
          "description": "CityUtil Services (Task T007) now running 2 weeks behind schedule. Reason cited: monsoon. Watchdog flag raised — monsoon was predicted.",
          "affectedCitizenIds": [],
          "severity": "warning",
          "color": "orange"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T001", "newStatus": "delayed", "progressPercent": 55, "flagReason": "Monsoon — 14 workdays lost" },
        { "taskId": "T007", "newStatus": "flagged", "progressPercent": 60, "flagReason": "Running 2 weeks behind schedule — monsoon not built into timeline" }
      ]
    },
    {
      "month": 4,
      "label": "Month 4 — Ravi's Revenue Collapses",
      "headline": "Block A excavation complete. Block B begins. Ravi's shop enters crisis.",
      "constructionProgress": 35,
      "activeBlock": "B",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C002",
          "newStatus": "red",
          "narrative": "Block B construction now directly in front of Ravi's shop. Revenue down 60%. He cannot pay rent this month.",
          "newPolicyImpact": "Month 4: CRISIS — Revenue -60%. Cannot pay rent. Considering asking son for help."
        },
        {
          "citizenId": "C001",
          "newStatus": "red",
          "narrative": "Route now 40 minutes longer each way. Maria missed school pickup twice this week. Her younger child was waiting alone.",
          "newPolicyImpact": "Month 4: CRISIS — Route +40 min. Missed pickup twice. Asking neighbour to help with children.",
          "routeChange": [[19.1078,72.8645],[19.1050,72.8620],[19.1040,72.8680],[19.1080,72.8750],[19.1189,72.8801]]
        },
        {
          "citizenId": "C006",
          "newStatus": "amber",
          "narrative": "Dev's cycling route no longer safe. Now taking autos to work. Costs ₹600 extra per month. Actively researching Bangalore offices.",
          "newPolicyImpact": "Month 4: Cycling abandoned. Auto costs rising. Looking at relocation options."
        }
      ],
      "events": [
        {
          "id": "EVT-004-001",
          "tick": 4,
          "type": "closure",
          "icon": "🔴",
          "title": "Nair General Store — Revenue Crisis",
          "description": "C002 Ravi Nair's shop (30 years old) enters financial crisis. Block B construction directly obstructs storefront. Revenue at 40% of normal.",
          "affectedCitizenIds": ["C002"],
          "severity": "critical",
          "color": "red"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T001", "newStatus": "complete", "progressPercent": 100, "actualDate": "2024-07-05" },
        { "taskId": "T002", "newStatus": "active", "progressPercent": 15 },
        { "taskId": "T004", "newStatus": "active", "progressPercent": 20 }
      ]
    },
    {
      "month": 5,
      "label": "Month 5 — Fatima Files Complaint",
      "headline": "School dust complaint escalates. Midpoint construction review scheduled.",
      "constructionProgress": 45,
      "activeBlock": "B",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C005",
          "newStatus": "red",
          "narrative": "Fatima formally files a dust and noise complaint with the municipal corporation. Two of her students with asthma have had attacks this month.",
          "newPolicyImpact": "Month 5: Formal complaint filed. 2 asthmatic students affected. Waiting for response."
        },
        {
          "citizenId": "C002",
          "newStatus": "red",
          "narrative": "Ravi takes out a small loan to cover rent. His wife suggests closing for a month. He refuses.",
          "newPolicyImpact": "Month 5: Loan taken to cover rent. Still refusing to close."
        }
      ],
      "events": [
        {
          "id": "EVT-005-001",
          "tick": 5,
          "type": "community",
          "icon": "📢",
          "title": "School Dust Complaint — Fatima Sheikh",
          "description": "Municipal School No.47 teacher Fatima Sheikh files formal dust and noise complaint. Two asthmatic students affected. Complaint filed with MCGM.",
          "affectedCitizenIds": ["C005"],
          "severity": "warning",
          "color": "amber"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T002", "newStatus": "active", "progressPercent": 45 },
        { "taskId": "T004", "newStatus": "active", "progressPercent": 55 }
      ]
    },
    {
      "month": 6,
      "label": "Month 6 — Contractor B Flagged Red",
      "headline": "Contractor B misses key milestone. Red flag raised. Watchdog activated.",
      "constructionProgress": 52,
      "activeBlock": "B",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C003",
          "newStatus": "green",
          "narrative": "Priya files her midpoint quality inspection report — flags 3 sections of Block A paving as below standard thickness. Her report is the first official documentation of quality issues.",
          "newPolicyImpact": "Month 6: Midpoint report filed. Found 3 quality issues in Block A. Getting recognition."
        }
      ],
      "events": [
        {
          "id": "EVT-006-001",
          "tick": 6,
          "type": "flag",
          "icon": "🚨",
          "title": "CRITICAL FLAG — Contractor B 6 Weeks Behind",
          "description": "Ram Construction Ltd (Task T002, Block B excavation) is now 6 weeks behind projected schedule with no approved recovery plan. Penalty clause should have been triggered 2 weeks ago.",
          "affectedCitizenIds": [],
          "severity": "critical",
          "color": "red"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T002", "newStatus": "flagged", "progressPercent": 60, "flagReason": "6 weeks behind schedule — penalty clause should have triggered. No recovery plan submitted." },
        { "taskId": "T005", "newStatus": "active", "progressPercent": 10 }
      ]
    },
    {
      "month": 7,
      "label": "Month 7 — Midpoint Review",
      "headline": "Government midpoint review. Council re-debates. Some conditions still unmet.",
      "constructionProgress": 60,
      "activeBlock": "B",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C001",
          "newStatus": "amber",
          "narrative": "MCGM acknowledges Maria's bus route safety report. Alternate route gets temporary road lights. Slight improvement.",
          "newPolicyImpact": "Month 7: Route safety improved marginally. Still 40 min longer but lights added."
        },
        {
          "citizenId": "C002",
          "newStatus": "red",
          "narrative": "Ravi sees light at end of tunnel as Block B paving begins on far end. But rent loan is compounding.",
          "newPolicyImpact": "Month 7: Paving starting at far end. Maybe 2 more months of this."
        }
      ],
      "events": [
        {
          "id": "EVT-007-001",
          "tick": 7,
          "type": "construction",
          "icon": "📋",
          "title": "Government Midpoint Review Conducted",
          "description": "MMRDA midpoint review finds: 3 of 5 council conditions unmet (compensation fund, independent auditor, cycling lane). Project 10% behind schedule.",
          "affectedCitizenIds": ["C001","C002","C003","C004","C005","C006"],
          "severity": "warning",
          "color": "amber"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T002", "newStatus": "active", "progressPercent": 75 },
        { "taskId": "T005", "newStatus": "active", "progressPercent": 30 }
      ]
    },
    {
      "month": 8,
      "label": "Month 8 — Block B Complete",
      "headline": "Block B excavation and paving complete. Block C begins.",
      "constructionProgress": 68,
      "activeBlock": "C",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C002",
          "newStatus": "amber",
          "narrative": "Block B paving done. Fencing partially removed from Ravi's frontage. Revenue still only 50% of normal but recovering.",
          "newPolicyImpact": "Month 8: Fencing partially down. Starting to see some customers return. Still in debt."
        },
        {
          "citizenId": "C004",
          "newStatus": "green",
          "narrative": "The completed Block A and B sections mean autorickshaws can now navigate through more easily. Arjun's area is slightly more accessible.",
          "newPolicyImpact": "Month 8: Autos reaching my area more easily. First doctor visit in 4 months."
        }
      ],
      "events": [
        {
          "id": "EVT-008-001",
          "tick": 8,
          "type": "completion",
          "icon": "✅",
          "title": "Block B Complete — Block C Begins",
          "description": "Blocks A and B now fully paved. 2.2km of 3.2km complete. Block C excavation begins at eastern end.",
          "affectedCitizenIds": ["C002","C004"],
          "severity": "info",
          "color": "emerald"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T002", "newStatus": "complete", "progressPercent": 100, "actualDate": "2024-11-02" },
        { "taskId": "T005", "newStatus": "complete", "progressPercent": 100 },
        { "taskId": "T003", "newStatus": "active", "progressPercent": 20 },
        { "taskId": "T006", "newStatus": "active", "progressPercent": 10 }
      ]
    },
    {
      "month": 9,
      "label": "Month 9 — Dev Files Relocation Intent",
      "headline": "Dev Patel files startup office relocation inquiry to Bangalore. Cycling lane still not reinstated.",
      "constructionProgress": 76,
      "activeBlock": "C",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C006",
          "newStatus": "red",
          "narrative": "Dev formally requests a quote from a Bangalore co-working space. No cycling infrastructure. The city has failed him on this one.",
          "newPolicyImpact": "Month 9: Relocation quote requested. Cycling lane still gone at Month 9. Disillusioned.",
          "routeChange": [[19.1143,72.8682],[19.1160,72.8710],[19.1175,72.8750]]
        }
      ],
      "events": [
        {
          "id": "EVT-009-001",
          "tick": 9,
          "type": "displacement",
          "icon": "✈️",
          "title": "Dev Patel — Relocation Intent Filed",
          "description": "C006 Dev Patel (startup founder, daily cyclist) requests Bangalore relocation quote after 9 months without cycling infrastructure. A talented young entrepreneur potentially lost to the city.",
          "affectedCitizenIds": ["C006"],
          "severity": "warning",
          "color": "amber"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T003", "newStatus": "active", "progressPercent": 55 }
      ]
    },
    {
      "month": 10,
      "label": "Month 10 — Utility Pipe Burst",
      "headline": "Unplanned utility pipe burst adds ₹4cr to budget and 3-week delay.",
      "constructionProgress": 82,
      "activeBlock": "C",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C003",
          "newStatus": "green",
          "narrative": "Priya's quality inspection catches a hairline crack in a newly laid section of Block C before it worsens. Her catch saves an estimated ₹80 lakh in rework.",
          "newPolicyImpact": "Month 10: Quality catch saves ₹80L. Getting recommendation letter from site manager."
        }
      ],
      "events": [
        {
          "id": "EVT-010-001",
          "tick": 10,
          "type": "financial",
          "icon": "💸",
          "title": "Utility Pipe Burst — Budget Overrun",
          "description": "Unplanned rupture of a 60-year-old water main during Block C excavation. Emergency repair cost: ₹4.2cr. Timeline extended by 3 weeks. Total project now 17% over original budget.",
          "affectedCitizenIds": [],
          "severity": "critical",
          "color": "red"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T003", "newStatus": "flagged", "progressPercent": 78, "flagReason": "Pipe burst — ₹4.2cr emergency spend. Timeline +3 weeks." }
      ]
    },
    {
      "month": 11,
      "label": "Month 11 — Final Stretch",
      "headline": "Block C nearing completion. Ravi sees revenue recovering. Road end in sight.",
      "constructionProgress": 92,
      "activeBlock": "C",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C001",
          "newStatus": "amber",
          "narrative": "Maria can see the road almost finished. One more month. She's holding on.",
          "newPolicyImpact": "Month 11: Almost done. Route still 30 min extra but psychological relief in sight."
        },
        {
          "citizenId": "C002",
          "newStatus": "amber",
          "narrative": "Ravi's revenue is back to 65% of normal. He didn't close. The shop survived. Just barely.",
          "newPolicyImpact": "Month 11: Revenue at 65%. Still paying back loan but surviving. Proud."
        }
      ],
      "events": [
        {
          "id": "EVT-011-001",
          "tick": 11,
          "type": "construction",
          "icon": "🏁",
          "title": "Final Phase — Block C Paving",
          "description": "Block C paving in progress. 92% project completion. Road completion expected Month 12.",
          "affectedCitizenIds": ["C001","C002","C003","C004","C005","C006"],
          "severity": "info",
          "color": "blue"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T003", "newStatus": "complete", "progressPercent": 100, "actualDate": "2025-02-20" },
        { "taskId": "T006", "newStatus": "complete", "progressPercent": 100 },
        { "taskId": "T008", "newStatus": "active", "progressPercent": 40 }
      ]
    },
    {
      "month": 12,
      "label": "Month 12 — Road Complete",
      "headline": "Sahar Road widening complete. Some win. Some lost. Corruption flagged. Ledger tells the truth.",
      "constructionProgress": 100,
      "activeBlock": "complete",
      "weatherEvent": null,
      "citizenUpdates": [
        {
          "citizenId": "C001",
          "newStatus": "green",
          "narrative": "Maria's bus route is restored. Journey time back to normal. She picked up both children from school today.",
          "newPolicyImpact": "Month 12: Route restored. Normal again. Children picked up on time. Relief."
        },
        {
          "citizenId": "C002",
          "newStatus": "amber",
          "narrative": "Road complete. Ravi's frontage is clear. Revenue slowly returning. Loan will take 8 more months to repay. He got no compensation.",
          "newPolicyImpact": "Month 12: Open again. Revenue at 75%. Loan repayment ongoing. Never compensated."
        },
        {
          "citizenId": "C003",
          "newStatus": "green",
          "narrative": "Priya has a full-time job offer from Bharat Infra for the next project. Her career relaunched.",
          "newPolicyImpact": "Month 12: Permanent job offer received. Career back on track."
        },
        {
          "citizenId": "C004",
          "newStatus": "green",
          "narrative": "Arjun can now take an autorickshaw directly to the clinic. First full check-up in a year. His HbA1c is under control.",
          "newPolicyImpact": "Month 12: Clinic accessible now. Medical check done. Feeling better."
        },
        {
          "citizenId": "C005",
          "newStatus": "green",
          "narrative": "Fatima's classroom is finally dust-free. Her board exam students performed well despite 6 months of disruption.",
          "newPolicyImpact": "Month 12: Clean classroom. Students performed well. Relief."
        },
        {
          "citizenId": "C006",
          "newStatus": "red",
          "narrative": "Dev finalises the Bangalore move. No cycling lane was reinstated. Mumbai lost a startup founder.",
          "newPolicyImpact": "Month 12: RELOCATED TO BANGALORE. Cycling lane never came back."
        }
      ],
      "events": [
        {
          "id": "EVT-012-001",
          "tick": 12,
          "type": "completion",
          "icon": "🎉",
          "title": "Sahar Road Widening — COMPLETE",
          "description": "3.2km road widening complete. Final cost: ₹49.2cr (17% over budget). Final timeline: 12 months + 3 week pipe burst delay. Cycling infrastructure NOT reinstated.",
          "affectedCitizenIds": ["C001","C002","C003","C004","C005","C006"],
          "severity": "info",
          "color": "emerald"
        },
        {
          "id": "EVT-012-002",
          "tick": 12,
          "type": "flag",
          "icon": "🔍",
          "title": "ACCOUNTABILITY REPORT — 3 Violations Flagged",
          "description": "Final ledger audit: (1) Contractor B ran 6 weeks late with no penalty collected, (2) Business compensation fund never established, (3) Cycling lane not reinstated despite council condition. These are now on public record.",
          "affectedCitizenIds": [],
          "severity": "critical",
          "color": "red"
        }
      ],
      "ledgerUpdates": [
        { "taskId": "T008", "newStatus": "complete", "progressPercent": 100, "actualDate": "2025-04-10" }
      ]
    }
  ]
}
```

---

## TASK 3 — Simulation Store (`src/store/simulationStore.ts`)

```typescript
import { create } from 'zustand'
import type { SimulationState, SimulationTick } from '../types/simulation'

interface SimulationActions {
  loadTicks: (ticks: SimulationTick[]) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resetSimulation: () => void
  seekToTick: (month: number) => void
  advanceTick: () => void
  setSpeed: (speed: 1 | 2 | 5) => void
  getCurrentTick: () => SimulationTick | null
}

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  currentTick: 0,
  totalTicks: 12,
  isRunning: false,
  isPaused: false,
  speed: 1,
  allTicks: [],
  tickEvents: [],
  constructionProgress: 0,

  loadTicks: (ticks) => set({ allTicks: ticks }),

  startSimulation: () => set({ isRunning: true, isPaused: false }),
  pauseSimulation: () => set({ isPaused: !get().isPaused }),

  resetSimulation: () => set({
    currentTick: 0,
    isRunning: false,
    isPaused: false,
    tickEvents: [],
    constructionProgress: 0,
  }),

  seekToTick: (month) => {
    const tick = get().allTicks.find(t => t.month === month)
    if (!tick) return
    set({ currentTick: month, constructionProgress: tick.constructionProgress })
    // Trigger citizen and ledger updates up to this tick
    // (Integration agent wires this to citizenStore.applyTickUpdates)
  },

  advanceTick: () => {
    const { currentTick, totalTicks, allTicks } = get()
    if (currentTick >= totalTicks) {
      set({ isRunning: false })
      return
    }
    const nextTick = currentTick + 1
    const tick = allTicks.find(t => t.month === nextTick)
    if (!tick) return
    set(state => ({
      currentTick: nextTick,
      constructionProgress: tick.constructionProgress,
      tickEvents: [...state.tickEvents, ...tick.events],
    }))
  },

  setSpeed: (speed) => set({ speed }),

  getCurrentTick: () => {
    const { currentTick, allTicks } = get()
    return allTicks.find(t => t.month === currentTick) ?? null
  },
}))
```

---

## TASK 4 — Simulation Engine Component (`src/components/simulation/SimulationEngine.tsx`)

This is a logic component — no visual output of its own. It drives the tick cycle.

```typescript
// Runs a setInterval when simulation is running
// Interval duration: 3000ms / speed (so speed=2 → 1500ms per tick)
// Each interval: call simulationStore.advanceTick()
// On each tick advance:
//   1. Apply citizen updates from current tick → citizenStore.applyTickUpdates()
//   2. Apply ledger updates → ledgerStore.applyTickUpdates()
//   3. Trigger map overlay update → worldStore.setActiveBlock() + setConstructionProgress()
//   4. Add events to EventFeed
// Clean up interval on unmount or when isRunning becomes false
```

---

## TASK 5 — Timeline Bar (`src/components/simulation/TimelineBar.tsx`)

### Visual spec
```
Month 1  2  3  4  5  6  7  8  9 10 11 12
  ●────●────●────●────●────◌────◌────◌────◌────◌────◌────◌
        [current position indicator]

[▶ Play]  [⏸ Pause]  [↺ Reset]  Speed: [1x] [2x] [5x]
```

- Filled dots = ticks that have been completed
- Current tick dot = pulsing white
- Future ticks = hollow dots
- Click any dot → `simulationStore.seekToTick(month)`
- Drag slider → seek to any month (debounced 200ms)
- Labels: show month number + brief label on hover

---

## TASK 6 — Event Feed (`src/components/simulation/EventFeed.tsx`)

### Visual spec
Real-time feed of events as they fire. Latest event at top. Auto-scrolls.

```
🚨 Month 6: CRITICAL — Contractor B 6 Weeks Behind [red]
📢 Month 5: WARNING — School Dust Complaint Filed [amber]
✅ Month 2: INFO — Priya Mehra Assigned [green]
🏗️ Month 1: INFO — Excavation Begins Block A [blue]
```

- Each event: icon + month label + title + severity colour border
- Animate in from top (slide down, fade in)
- Max 20 events visible; scrollable
- Filter buttons: [All] [Critical] [Warning] [Info]

---

## ACCEPTANCE CRITERIA — Simulation Agent Complete When:

- [ ] demo_simulation_ticks.json has all 12 ticks fully populated
- [ ] demo_citizen_reactions.json has all citizen updates for all 12 ticks
- [ ] SimulationEngine runs tick cycle correctly at all speeds
- [ ] Each tick triggers citizen store updates (verify by citizen status changes)
- [ ] Each tick triggers ledger updates (verify by task status changes)
- [ ] TimelineBar shows correct state for all 12 months
- [ ] Seeking to Month 6 correctly sets citizen states to their Month 6 values
- [ ] EventFeed shows all events in order, animated
- [ ] Speed controls work (1x/2x/5x)
- [ ] Reset returns all state to Month 0
- [ ] Zero TypeScript errors
