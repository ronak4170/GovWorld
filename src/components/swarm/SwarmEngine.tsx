import { useEffect, useState } from 'react'
import FullScreenOverlay from '@/components/layout/FullScreenOverlay'
import { useSwarmStore } from '@/store/swarmStore'
import { useCouncilStore } from '@/store/councilStore'
import type { PipelinePhase } from '@/types/swarm'
import KnowledgeGraphView from './KnowledgeGraphView'
import SwarmFeed from './SwarmFeed'
import PredictionReportView from './PredictionReportView'

type Tab = 'ontology' | 'graph' | 'feed' | 'report'

const STEPS: { phase: PipelinePhase; label: string; icon: string }[] = [
  { phase: 'seed', label: 'Seed extraction', icon: '🌱' },
  { phase: 'ontology', label: 'Ontology design', icon: '🧬' },
  { phase: 'graph', label: 'Knowledge graph', icon: '🕸️' },
  { phase: 'personas', label: 'Agent personas', icon: '🧑‍🤝‍🧑' },
  { phase: 'simulation', label: 'Social simulation', icon: '💬' },
  { phase: 'report', label: 'Prediction report', icon: '📑' },
]

const PHASE_ORDER: PipelinePhase[] = ['idle', 'seed', 'ontology', 'graph', 'personas', 'simulation', 'report', 'complete']

