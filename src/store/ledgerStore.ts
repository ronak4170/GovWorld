import { create } from 'zustand'
import type { LedgerTask } from '@/types/ledger'

interface LedgerState {
  tasks: LedgerTask[]
  isLoaded: boolean
  summary: {
    totalBudget: number
    totalSpent: number
    flaggedTasks: number
    totalDelayDays: number
    contractorFlags: Array<{ contractor: string; reason: string; severity: string }>
  } | null

  loadLedger: (tasks: LedgerTask[], summary: any) => void
  getTaskById: (id: string) => LedgerTask | undefined
  getFlaggedTasks: () => LedgerTask[]
  getTasksByContractor: (contractor: string) => LedgerTask[]
  updateTask: (id: string, updates: Partial<LedgerTask>) => void
  reset: () => void
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  tasks: [],
  isLoaded: false,
  summary: null,

  loadLedger: (tasks, summary) => set({ tasks, summary, isLoaded: true }),

  getTaskById: (id) => get().tasks.find((t) => t.id === id),

  getFlaggedTasks: () => get().tasks.filter((t) => t.status === 'flagged'),

  getTasksByContractor: (contractor) =>
    get().tasks.filter((t) => t.contractor === contractor),

  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  reset: () => set({ tasks: [], isLoaded: false, summary: null }),
}))
