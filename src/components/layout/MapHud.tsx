import { useWorldStore } from '@/store/worldStore'
import { useCitizenStore } from '@/store/citizenStore'

function phaseFor(month: number): { name: string; sub: string } {
  if (month <= 0) return { name: 'PRE-CONSTRUCTION', sub: 'Baseline survey' }
  if (month <= 3) return { name: 'ARNIKO CORE', sub: 'Excavation — Block A' }
  if (month <= 6) return { name: 'ARNIKO CORE', sub: 'Excavation — Block B' }
  if (month <= 8) return { name: 'CARRIAGEWAY', sub: 'Road laying' }
  if (month <= 11) return { name: 'CARRIAGEWAY', sub: 'Paving — final stretch' }
  return { name: 'COMMISSIONING', sub: 'Road complete' }
}

export default function MapHud() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const constructionProgress = useWorldStore((s) => s.constructionProgress)
  const citizens = useCitizenStore((s) => s.citizens)

  const phase = phaseFor(currentMonth)
  const total = citizens.length || 1
  const green = citizens.filter((c) => c.statusColor === 'green').length
  const amber = citizens.filter((c) => c.statusColor === 'amber').length
  const red = citizens.filter((c) => c.statusColor === 'red').length

  const pct = (n: number) => Math.round((n / total) * 100)

  return (
    <div className="absolute left-3 top-3 z-20 space-y-3 pointer-events-none">
      {/* Current phase */}
      <div className="glass-panel p-3 rounded w-48 shadow-lg" style={{ borderColor: 'rgba(94,94,94,0.3)' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] uppercase tracking-[0.12em]" style={{ color: '#5e5e5e' }}>Current Phase</span>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#76b900' }} />
        </div>
        <span className="block leading-none font-bold text-[18px]" style={{ color: '#76b900', fontFamily: 'Inter, sans-serif' }}>
          {phase.name}
        </span>
        <span className="block mt-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: '#5e5e5e' }}>
          {phase.sub} · {constructionProgress}%
        </span>
      </div>

      {/* Citizen wellbeing allocation */}
      <div className="glass-panel p-3 rounded w-48 shadow-lg" style={{ borderColor: 'rgba(94,94,94,0.3)' }}>
        <span className="block mb-2 text-[9px] uppercase tracking-[0.12em]" style={{ color: '#5e5e5e' }}>
          Citizen Wellbeing
        </span>
        <div className="space-y-2">
          <Bar color="#76b900" pct={pct(green)} label={`Thriving ${pct(green)}%`} />
          <Bar color="#76b900" pct={pct(amber)} label={`Stressed ${pct(amber)}%`} />
          <Bar color="#ef4444" pct={pct(red)} label={`Crisis ${pct(red)}%`} />
        </div>
      </div>
    </div>
  )
}

function Bar({ color, pct, label }: { color: string; pct: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[8px] uppercase tracking-wide" style={{ color: '#5e5e5e' }}>{label}</span>
      </div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(26,26,26,0.6)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