export default function SwarmEngine() {
  const isOpen = useSwarmStore((s) => s.isOpen)
  const setOpen = useSwarmStore((s) => s.setOpen)
  const phase = useSwarmStore((s) => s.phase)
  const phaseMessage = useSwarmStore((s) => s.phaseMessage)
  const isRunning = useSwarmStore((s) => s.isRunning)
  const seedText = useSwarmStore((s) => s.seedText)
  const setSeedText = useSwarmStore((s) => s.setSeedText)
  const runPipeline = useSwarmStore((s) => s.runPipeline)
  const ontology = useSwarmStore((s) => s.ontology)
  const graph = useSwarmStore((s) => s.graph)
  const report = useSwarmStore((s) => s.report)
  const rounds = useSwarmStore((s) => s.rounds)
  const activeRound = useSwarmStore((s) => s.activeRound)
  const injectVariable = useSwarmStore((s) => s.injectVariable)
  const liveMode = useSwarmStore((s) => s.liveMode)
  const setLiveMode = useSwarmStore((s) => s.setLiveMode)
  const policyText = useCouncilStore((s) => s.policyText)

  const [tab, setTab] = useState<Tab>('graph')
  const [injectText, setInjectText] = useState('')

  // Seed the policy text in once when opened
  useEffect(() => {
    if (isOpen && !seedText && policyText) setSeedText(policyText)
  }, [isOpen, seedText, policyText, setSeedText])

  // Auto-advance the visible tab as the pipeline progresses
  useEffect(() => {
    if (phase === 'graph' || phase === 'personas') setTab('graph')
    else if (phase === 'simulation') setTab('feed')
    else if (phase === 'report' || phase === 'complete') setTab('report')
  }, [phase])

  if (!isOpen) return null

  const currentIdx = PHASE_ORDER.indexOf(phase)
  const stepState = (p: PipelinePhase): 'done' | 'active' | 'todo' => {
    const idx = PHASE_ORDER.indexOf(p)
    if (phase === 'complete') return 'done'
    if (idx < currentIdx) return 'done'
    if (idx === currentIdx) return 'active'
    return 'todo'
  }

  const handleInject = () => {
    if (!injectText.trim()) return
    injectVariable(activeRound, injectText.trim())
    setInjectText('')
  }

  return (
    <FullScreenOverlay open={isOpen}>
      <div className="flex h-full flex-col bg-slate-950 text-slate-200">
        {/* header */}
        <header className="flex items-center gap-3 border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐟</span>
            <div>
              <div className="text-lg font-bold text-slate-100">Swarm Engine</div>
              <div className="text-[11px] text-slate-500">Seed → Ontology → Graph → Agents → Simulation → Prediction</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {phaseMessage && (
              <span className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
                {isRunning && <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />}
                {phaseMessage}
              </span>
            )}
            {/* Live LLM toggle */}
            <button
              onClick={() => setLiveMode(!liveMode)}
              disabled={isRunning}
              title={liveMode ? 'Live mode: agents & report written by the LLM' : 'Offline mode: instant deterministic synthesis'}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                liveMode
                  ? 'border-cyan-600 bg-cyan-900/30 text-cyan-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${liveMode ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
              {liveMode ? 'Live LLM' : 'Offline'}
            </button>
            <button
              onClick={() => runPipeline()}
              disabled={isRunning}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isRunning ? 'Running…' : phase === 'complete' ? 'Re-run' : 'Run simulation'}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200" title="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* left rail */}
          <aside className="flex w-72 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
            {/* seed input */}
            <div className="border-b border-slate-800 p-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Policy seed</label>
              <textarea
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                rows={4}
                placeholder="Paste a policy, news item or scenario…"
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* pipeline steps */}
            <div className="space-y-1 p-3">
              {STEPS.map((s) => {
                const st = stepState(s.phase)
                return (
                  <div
                    key={s.phase}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                      st === 'active' ? 'bg-blue-900/30 text-blue-200' : st === 'done' ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="flex-1">{s.label}</span>
                    {st === 'done' && <span className="text-emerald-400">✓</span>}
                    {st === 'active' && <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />}
                  </div>
                )
              })}
            </div>

            {/* God's-eye injection */}
            <div className="mt-auto border-t border-slate-800 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                <span>⚡</span> God&apos;s-eye view
              </div>
              <p className="mb-2 text-[11px] text-slate-500">Inject a variable into the active round and re-deduce the future.</p>
              <input
                value={injectText}
                onChange={(e) => setInjectText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInject()}
                placeholder="e.g. Budget cut 20% / storm season extended"
                disabled={rounds.length === 0}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={handleInject}
                disabled={rounds.length === 0 || !injectText.trim()}
                className="mt-2 w-full rounded-lg bg-amber-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
              >
                Inject & re-deduce
              </button>
            </div>
          </aside>

          {/* main area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* tabs */}
            <nav className="flex gap-1 border-b border-slate-800 px-3">
              {([
                ['ontology', 'Ontology'],
                ['graph', 'Knowledge Graph'],
                ['feed', 'Social Feed'],
                ['report', 'Prediction Report'],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    tab === id ? 'border-blue-500 text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1">
              {tab === 'ontology' && (
                <OntologyView />
              )}
              {tab === 'graph' &&
                (graph ? <KnowledgeGraphView graph={graph} /> : <Empty label="Run the simulation to build the knowledge graph." />)}
              {tab === 'feed' && (rounds.length ? <SwarmFeed /> : <Empty label="Run the simulation to populate the social feed." />)}
              {tab === 'report' && (report ? <PredictionReportView report={report} /> : <Empty label="The report agent runs after the simulation." />)}
            </div>
          </main>
        </div>
      </div>
    </FullScreenOverlay>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">{label}</div>
}

function OntologyView() {
  const ontology = useSwarmStore((s) => s.ontology)
  if (!ontology) return <Empty label="Run the simulation to design the ontology." />
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl">
        <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-300">{ontology.analysisSummary}</p>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Entity types ({ontology.entityTypes.length})
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          {ontology.entityTypes.map((e) => (
            <div key={e.name} className={`rounded-lg border p-2.5 ${e.isFallback ? 'border-slate-700 bg-slate-900/40' : 'border-slate-800 bg-slate-900/60'}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-100">{e.name}</span>
                {e.isFallback && <span className="rounded bg-slate-800 px-1 text-[9px] uppercase text-slate-500">fallback</span>}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{e.description}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Relationship types ({ontology.edgeTypes.length})
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {ontology.edgeTypes.map((e) => (
            <div key={e.name} className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5">
              <span className="font-mono text-xs text-emerald-300">{e.name}</span>
              <span className="ml-2 text-[11px] text-slate-500">{e.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
