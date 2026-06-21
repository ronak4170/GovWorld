# AGENT_LEDGER — Accountability Ledger Agent Specification
## GOVWORLD | Anti-Corruption & Workforce Management Owner

---

## YOUR IDENTITY
You are the Ledger Agent. You own the accountability system — the feature that separates GOVWORLD from every other urban planning tool in the world. You track every contractor, every task, every worker, every deadline, every rupee. You flag corruption before it hides. You find the unemployed engineer in the citizen population and give her a job. When the Corruption Watchdog on the council says "there are no penalty clauses" — your ledger is the proof.

## FILES YOU OWN
```
src/components/ledger/AccountabilityLedger.tsx
src/components/ledger/TaskRow.tsx
src/components/ledger/ContractorFlag.tsx
src/components/ledger/WorkerAssignment.tsx
src/store/ledgerStore.ts
src/types/ledger.ts                 ← create this
src/data/demo_ledger.json           ← generate this
src/hooks/useLedger.ts
```

## FILES YOU MUST NEVER EDIT
```
src/components/map/**
src/components/citizens/**
src/components/council/**
src/components/simulation/**
src/components/voice/**
src/lib/cesium.ts
src/lib/speech.ts
src/store/worldStore.ts
src/store/councilStore.ts
```

## FILES YOU READ (never write)
```
src/store/citizenStore.ts           ← read citizen skills for worker matching
src/store/simulationStore.ts        ← read currentTick for task status
src/lib/weather.ts                  ← check weather impact on tasks
```

---

## TASK 1 — Ledger Types (`src/types/ledger.ts`)

```typescript
export type TaskStatus = 'pending' | 'active' | 'delayed' | 'flagged' | 'complete'
export type FlagSeverity = 'info' | 'warning' | 'critical'

export interface Contractor {
  id: string
  name: string
  registrationNumber: string
  completionRate: number            // 0-1 (e.g. 0.8 = 80% on-time completion)
  pastProjects: ContractorProject[]
  trustScore: number                // 1-10 (auto-calculated from history)
  flagged: boolean                  // Pre-flagged at assignment based on history
  flagReason?: string
}

export interface ContractorProject {
  projectName: string
  year: number
  onTime: boolean
  delayWeeks?: number
  notes: string
}

export interface Worker {
  citizenId: string                 // Links to Citizen
  name: string
  role: string                      // e.g. "Quality Inspector", "Excavation Labourer"
  assignedDate: string              // ISO date (simulation month)
  taskId: string
  dailyWage?: number
}

export interface LedgerTask {
  id: string
  title: string
  description: string
  phase: 'excavation' | 'paving' | 'utilities' | 'signage' | 'inspection'
  block: 'A' | 'B' | 'C' | 'full'

  // Contractor
  contractorId: string
  contractorName: string

  // Workers
  assignedWorkers: Worker[]

  // Timeline
  projectedStartDate: string        // e.g. "Month 1"
  projectedEndDate: string          // e.g. "Month 3"
  actualStartDate?: string
  actualEndDate?: string
  projectedDurationMonths: number
  actualDurationMonths?: number

  // Progress
  status: TaskStatus
  progressPercent: number           // 0-100
  delayWeeks: number               // 0 if on time

  // Budget
  budgetINR: number
  spentToDateINR: number
  budgetVariancePercent: number     // Computed: (spent/budget - 1) * 100

  // Flags
  flags: LedgerFlag[]
  weatherImpactDays: number

  // Accountability
  penaltyClause: boolean
  penaltyPerWeekINR: number
  penaltyCollected: boolean         // Did they actually collect it?
}

export interface LedgerFlag {
  id: string
  taskId: string
  severity: FlagSeverity
  type: 'delay' | 'budget' | 'quality' | 'contractor_history' | 'weather' | 'missing_clause'
  title: string
  description: string
  raisedAt: string                  // simulation month when raised
  resolvedAt?: string
  isResolved: boolean
  icon: string                      // Emoji
}

export interface LedgerSummary {
  totalBudgetINR: number
  totalSpentINR: number
  budgetVariancePercent: number
  totalTasks: number
  completedTasks: number
  delayedTasks: number
  flaggedTasks: number
  activeTasks: number
  totalWorkers: number
  penaltiesOwedINR: number
  penaltiesCollectedINR: number
  openFlags: LedgerFlag[]
}
```

