import { useEffect, useState } from 'react'
import { useCouncilStore } from '@/store/councilStore'

interface Props {
  visible: boolean
  onDismiss: () => void
}

export default function SeverityReveal({ visible, onDismiss }: Props) {
  const { members, overallRiskScore, topRisks, consensusRecommendations } = useCouncilStore()
  const [show, setShow] = useState(false)
  const [scoreDisplay, setScoreDisplay] = useState(0)

  useEffect(() => {
    if (!visible) {
      setShow(false)
      setScoreDisplay(0)
      return
    }
    const t = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (!show) return
    const target = overallRiskScore || 7
    let frame: number
    const start = performance.now()
    const duration = 1200

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setScoreDisplay(Math.round(target * p * 10) / 10)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [show, overallRiskScore])

  if (!visible || !show) return null

  const riskColor =
    scoreDisplay >= 8 ? 'text-red-400' : scoreDisplay >= 6 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="max-w-lg w-full mx-4 rounded-2xl border border-slate-700 p-6 space-y-5"
        style={{
          background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(0,0,0,0.98) 100%)',
          boxShadow: '0 0 60px rgba(3,105,161,0.2)',
        }}
      >
        <div className="text-center">
          <p
            className="text-slate-500 text-xs uppercase tracking-widest mb-2"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            Council Verdict
          </p>
          <p className={`text-6xl font-bold tabular-nums ${riskColor}`} style={{ fontFamily: 'Lexend, sans-serif' }}>
            {scoreDisplay}
            <span className="text-2xl text-slate-500">/10</span>
          </p>
          <p className="text-slate-400 text-sm mt-1">Overall Risk Score</p>
        </div>

        {topRisks.length > 0 && (
          <div>
            <p className="text-red-400 text-xs uppercase tracking-wider mb-2">Top Risks</p>
            <ul className="space-y-1.5">
              {topRisks.slice(0, 3).map((r, i) => (
                <li key={i} className="text-slate-300 text-xs flex gap-2">
                  <span className="text-red-500 flex-shrink-0">▸</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {consensusRecommendations.length > 0 && (
          <div>
            <p className="text-emerald-400 text-xs uppercase tracking-wider mb-2">Recommendations</p>
            <ul className="space-y-1.5">
              {consensusRecommendations.slice(0, 3).map((r, i) => (
                <li key={i} className="text-slate-300 text-xs flex gap-2">
                  <span className="text-emerald-500 flex-shrink-0">▸</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 pt-2">
          {members.slice(0, 5).map((m) => (
            <div key={m.id} className="text-center">
              <p className={`text-lg font-bold tabular-nums ${m.color}`}>{m.severityScore || '—'}</p>
              <p className="text-slate-600 text-[9px] truncate">{m.name.split(' ')[0]}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer"
          style={{ fontFamily: 'Lexend, sans-serif' }}
        >
          Close Arena
        </button>
      </div>
    </div>
  )
}
