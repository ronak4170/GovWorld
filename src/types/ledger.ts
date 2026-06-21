// Ledger types — owned by Ledger Agent
// Represents the accountability ledger tracking all construction tasks, contractors, and workers

export type TaskStatus = 'pending' | 'active' | 'delayed' | 'flagged' | 'complete'

export interface LedgerTask {
  id: string
  title: string                 // e.g. "Road excavation — Block A"
  contractor: string            // Company name
  contractorHistory: string     // e.g. "2 of 3 previous projects delayed"
  assignedWorkers: string[]     // Citizen IDs
  projectedStartDate: string    // ISO date
  projectedEndDate: string      // ISO date
  actualStartDate?: string      // ISO date — set when task begins
  actualEndDate?: string        // ISO date — set when task completes
  progressPercent: number       // 0-100
  status: TaskStatus
  delayDays: number             // 0 if on track
  flagReason?: string           // Why flagged (if status === 'flagged')
  weatherImpactDays: number     // Days lost to weather events
  budget: number                // In USD
  spentToDate: number           // In USD
}

export interface WorkerAssignment {
  citizenId: string
  taskId: string
  role: string                  // e.g. "Road Inspector", "Excavation Worker"
  assignedAtTick: number        // Which month the worker was assigned
  completedAtTick?: number      // Which month the worker's task completed
}

export interface ContractorRecord {
  name: string
  history: string               // Human-readable history summary
  completedProjects: number
  delayedProjects: number
  averageDelayWeeks: number
  flagged: boolean              // Pre-flagged based on history
}

export interface LedgerState {
  tasks: LedgerTask[]
  workerAssignments: WorkerAssignment[]
  contractors: ContractorRecord[]
  flaggedTaskIds: string[]      // Tasks currently flagged red
}