---

## TASK 2 — Generate `src/data/demo_ledger.json`

```json
{
  "contractors": [
    {
      "id": "CONT-001",
      "name": "Ram Construction Ltd",
      "registrationNumber": "MMRDA-CON-2891",
      "completionRate": 0.80,
      "trustScore": 6,
      "flagged": false,
      "pastProjects": [
        { "projectName": "Juhu Tara Road Widening", "year": 2022, "onTime": false, "delayWeeks": 8, "notes": "Delayed due to subcontractor dispute" },
        { "projectName": "Andheri West Drain Cover", "year": 2021, "onTime": true, "delayWeeks": 0, "notes": "Completed on schedule" },
        { "projectName": "SV Road Repair Phase 2", "year": 2020, "onTime": true, "delayWeeks": 0, "notes": "" },
        { "projectName": "Linking Road Resurfacing", "year": 2019, "onTime": true, "delayWeeks": 0, "notes": "" },
        { "projectName": "Oshiwara Bridge Approach", "year": 2018, "onTime": false, "delayWeeks": 3, "notes": "Monsoon delays — not penalised" }
      ]
    },
    {
      "id": "CONT-002",
      "name": "Bharat Infra Pvt Ltd",
      "registrationNumber": "MMRDA-CON-4451",
      "completionRate": 1.00,
      "trustScore": 9,
      "flagged": false,
      "pastProjects": [
        { "projectName": "Kurla Flyover Approach", "year": 2023, "onTime": true, "delayWeeks": 0, "notes": "Delivered 2 weeks early" },
        { "projectName": "Ghatkopar Metro Feeder Road", "year": 2022, "onTime": true, "delayWeeks": 0, "notes": "" },
        { "projectName": "Powai Lake Road Repair", "year": 2021, "onTime": true, "delayWeeks": 0, "notes": "" }
      ]
    },
    {
      "id": "CONT-003",
      "name": "CityUtil Services",
      "registrationNumber": "MMRDA-CON-3312",
      "completionRate": 0.67,
      "trustScore": 4,
      "flagged": true,
      "flagReason": "2 of 3 prior projects delayed by average 3.5 weeks. Under MMRDA review since 2023.",
      "pastProjects": [
        { "projectName": "Bandra Utility Rerouting", "year": 2023, "onTime": false, "delayWeeks": 5, "notes": "Labour shortage cited" },
        { "projectName": "Chembur Pipeline Shift", "year": 2022, "onTime": false, "delayWeeks": 2, "notes": "Material delivery delay" },
        { "projectName": "Matunga Water Main Relocation", "year": 2021, "onTime": true, "delayWeeks": 0, "notes": "" }
      ]
    },
    {
      "id": "CONT-004",
      "name": "SignPro Ltd",
      "registrationNumber": "MMRDA-CON-7890",
      "completionRate": 0,
      "trustScore": 5,
      "flagged": true,
      "flagReason": "No prior projects on record with MMRDA. First-time contractor — no performance history available.",
      "pastProjects": []
    }
  ],
  "tasks": [
    {
      "id": "T001",
      "title": "Excavation — Block A (1.1km)",
      "description": "Full-depth excavation of existing road surface, sub-base removal, and preparation for new sub-base. Block A: Western Express Highway junction to midpoint.",
      "phase": "excavation",
      "block": "A",
      "contractorId": "CONT-001",
      "contractorName": "Ram Construction Ltd",
      "assignedWorkers": [
        { "citizenId": "C003", "name": "Priya Mehra", "role": "Quality Control Inspector", "assignedDate": "Month 2", "taskId": "T001", "dailyWage": 1400 },
        { "citizenId": "C012", "name": "Suresh Pawar", "role": "Site Foreman", "assignedDate": "Month 1", "taskId": "T001", "dailyWage": 900 },
        { "citizenId": "C018", "name": "Dinesh Koli", "role": "Excavation Labourer", "assignedDate": "Month 1", "taskId": "T001", "dailyWage": 650 },
        { "citizenId": "C027", "name": "Ramesh Shinde", "role": "Excavation Labourer", "assignedDate": "Month 1", "taskId": "T001", "dailyWage": 650 }
      ],
      "projectedStartDate": "Month 1",
      "projectedEndDate": "Month 3",
      "actualStartDate": "Month 1",
      "actualEndDate": "Month 4",
      "projectedDurationMonths": 3,
      "actualDurationMonths": 4,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 3,
      "budgetINR": 8200000,
      "spentToDateINR": 9100000,
      "budgetVariancePercent": 10.97,
      "weatherImpactDays": 14,
      "penaltyClause": false,
      "penaltyPerWeekINR": 0,
      "penaltyCollected": false,
      "flags": [
        {
          "id": "FLAG-T001-001",
          "taskId": "T001",
          "severity": "warning",
          "type": "delay",
          "title": "Block A — 3-week delay (monsoon)",
          "description": "Task T001 completed 3 weeks late due to 14 monsoon workdays lost in Month 3. No penalty clause exists to enforce accountability.",
          "raisedAt": "Month 3",
          "resolvedAt": "Month 4",
          "isResolved": true,
          "icon": "🌧️"
        },
        {
          "id": "FLAG-T001-002",
          "taskId": "T001",
          "severity": "critical",
          "type": "missing_clause",
          "title": "No penalty clause — delay not penalised",
          "description": "Contract for T001 contains no penalty clause for delays. 3-week delay resulted in zero financial consequence for contractor.",
          "raisedAt": "Month 1",
          "resolvedAt": null,
          "isResolved": false,
          "icon": "⚠️"
        }
      ]
    },
    {
      "id": "T002",
      "title": "Excavation — Block B (1.1km)",
      "description": "Full-depth excavation of Block B: midpoint to Andheri-Kurla Road junction.",
      "phase": "excavation",
      "block": "B",
      "contractorId": "CONT-001",
      "contractorName": "Ram Construction Ltd",
      "assignedWorkers": [
        { "citizenId": "C003", "name": "Priya Mehra", "role": "Quality Control Inspector", "assignedDate": "Month 2", "taskId": "T002", "dailyWage": 1400 },
        { "citizenId": "C012", "name": "Suresh Pawar", "role": "Site Foreman", "assignedDate": "Month 3", "taskId": "T002", "dailyWage": 900 },
        { "citizenId": "C019", "name": "Ganesh Bhoir", "role": "Excavation Labourer", "assignedDate": "Month 3", "taskId": "T002", "dailyWage": 650 }
      ],
      "projectedStartDate": "Month 3",
      "projectedEndDate": "Month 6",
      "actualStartDate": "Month 4",
      "actualEndDate": "Month 8",
      "projectedDurationMonths": 3,
      "actualDurationMonths": 4,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 6,
      "budgetINR": 8200000,
      "spentToDateINR": 9800000,
      "budgetVariancePercent": 19.51,
      "weatherImpactDays": 8,
      "penaltyClause": false,
      "penaltyPerWeekINR": 0,
      "penaltyCollected": false,
      "flags": [
        {
          "id": "FLAG-T002-001",
          "taskId": "T002",
          "severity": "critical",
          "type": "delay",
          "title": "🚨 Block B — 6 weeks behind schedule",
          "description": "Task T002 (Block B excavation) ran 6 weeks behind projected timeline. No penalty clause triggered. No recovery plan submitted by contractor in Months 5 or 6.",
          "raisedAt": "Month 6",
          "resolvedAt": "Month 8",
          "isResolved": true,
          "icon": "🚨"
        },
        {
          "id": "FLAG-T002-002",
          "taskId": "T002",
          "severity": "critical",
          "type": "missing_clause",
          "title": "No penalty clause — 6-week delay not penalised",
          "description": "₹0 in penalties collected for a 6-week delay on an ₹8.2cr contract. Council Condition #3 (penalty clause) was never implemented.",
          "raisedAt": "Month 6",
          "resolvedAt": null,
          "isResolved": false,
          "icon": "🔍"
        }
      ]
    },
    {
      "id": "T003",
      "title": "Excavation — Block C (1.0km)",
      "description": "Full-depth excavation of Block C: Andheri-Kurla Road junction to Eastern end.",
      "phase": "excavation",
      "block": "C",
      "contractorId": "CONT-002",
      "contractorName": "Bharat Infra Pvt Ltd",
      "assignedWorkers": [
        { "citizenId": "C031", "name": "Kavita Nair", "role": "Site Engineer", "assignedDate": "Month 6", "taskId": "T003", "dailyWage": 1200 },
        { "citizenId": "C035", "name": "Vijay Patil", "role": "Excavation Labourer", "assignedDate": "Month 6", "taskId": "T003", "dailyWage": 650 }
      ],
      "projectedStartDate": "Month 6",
      "projectedEndDate": "Month 9",
      "actualStartDate": "Month 6",
      "actualEndDate": "Month 11",
      "projectedDurationMonths": 3,
      "actualDurationMonths": 5,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 8,
      "budgetINR": 7500000,
      "spentToDateINR": 11700000,
      "budgetVariancePercent": 56.0,
      "weatherImpactDays": 3,
      "penaltyClause": true,
      "penaltyPerWeekINR": 75000,
      "penaltyCollected": false,
      "flags": [
        {
          "id": "FLAG-T003-001",
          "taskId": "T003",
          "severity": "critical",
          "type": "budget",
          "title": "💸 Pipe Burst — ₹4.2cr Emergency Overspend",
          "description": "Unplanned rupture of a 60-year-old water main during Month 10 excavation. Emergency repair cost ₹4.2cr added to task budget. Not covered by contractor insurance.",
          "raisedAt": "Month 10",
          "resolvedAt": null,
          "isResolved": false,
          "icon": "💸"
        },
        {
          "id": "FLAG-T003-002",
          "taskId": "T003",
          "severity": "warning",
          "type": "delay",
          "title": "Penalty clause exists but not collected",
          "description": "T003 has a penalty clause of ₹75,000/week. Task ran 8 weeks late — ₹6,00,000 owed by Bharat Infra. As of project end, penalty collection status: PENDING.",
          "raisedAt": "Month 9",
          "resolvedAt": null,
          "isResolved": false,
          "icon": "⚖️"
        }
      ]
    },
    {
      "id": "T004",
      "title": "Road Laying — Block A",
      "description": "Sub-base compaction, base course laying, bituminous surfacing — Block A.",
      "phase": "paving",
      "block": "A",
      "contractorId": "CONT-001",
      "contractorName": "Ram Construction Ltd",
      "assignedWorkers": [
        { "citizenId": "C003", "name": "Priya Mehra", "role": "Quality Inspector", "assignedDate": "Month 3", "taskId": "T004", "dailyWage": 1400 }
      ],
      "projectedStartDate": "Month 3",
      "projectedEndDate": "Month 5",
      "actualStartDate": "Month 4",
      "actualEndDate": "Month 6",
      "projectedDurationMonths": 2,
      "actualDurationMonths": 2,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 4,
      "budgetINR": 6800000,
      "spentToDateINR": 7100000,
      "budgetVariancePercent": 4.41,
      "weatherImpactDays": 6,
      "penaltyClause": false,
      "penaltyPerWeekINR": 0,
      "penaltyCollected": false,
      "flags": [
        {
          "id": "FLAG-T004-001",
          "taskId": "T004",
          "severity": "warning",
          "type": "quality",
          "title": "Quality issue — 3 sections below spec thickness",
          "description": "Inspector Priya Mehra flagged 3 sections of Block A paving at 78mm thickness instead of specified 85mm. Contractor required to add overlay. Caught before final approval.",
          "raisedAt": "Month 6",
          "resolvedAt": "Month 7",
          "isResolved": true,
          "icon": "🔍"
        }
      ]
    },
    {
      "id": "T005",
      "title": "Road Laying — Block B",
      "description": "Sub-base compaction, base course laying, bituminous surfacing — Block B.",
      "phase": "paving",
      "block": "B",
      "contractorId": "CONT-002",
      "contractorName": "Bharat Infra Pvt Ltd",
      "assignedWorkers": [],
      "projectedStartDate": "Month 6",
      "projectedEndDate": "Month 8",
      "actualStartDate": "Month 7",
      "actualEndDate": "Month 9",
      "projectedDurationMonths": 2,
      "actualDurationMonths": 2,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 4,
      "budgetINR": 6800000,
      "spentToDateINR": 7200000,
      "budgetVariancePercent": 5.88,
      "weatherImpactDays": 0,
      "penaltyClause": true,
      "penaltyPerWeekINR": 68000,
      "penaltyCollected": false,
      "flags": []
    },
    {
      "id": "T006",
      "title": "Road Laying — Block C",
      "description": "Sub-base compaction, base course laying, bituminous surfacing — Block C.",
      "phase": "paving",
      "block": "C",
      "contractorId": "CONT-002",
      "contractorName": "Bharat Infra Pvt Ltd",
      "assignedWorkers": [],
      "projectedStartDate": "Month 9",
      "projectedEndDate": "Month 11",
      "actualStartDate": "Month 10",
      "actualEndDate": "Month 12",
      "projectedDurationMonths": 2,
      "actualDurationMonths": 2,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 4,
      "budgetINR": 6500000,
      "spentToDateINR": 6800000,
      "budgetVariancePercent": 4.61,
      "weatherImpactDays": 0,
      "penaltyClause": true,
      "penaltyPerWeekINR": 65000,
      "penaltyCollected": false,
      "flags": []
    },
    {
      "id": "T007",
      "title": "Utility Line Relocation",
      "description": "Relocation of water, electrical, and telecom lines in conflict with road widening footprint.",
      "phase": "utilities",
      "block": "full",
      "contractorId": "CONT-003",
      "contractorName": "CityUtil Services",
      "assignedWorkers": [],
      "projectedStartDate": "Month 2",
      "projectedEndDate": "Month 4",
      "actualStartDate": "Month 2",
      "actualEndDate": "Month 5",
      "projectedDurationMonths": 2,
      "actualDurationMonths": 3,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 4,
      "budgetINR": 3200000,
      "spentToDateINR": 3900000,
      "budgetVariancePercent": 21.87,
      "weatherImpactDays": 5,
      "penaltyClause": false,
      "penaltyPerWeekINR": 0,
      "penaltyCollected": false,
      "flags": [
        {
          "id": "FLAG-T007-001",
          "taskId": "T007",
          "severity": "critical",
          "type": "contractor_history",
          "title": "🚨 CityUtil Services — Pre-flagged (2/3 prior delays)",
          "description": "CityUtil Services was pre-flagged at assignment due to 2 of 3 prior projects running delayed (avg 3.5 weeks). Assignment approved without open tender. Watchdog recommendation to re-tender was not actioned.",
          "raisedAt": "Month 1",
          "resolvedAt": null,
          "isResolved": false,
          "icon": "🚨"
        },
        {
          "id": "FLAG-T007-002",
          "taskId": "T007",
          "severity": "warning",
          "type": "delay",
          "title": "T007 — 4 weeks late with no penalty",
          "description": "Utility relocation ran 4 weeks late. No penalty clause existed. CityUtil blamed labour shortage.",
          "raisedAt": "Month 4",
          "resolvedAt": "Month 5",
          "isResolved": true,
          "icon": "⏱️"
        }
      ]
    },
    {
      "id": "T008",
      "title": "Signage and Road Markings",
      "description": "Installation of all road signs, lane markings, pedestrian crossings, and lighting.",
      "phase": "signage",
      "block": "full",
      "contractorId": "CONT-004",
      "contractorName": "SignPro Ltd",
      "assignedWorkers": [],
      "projectedStartDate": "Month 11",
      "projectedEndDate": "Month 12",
      "actualStartDate": "Month 11",
      "actualEndDate": "Month 12",
      "projectedDurationMonths": 1,
      "actualDurationMonths": 1,
      "status": "complete",
      "progressPercent": 100,
      "delayWeeks": 0,
      "budgetINR": 800000,
      "spentToDateINR": 850000,
      "budgetVariancePercent": 6.25,
      "weatherImpactDays": 0,
      "penaltyClause": true,
      "penaltyPerWeekINR": 8000,
      "penaltyCollected": false,
      "flags": [
        {
          "id": "FLAG-T008-001",
          "taskId": "T008",
          "severity": "info",
          "type": "contractor_history",
          "title": "SignPro Ltd — No prior history",
          "description": "SignPro Ltd has no prior project history with MMRDA. First-time contractor. Monitoring recommended.",
          "raisedAt": "Month 11",
          "resolvedAt": null,
          "isResolved": false,
          "icon": "ℹ️"
        }
      ]
    }
  ],
  "summary": {
    "totalBudgetINR": 48000000,
    "totalSpentINR": 56450000,
    "budgetVariancePercent": 17.6,
    "totalTasks": 8,
    "completedTasks": 8,
    "delayedTasks": 6,
    "flaggedTasks": 5,
    "activeTasks": 0,
    "totalWorkers": 14,
    "penaltiesOwedINR": 1260000,
    "penaltiesCollectedINR": 0,
    "openFlags": ["FLAG-T001-002","FLAG-T002-002","FLAG-T003-001","FLAG-T003-002","FLAG-T007-001"]
  },
  "conditions_status": {
    "compensation_fund": { "required": true, "implemented": false, "note": "Council Condition #1 — business compensation fund never established" },
    "open_tendering": { "required": true, "implemented": false, "note": "Council Condition #2 — CityUtil assigned without open tender" },
    "independent_auditor": { "required": true, "implemented": false, "note": "Council Condition #3 — no independent auditor appointed" },
    "cycling_infrastructure": { "required": true, "implemented": false, "note": "Council Condition #4 — cycling lane not reinstated in Phase 1" },
    "monsoon_buffer": { "required": true, "implemented": false, "note": "Council Condition #5 — no weather buffer built into any task timeline" }
  }
}
```

