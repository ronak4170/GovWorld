import { create } from 'zustand'
import type { Citizen, CitizenUpdate } from '@/types/citizen'

// Featured citizen IDs for the demo scenario (C001–C006)
const FEATURED_CITIZEN_IDS = ['C001', 'C002', 'C003', 'C004', 'C005', 'C006'] as const

interface CitizenState {
  citizens: Citizen[]
  selectedCitizenId: string | null
  isLoaded: boolean

  // Actions
  loadCitizens: (citizens: Citizen[]) => void
  selectCitizen: (id: string | null) => void
  updateCitizenStatus: (update: CitizenUpdate) => void
  applyTickUpdates: (updates: CitizenUpdate[]) => void
  getCitizenById: (id: string) => Citizen | undefined
  getFeaturedCitizens: () => Citizen[]
  getWorkers: () => Citizen[]
  reset: () => void
}

export const useCitizenStore = create<CitizenState>((set, get) => ({
  citizens: [],
  selectedCitizenId: null,
  isLoaded: false,

  loadCitizens: (citizens) => set({ citizens, isLoaded: true }),

  selectCitizen: (id) => set({ selectedCitizenId: id }),

  updateCitizenStatus: (update) =>
    set((s) => ({
      citizens: s.citizens.map((c) =>
        c.id === update.citizenId
          ? {
              ...c,
              statusColor: update.newStatus,
              currentPolicyImpact: update.newPolicyImpact,
              statusHistory: [
                ...c.statusHistory,
                {
                  tick: update.tick,
                  status: update.newStatus,
                  narrative: update.narrative,
                  ...(update.routeChange ? { routeChange: update.routeChange } : {}),
                },
              ],
              ...(update.routeChange ? { dailyRoute: update.routeChange } : {}),
            }
          : c
      ),
    })),

  applyTickUpdates: (updates) => {
    updates.forEach((u) => get().updateCitizenStatus(u))
  },

  getCitizenById: (id) => get().citizens.find((c) => c.id === id),

  getFeaturedCitizens: () =>
    get().citizens.filter((c) => (FEATURED_CITIZEN_IDS as readonly string[]).includes(c.id)),

  getWorkers: () => get().citizens.filter((c) => c.isWorker),

  reset: () => set({ citizens: [], selectedCitizenId: null, isLoaded: false }),
}))
