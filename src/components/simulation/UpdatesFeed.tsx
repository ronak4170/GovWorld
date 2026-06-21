import { useSimulationStore } from '@/store/simulationStore'
import { useWorldStore } from '@/store/worldStore'
import type { SimulationEvent } from '@/types/simulation'

// Badge config keyed by event type
const TYPE_BADGES: Record<SimulationEvent['type'], { label: string; color: string; bg: string }> = {
  construction: { label: 'BUILD',   color: '#93c5fd', bg: 'rgba(30,58,138,0.4)' },
  displacement:  { label: 'ALERT',  color: '#fdba74', bg: 'rgba(124,45,18,0.4)' },
  employment:    { label: 'EMPLOY', color: '#86efac', bg: 'rgba(20,83,45,0.4)' },
  closure:       { label: 'CLOSE',  color: '#fca5a5', bg: 'rgba(127,29,29,0.4)' },
  completion:    { label: 'DONE',   color: '#6ee7b7', bg: 'rgba(6,78,59,0.4)' },
  flag:          { label: 'FLAG',   color: '#fca5a5', bg: 'rgba(127,29,29,0.6)' },
}

// Border color by severity
const SEVERITY_BORDER: Record<SimulationEvent['severity'], string> = {
  info:     '#1e2535',
  warning:  'rgba(245,158,11,0.35)',
  critical: 'rgba(239,68,68,0.45)',
}

const POLICY_SUMMARY = `Van Ness Avenue Complete Streets — Phase 1 (2.3km)
Budget $45M · 18 months · San Francisco
BRT lanes, protected cycle tracks, ADA crossings, street trees, 6 upgraded bus shelters.`

export default function UpdatesFeed() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const getEventsUpToTick = useSimulationStore((s) => s.getEventsUpToTick)

  const events = getEventsUpToTick(currentMonth).slice().reverse()

  // Empty / pre-sim state
  if (currentMonth === 0 || events.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Ready state */}
        <div className="flex flex-col items-center justify-center py-10 px-5 gap-4">
          {/* Pulsing circle */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: '#f97316' }}
            />
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-bold tracking-wide" style={{ color: '#f0f2f8' }}>
              Simulation Ready
            </div>
            <div className="text-xs mt-1" style={{ color: '#8b95a8' }}>
              Press ▶ to start — events will appear here in real time
            </div>
          </div>
        </div>

        {/* Policy brief card */}
        <div className="mx-3 mb-4">
          <div
            className="rounded-xl p-4 border"
            style={{ backgroundColor: '#161921', borderColor: '#1e2535' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ color: '#f97316', backgroundColor: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}
              >
                Active Policy
              </div>
            </div>
            <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#8b95a8' }}>
              {POLICY_SUMMARY}
            </div>
            <div className="mt-3 pt-3 border-t flex items-center gap-4" style={{ borderColor: '#1e2535' }}>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#3d4b61' }}>Corridor</div>
                <div className="text-xs font-semibold" style={{ color: '#f0f2f8' }}>Van Ness Ave, SF</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#3d4b61' }}>Budget</div>
                <div className="text-xs font-semibold" style={{ color: '#60a5fa' }}>$45,000,000</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#3d4b61' }}>Duration</div>
                <div className="text-xs font-semibold" style={{ color: '#f0f2f8' }}>18 months</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      {events.map((event) => {
        const badge = TYPE_BADGES[event.type]
        const borderColor = SEVERITY_BORDER[event.severity]
        const isFlag = event.type === 'flag'

        return (
          <div
            key={event.id}
            className="rounded-xl p-3 border transition-all duration-200"
            style={{ backgroundColor: '#161921', borderColor }}
          >
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1.5">
              {/* Type badge */}
              <span
                className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.label}
              </span>

              {/* Flag blink dot */}
              {isFlag && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}

              {/* Month stamp */}
              <span
                className="text-[10px] font-mono ml-auto"
                style={{ color: '#3d4b61' }}
              >
                M{event.tick}
              </span>
            </div>

            {/* Title */}
            <div className="text-xs font-semibold mb-1" style={{ color: '#f0f2f8' }}>
              {event.title}
            </div>

            {/* Description */}
            <p className="text-xs leading-relaxed" style={{ color: '#8b95a8' }}>
              {event.description}
            </p>

            {/* Affected citizens */}
            {event.affectedCitizenIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px]" style={{ color: '#3d4b61' }}>Affected:</span>
                {event.affectedCitizenIds.slice(0, 4).map((id) => (
                  <span
                    key={id}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ color: '#8b95a8', backgroundColor: '#1c2230', border: '1px solid #1e2535' }}
                  >
                    {id}
                  </span>
                ))}
                {event.affectedCitizenIds.length > 4 && (
                  <span className="text-[10px]" style={{ color: '#3d4b61' }}>
                    +{event.affectedCitizenIds.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