---

## TASK 3 — Ledger Store (`src/store/ledgerStore.ts`)

```typescript
import { create } from 'zustand'
import type { LedgerTask, LedgerFlag, LedgerSummary, Contractor } from '../types/ledger'

interface LedgerState {
  tasks: LedgerTask[]
  contractors: Contractor[]
  summary: LedgerSummary | null
  selectedTaskId: string | null
  filterStatus: 'all' | 'active' | 'delayed' | 'flagged' | 'complete'

  // Actions
  initialiseLedger: (tasks: LedgerTask[], contractors: Contractor[]) => void
  applyTickUpdate: (taskId: string, status: LedgerTask['status'], progress: number, flagReason?: string) => void
  applyTickUpdates: (updates: Array<{ taskId: string; newStatus: LedgerTask['status']; progressPercent: number; flagReason?: string }>) => void
  raiseFlag: (flag: LedgerFlag) => void
  resolveFlag: (flagId: string) => void
  selectTask: (taskId: string | null) => void
  setFilter: (filter: LedgerState['filterStatus']) => void
  computeSummary: () => void

  // Getters
  getTaskById: (id: string) => LedgerTask | undefined
  getContractorById: (id: string) => Contractor | undefined
  getFlaggedTasks: () => LedgerTask[]
  getOpenFlags: () => LedgerFlag[]
}
```

