import { useCouncilStore } from '@/store/councilStore'

export default function SeverityReport() {
  const { isComplete, overallRiskScore, topRisks, consensusRecommendations, members } =
    useCouncilStore()

  if (!isComplete || members.length === 0) return null

  const scoreColor =
    overallRiskScore >= 8
      ? 'text-red-400'
      : overallRiskScore >= 6
      ? 'text-amber-400'
      : 'text-emerald-400'

  const barColor =
    overallRiskScore >= 8
      ? 'bg-red-500'
      : overallRiskScore >= 6
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  return (
    <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-slate-300 font-semibold text-sm">Council Synthesis</div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Overall Risk</span>
          <span className={`text-2xl font-bold ${scoreColor}`}>
            {overallRiskScore}
            <span className="text-sm text-slate-500">/10</span>
          </span>
        </div>
      </div>

      {/* Overall risk bar */}
      <div className="mb-4">
        <div className="bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${overallRiskScore * 10}%` }}
          />
        </div>
      </div>

      {/* Top risks */}
      {topRisks.length > 0 && (
        <div className="mb-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">Top Risks</div>
          <div className="space-y-1.5">
            {topRisks.map((risk, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-300">
                <span className="text-red-400 flex-shrink-0 font-bold">{i + 1}.</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {consensusRecommendations.length > 0 && (
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
            Recommendations
          </div>
          <div className="space-y-1.5">
            {consensusRecommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-300">
                <span className="text-emerald-400 flex-shrink-0">✓</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
