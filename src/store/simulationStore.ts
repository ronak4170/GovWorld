import { create } from 'zustand'
import type { SimulationTick, SimulationEvent } from '@/types/simulation'
import type { EdgeCase, CitizenMemory, DirectorSimulation } from '@/lib/simulationDirector'

interface SimulationState {
  ticks: SimulationTick[]
  currentTick: number
  isLoaded: boolean
  allEvents: SimulationEvent[]

  // Generative agent simulation fields
  edgeCases: EdgeCase[]
  citizenMemories: Record<string, CitizenMemory>
  isLiveMode: boolean
  isGenerating: boolean
  directorSummary: string
  systemicRisks: string[]
  riskTrajectory: number[]
  runId: string

  loadTicks: (ticks: SimulationTick[]) => void
  loadDirectorSimulation: (sim: DirectorSimulation) => void
  setCurrentTick: (tick: number) => void
  getCurrentTick: () => SimulationTick | undefined
  getEventsUpToTick: (tick: number) => SimulationEvent[]
  getEdgeCasesUpToTick: (tick: number) => EdgeCase[]
  setIsGenerating: (v: boolean) => void
  setLiveMode: (v: boolean) => void
  reset: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ticks: [],
  currentTick: 0,
  isLoaded: false,
  allEvents: [],

  edgeCases: [],
  citizenMemories: {},
  isLiveMode: false,
  isGenerating: false,
  directorSummary: '',
  systemicRisks: [],
  riskTrajectory: [],
  runId: '',

  loadTicks: (ticks) =>
    set({
      ticks,
      isLoaded: true,
      allEvents: ticks.flatMap((t) => t.events),
    }),

  loadDirectorSimulation: (sim) =>
    set({
      ticks: sim.ticks,
      isLoaded: true,
      allEvents: sim.ticks.flatMap((t) => t.events),
      edgeCases: sim.edgeCases,
      citizenMemories: sim.citizenMemories,
      directorSummary: sim.directorSummary,
      systemicRisks: sim.systemicRisks,
      riskTrajectory: sim.riskTrajectory,
      runId: sim.runId,
      isLiveMode: true,
      isGenerating: false,
      currentTick: 0,
    }),

  setCurrentTick: (tick) => set({ currentTick: tick }),

  getCurrentTick: () => {
    const { ticks, currentTick } = get()
    return ticks.find((t) => t.month === currentTick)
  },

  getEventsUpToTick: (tick) => get().allEvents.filter((e) => e.tick <= tick),

  getEdgeCasesUpToTick: (tick) => get().edgeCases.filter((ec) => ec.month <= tick),

  setIsGenerating: (v) => set({ isGenerating: v }),

  setLiveMode: (v) => set({ isLiveMode: v }),

  reset: () =>
    set({
      ticks: [],
      currentTick: 0,
      isLoaded: false,
      allEvents: [],
      edgeCases: [],
      citizenMemories: {},
      isLiveMode: false,
      isGenerating: false,
      directorSummary: '',
      systemicRisks: [],
      riskTrajectory: [],
      runId: '',
    }),
}))