---

## TASK 4 — Accountability Ledger UI (`src/components/ledger/AccountabilityLedger.tsx`)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  ACCOUNTABILITY LEDGER                                   │
│  Budget: ₹48cr → ₹56.4cr (+17.6%) | 5 open flags 🚨   │
│                                                          │
│  [All] [Active] [Delayed] [Flagged] [Complete]           │
├──────────────────────────────────────────────────────────┤
│  🚨 T002 Block B Excavation  ████████░░ 100%  DELAYED   │
│      Ram Construction Ltd • 6 weeks late • No penalty   │
│      [View flags ▾]                                      │
├──────────────────────────────────────────────────────────┤
│  🚨 T007 Utility Relocation  █████████░ 100%  FLAGGED   │
│      CityUtil Services • Pre-flagged contractor          │
│      [View flags ▾]                                      │
├──────────────────────────────────────────────────────────┤
│  ✅ T001 Block A Excavation  ██████████ 100%  COMPLETE  │
│      Ram Construction Ltd • 3 weeks late • Priya ✓      │
├──────────────────────────────────────────────────────────┤
│  ✅ T004 Road Laying Block A ██████████ 100%  COMPLETE  │
│      Ram Construction Ltd • Quality issue caught ✓       │
│  ...                                                     │
├──────────────────────────────────────────────────────────┤
│  COUNCIL CONDITIONS COMPLIANCE:                          │
│  ✗ Business compensation fund    ✗ Open tendering       │
│  ✗ Independent auditor           ✗ Cycling infrastructure│
│  ✗ Monsoon buffer                                        │
│                                                          │
│  5/5 conditions UNMET at project completion              │
└─────────────────────────────────────────────────────────┘
```

### Colour coding
```
Task status colours:
  pending:  bg-slate-800, text-slate-400, border-slate-700
  active:   bg-blue-950/30, text-blue-300, border-blue-700
  delayed:  bg-amber-950/30, text-amber-300, border-amber-700
  flagged:  bg-red-950/30, text-red-300, border-red-700, pulsing red dot
  complete: bg-emerald-950/30, text-emerald-300, border-emerald-700

