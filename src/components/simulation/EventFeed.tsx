import { useSimulationStore } from '@/store/simulationStore'
import { useWorldStore } from '@/store/worldStore'
import type { SimulationEvent } from '@/types/simulation'

// Style config keyed by severity
const SEVERITY_STYLES: Record<
  SimulationEvent['severity'],
  { icon: string; text: string; bg: string; border: string }
> = {
  info: {
    icon: 'ℹ',
    text: 'text-blue-300',
    bg: 'bg-blue-900/20',
    border: 'border-blue-800/40',
  },
  warning: {
    icon: '⚠',
    text: 'text-amber-300',
    bg: 'bg-amber-900/20',
    border: 'border-amber-800/40',
  },
  critical: {
    icon: '🚩',
    text: 'text-red-300',
    bg: 'bg-red-900/20',
    border: 'border-red-800/40',
  },
}

// Type label for the event badge
const TYPE_LABELS: Record<SimulationEvent['type'], string> = {
  construction: 'Construction',
  displacement: 'Displacement',
  employment: 'Employment',
  closure: 'Closure',
  completion: 'Completion',
  flag: 'Flag',
}

// Reverse-chronological live event log.
// Shows all events that have occurred up to (and including) the current month.
export default function EventFeed() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const getEventsUpToTick = useSimulationStore((s) => s.getEventsUpToTick)

  // Most-recent first
  const events = getEventsUpToTick(currentMonth).slice().reverse()

  if (currentMonth === 0 || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
        <div className="text-slate-600 text-2xl">&#9654;</div>
        <p className="text-slate-500 text-sm">
          Events will appear here as the simulation advances.
        </p>
        <p className="text-slate-600 text-xs">
          Press play or click a month to begin.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {events.map((event) => {
        const style = SEVERITY_STYLES[event.severity]
        return (
          <div
            key={event.id}
            className={`rounded-lg p-3 border ${style.bg} ${style.border} transition-all duration-200`}
          >
            <div className="flex items-start gap-2">
              {/* Severity icon */}
              <span className="flex-shrink-0 text-sm mt-0.5">{style.icon}</span>

              <div className="min-w-0 flex-1">
                {/* Header row: month + type badge + title */}
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="text-slate-500 text-[10px] font-mono">
                    M{event.tick}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${style.text} ${style.bg} border ${style.border}`}
                  >
                    {TYPE_LABELS[event.type]}
                  </span>
                  <span className={`text-xs font-semibold ${style.text}`}>
                    {event.title}
                  </span>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-xs leading-relaxed">
                  {event.description}
                </p>

                {/* Affected citizens */}
                {event.affectedCitizenIds.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {event.affectedCitizenIds.slice(0, 4).map((id) => (
                      <span
                        key={id}
                        className="text-[10px] font-mono text-slate-500 bg-slate-800 border border-slate-700 rounded px-1"
                      >
                        {id}
                      </span>
                    ))}
                    {event.affectedCitizenIds.length > 4 && (
                      <span className="text-[10px] text-slate-600">
                        +{event.affectedCitizenIds.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
