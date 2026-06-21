// MiroFish-style swarm engine orchestrator.
// Drives the pipeline: Seed → Ontology → Knowledge Graph → Personas →
// Social Simulation → Prediction Report, plus God's-eye variable injection.

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type {
  Ontology,
  KnowledgeGraph,
  SwarmRound,
  PredictionReport,
  InjectedVariable,
  PipelinePhase,
  SeedChunk,
} from '@/types/swarm'
import { splitSeed } from '@/lib/seedProcessor'
import { generateOntology } from '@/lib/ontologyGenerator'
import { buildGraph } from '@/lib/graphBuilder'
import { runFullSwarm, generateLiveRound, TOTAL_SWARM_ROUNDS } from '@/lib/swarmSimulation'
import { generateReport, generateReportLive } from '@/lib/reportAgent'
import { useCitizenStore } from '@/store/citizenStore'

const IS_DEMO =
  import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_SKIP_API === 'true'

interface SwarmState {
  isOpen: boolean
  liveMode: boolean
  phase: PipelinePhase
  phaseMessage: string
  isRunning: boolean

  seedText: string
  chunks: SeedChunk[]
  ontology: Ontology | null
  graph: KnowledgeGraph | null
  rounds: SwarmRound[]
  activeRound: number
  report: PredictionReport | null
  injected: InjectedVariable[]

  setOpen: (open: boolean) => void
  setLiveMode: (live: boolean) => void
  setSeedText: (t: string) => void
  runPipeline: () => Promise<void>
  setActiveRound: (r: number) => void
  injectVariable: (round: number, description: string) => void
  reset: () => void
}

const DELAY = 650
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const useSwarmStore = create<SwarmState>((set, get) => ({
  isOpen: false,
  // Live mode defaults on when not in the zero-API demo build.
  liveMode: !IS_DEMO,
  phase: 'idle',
  phaseMessage: '',
  isRunning: false,

  seedText: '',
  chunks: [],
  ontology: null,
  graph: null,
  rounds: [],
  activeRound: 0,
  report: null,
  injected: [],

  setOpen: (open) => set({ isOpen: open }),

  setLiveMode: (live) => set({ liveMode: live }),

  setSeedText: (t) => set({ seedText: t }),

  runPipeline: async () => {
    if (get().isRunning) return
    const citizens = useCitizenStore.getState().citizens
    const seedText = get().seedText.trim()
    if (!seedText) {
      set({ phaseMessage: 'Add a policy seed first.' })
      return
    }
    set({ isRunning: true, report: null })

    // 1. Seed extraction
    set({ phase: 'seed', phaseMessage: 'Extracting & chunking the policy seed…' })
    const chunks = splitSeed(seedText)
    set({ chunks })
    await wait(DELAY)

    // 2. Ontology
    set({ phase: 'ontology', phaseMessage: 'Designing entity & relationship ontology…' })
    const ontology = await generateOntology(seedText)
    set({ ontology })
    await wait(DELAY)

    // 3. Knowledge graph
    set({ phase: 'graph', phaseMessage: 'Building knowledge graph (GraphRAG)…' })
    const graph = buildGraph(ontology, citizens)
    set({ graph })
    await wait(DELAY)

    // 4. Personas
    set({ phase: 'personas', phaseMessage: `Configuring ${graph.nodes.length} agent personas…` })
    await wait(DELAY)

    // 5. Social simulation
    const live = get().liveMode
    set({ phase: 'simulation', phaseMessage: live ? 'Agents posting live (LLM)…' : 'Running multi-agent social simulation…' })
    let rounds: SwarmRound[]
    if (live) {
      rounds = []
      for (let r = 0; r < TOTAL_SWARM_ROUNDS; r++) {
        set({ phaseMessage: `Agents posting — round ${r + 1}/${TOTAL_SWARM_ROUNDS}…` })
        const round = await generateLiveRound(r, citizens, get().injected)
        rounds = [...rounds, round]
        set({ rounds, activeRound: r })
      }
    } else {
      rounds = runFullSwarm(citizens, get().injected)
      set({ rounds, activeRound: 0 })
      await wait(DELAY)
    }

    // 6. Report
    set({ phase: 'report', phaseMessage: live ? 'Report agent writing (ReACT, streaming)…' : 'Report agent synthesising prediction…' })
    let report: PredictionReport
    if (live) {
      report = await generateReportLive(graph, rounds, (partial) => set({ report: partial }))
    } else {
      report = generateReport(graph, rounds)
      await wait(DELAY)
    }
    set({ report })

    set({ phase: 'complete', phaseMessage: 'Simulation complete.', isRunning: false })
  },

  setActiveRound: (r) => set({ activeRound: Math.max(0, Math.min(TOTAL_SWARM_ROUNDS - 1, r)) }),

  injectVariable: (round, description) => {
    const variable: InjectedVariable = { id: uuid(), round, description }
    const injected = [...get().injected, variable]
    const citizens = useCitizenStore.getState().citizens
    const graph = get().graph
    // Re-deduce the future from the injected round onward
    const rounds = runFullSwarm(citizens, injected)
    const report = graph ? generateReport(graph, rounds) : get().report
    set({ injected, rounds, report, activeRound: round, phaseMessage: `Injected: ${description}` })
  },

  reset: () =>
    set({
      phase: 'idle',
      phaseMessage: '',
      isRunning: false,
      chunks: [],
      ontology: null,
      graph: null,
      rounds: [],
      activeRound: 0,
      report: null,
      injected: [],
    }),
}))