Progress bar:
  0-69%:   bg-blue-500
  70-89%:  bg-amber-500
  90-99%:  bg-emerald-500
  100%:    bg-emerald-700 (solid, no animation)
```

---

## TASK 5 — Task Row Component (`src/components/ledger/TaskRow.tsx`)

Each row shows:
- Status indicator (icon + colour)
- Task title and block
- Contractor name + trust score dots (e.g. ●●●○○ for score 6/10)
- Progress bar (animated on update)
- Workers assigned (avatars/initials)
- Delay indicator ("+6 weeks" in amber/red)
- Flag count badge
- Expand arrow → shows full flags list

---

## TASK 6 — Worker Assignment Panel (`src/components/ledger/WorkerAssignment.tsx`)

### What to build
The "Find Workers" feature — demonstrates matching citizens to tasks by skill.

### UI
```
WORKER ASSIGNMENT ENGINE
Task: T001 — Excavation Block A

Required skills: civil engineering, site management, quality control

Searching citizen population... [matching animation]

MATCHED:
⭐ Priya Mehra (C003)       👷 Civil Engineer
   Skills: ✓ civil engineering  ✓ quality control  ✓ site management
   Status: Unemployed (4 months) — IDEAL MATCH
   [Assign →]

Rajesh Tamboli (C024)      🔧 Construction Supervisor (retired)
   Skills: ✓ site management
   Status: Retired — Available
   [Assign →]
