import { useSimulationStore } from '@/store/simulationStore'
import { useWorldStore } from '@/store/worldStore'
import type { EdgeCase, EdgeCaseCategory } from '@/lib/simulationDirector'

const CATEGORY_META: Record<EdgeCaseCategory, { icon: string; label: string; color: string; bg: string; border: string }> = {
  corruption:    { icon: '🔴', label: 'Corruption',    color: 'text-red-400',     bg: 'bg-red-900/20',     border: 'border-red-800/40' },
  technical:     { icon: '⚠️', label: 'Technical',     color: 'text-orange-400',  bg: 'bg-orange-900/20',  border: 'border-orange-800/40' },
  social:        { icon: '👥', label: 'Social',        color: 'text-purple-400',  bg: 'bg-purple-900/20',  border: 'border-purple-800/40' },
  economic:      { icon: '💰', label: 'Economic',      color: 'text-amber-400',   bg: 'bg-amber-900/20',   border: 'border-amber-800/40' },
  environmental: { icon: '🌿', label: 'Environmental', color: 'text-teal-400',    bg: 'bg-teal-900/20',    border: 'border-teal-800/40' },
  safety:        { icon: '🚑', label: 'Safety',        color: 'text-red-300',     bg: 'bg-red-900/30',     border: 'border-red-700/50' },
  political:     { icon: '🏛️', label: 'Political',     color: 'text-blue-400',    bg: 'bg-blue-900/20',    border: 'border-blue-800/40' },
  adaptive:      { icon: '🌱', label: 'Adaptive',      color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800/40' },
  legal:         { icon: '⚖️', label: 'Legal',         color: 'text-violet-400',  bg: 'bg-violet-900/20',  border: 'border-violet-800/40' },
  systemic:      { icon: '🔗', label: 'Systemic',      color: 'text-rose-400',    bg: 'bg-rose-900/20',    border: 'border-rose-800/40' },
}

function EdgeCaseCard({ ec, allEdgeCases }: { ec: EdgeCase; allEdgeCases: EdgeCase[] }) {
  const meta = CATEGORY_META[ec.category]
  const cascadeTargets = ec.cascadesTo
    ?.map((id) => allEdgeCases.find((e) => e.id === id))
    .filter(Boolean) as EdgeCase[] | undefined

  return (
    <div className={`rounded-xl p-4 border ${meta.bg} ${meta.border} flex flex-col gap-2.5 transition-all duration-300`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{meta.icon}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.color} ${meta.bg} ${meta.border}`}>
            {meta.label}
          </span>
          <span className="text-slate-500 text-[10px] font-mono">Month {ec.month}</span>
          {/* Severity pill */}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            ec.severity === 'critical' ? 'bg-red-900/40 text-red-300' :
            ec.severity === 'warning'  ? 'bg-amber-900/40 text-amber-300' :
                                         'bg-blue-900/40 text-blue-300'
          }`}>
            {ec.severity.toUpperCase()}
          </span>
        </div>

        {/* Resolved badge */}
        <div className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          ec.isResolved
            ? 'bg-emerald-900/40 text-emerald-300'
            : 'bg-slate-800 text-slate-400'
        }`}>
          {ec.isResolved ? '✓ Resolved' : '● Active'}
        </div>
      </div>

      {/* Title */}
      <div className={`text-sm font-semibold ${meta.color}`}>{ec.title}</div>

      {/* Description */}
      <p className="text-slate-400 text-xs leading-relaxed">{ec.description}</p>

      {/* Resolution */}
      {ec.isResolved && ec.resolution && (
        <div className="text-xs text-emerald-400/80 bg-emerald-900/10 border border-emerald-900/30 rounded px-2.5 py-1.5">
          <span className="font-semibold">Resolution: </span>{ec.resolution}
        </div>
      )}

      {/* Cascade chain */}
      {cascadeTargets && cascadeTargets.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-700/40">
          <span className="text-slate-600 text-[10px]">Cascades to →</span>
          {cascadeTargets.map((target) => {
            const targetMeta = CATEGORY_META[target.category]
            return (
              <span key={target.id} className={`text-[10px] font-medium px-2 py-0.5 rounded border ${targetMeta.color} ${targetMeta.bg} ${targetMeta.border}`}>
                {targetMeta.icon} {target.title}
              </span>
            )
          })}
        </div>
      )}

      {/* Affected citizens */}
      {ec.affectedCitizenIds.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-slate-600 text-[10px]">Affected:</span>
          {ec.affectedCitizenIds.map((id) => (
            <span key={id} className="text-[10px] font-mono text-slate-500 bg-slate-800 border border-slate-700 rounded px-1 py-0.5">
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EdgeCaseFeed() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const { getEdgeCasesUpToTick, edgeCases, isLiveMode, directorSummary, systemicRisks, riskTrajectory, isGenerating } =
    useSimulationStore()

  const visibleCases = getEdgeCasesUpToTick(currentMonth)

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <p className="text-slate-400 text-sm font-medium">Generative Director is simulating…</p>
        <p className="text-slate-600 text-xs leading-relaxed max-w-[260px]">
          Analysing policy risks, building citizen memory streams, and discovering edge cases for this unique run.
        </p>
      </div>
    )
  }

  if (edgeCases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
        <div className="text-4xl select-none">🔮</div>
        <p className="text-slate-400 text-sm font-medium">No edge cases discovered yet</p>
        <p className="text-slate-600 text-xs leading-relaxed max-w-[260px]">
          Click <span className="text-blue-400 font-semibold">✨ Live Sim</span> in the top bar to run a generative simulation — each run surfaces different edge cases the government must prepare for.
        </p>
        <p className="text-slate-700 text-[10px] mt-2 max-w-[220px]">
          Powered by Stanford HAI Generative Agents architecture (Park et al., 2023)
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Director summary */}
      {isLiveMode && directorSummary && (
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Simulation Director</span>
            <span className="text-[10px] text-blue-500 font-mono bg-blue-900/30 px-1.5 py-0.5 rounded">LIVE RUN</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{directorSummary}</p>
        </div>
      )}

      {/* Risk trajectory bar chart */}
      {riskTrajectory.length === 12 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Risk Trajectory (0–100)</div>
          <div className="flex items-end gap-0.5 h-12">
            {riskTrajectory.map((score, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-sm transition-all duration-300 ${
                    score >= 70 ? 'bg-red-500' : score >= 45 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ height: `${Math.max(4, (score / 100) * 44)}px` }}
                />
                <span className="text-[8px] text-slate-600">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Systemic risks */}
      {systemicRisks.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Systemic Risks Identified</div>
          <div className="flex flex-col gap-1.5">
            {systemicRisks.map((risk, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-400">
                <span className="text-red-500 flex-shrink-0 mt-0.5">▸</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edge case count header */}
      <div className="flex items-center justify-between">
        <div className="text-slate-300 text-xs font-semibold">
          {visibleCases.length} Edge Case{visibleCases.length !== 1 ? 's' : ''} Discovered
        </div>
        <div className="text-slate-600 text-[10px]">
          {edgeCases.length - visibleCases.length > 0 && `${edgeCases.length - visibleCases.length} emerging…`}
        </div>
      </div>

      {/* Edge case cards */}
      {visibleCases.length > 0 ? (
        <div className="flex flex-col gap-3">
          {visibleCases.map((ec) => (
            <EdgeCaseCard key={ec.id} ec={ec} allEdgeCases={edgeCases} />
          ))}
        </div>
      ) : (
        <div className="text-center text-slate-600 text-xs py-6">
          Edge cases will appear as the simulation advances
        </div>
      )}
    </div>
  )
}