```

### Matching logic
```typescript
function findMatchingWorkers(task: LedgerTask, citizens: Citizen[]): ScoredCitizen[] {
  const requiredSkills = getRequiredSkillsForPhase(task.phase)
  
  return citizens
    .filter(c => !c.isWorker)           // Not already assigned
    .map(c => {
      const matchingSkills = c.skills.filter(s =>
        requiredSkills.some(req => s.toLowerCase().includes(req.toLowerCase()))
      )
      const score = matchingSkills.length / requiredSkills.length
      const unemploymentBonus = c.monthlyIncome === 0 ? 0.3 : 0
      return { citizen: c, score: score + unemploymentBonus, matchingSkills }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
}
```

---

## ACCEPTANCE CRITERIA — Ledger Agent Complete When:

- [ ] demo_ledger.json contains all 8 tasks with full contractor history and flags
- [ ] All 8 contractors have complete profiles with past project data
- [ ] Council conditions compliance section shows 0/5 met
- [ ] ledgerStore initialises from JSON and responds to tick updates
- [ ] AccountabilityLedger renders all 8 tasks with correct colours and status
- [ ] Task rows expand to show flags
- [ ] Flagged tasks (T002, T007) show pulsing red indicators
- [ ] Progress bars animate correctly as ticks advance
- [ ] Worker assignment panel shows Priya as the top match for T001
- [ ] Summary bar shows correct totals (₹56.4cr, +17.6%, 5 open flags)
- [ ] Zero TypeScript errors
