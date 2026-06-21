import { useEffect, useRef, useState } from 'react'
import { useWorldStore } from '@/store/worldStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useCitizenStore } from '@/store/citizenStore'
import { useUIStore } from '@/store/uiStore'
import { TIME_FRAMES, type TimeFrameLabel } from '@/lib/constants'

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

const KEY_EVENTS: Record<number, { label: string; icon: string }> = {
  1:  { label: 'Excavation begins', icon: 'construction' },
  3:  { label: 'Storm delay',     icon: 'thunderstorm' },
  6:  { label: 'Contractor flagged', icon: 'flag' },
  9:  { label: 'Tyler relocates',   icon: 'moving' },
  10: { label: 'Pipe burst',        icon: 'warning' },
  12: { label: 'Road complete',     icon: 'check_circle' },
}

export default function TimelineBar() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const isPlaying = useWorldStore((s) => s.isPlaying)
  const { setPlaying, setCurrentMonth, setConstructionProgress, setWeatherEvent } = useWorldStore()
  const { ticks, setCurrentTick, isLoaded } = useSimulationStore()
  const applyTickUpdates = useCitizenStore((s) => s.applyTickUpdates)
  const addToast = useUIStore((s) => s.addToast)

  const [selectedFrame, setSelectedFrame] = useState<TimeFrameLabel>('1 year')
  const notifiedFrames = useRef(new Set<string>())
  const [speed, setSpeed] = useState(1)
  const speeds = [1, 2, 5]

  useEffect(() => {
    const matchingFrame = TIME_FRAMES.find(
      (f) => f.tick === currentMonth && !notifiedFrames.current.has(f.label)
    )
    if (!matchingFrame) return
    notifiedFrames.current.add(matchingFrame.label)
    addToast(`📅 ${matchingFrame.label} milestone reached`, 'info')
  }, [currentMonth, addToast])

  const seekTo = (month: number) => {
    const tick = ticks.find((t) => t.month === month)
    if (!tick) return
    setCurrentTick(month)
    setCurrentMonth(month)
    setConstructionProgress(tick.constructionProgress)
    setWeatherEvent(tick.weatherEvent ?? null)
    applyTickUpdates(tick.citizenUpdates as any)
    setPlaying(false)
  }

  const handleFrameSelect = (frame: typeof TIME_FRAMES[number]) => {
    setSelectedFrame(frame.label)
    seekTo(frame.tick)
  }

  const togglePlay = () => setPlaying(!isPlaying)

  const cycleSpeed = () => {
    const idx = speeds.indexOf(speed)
    setSpeed(speeds[(idx + 1) % speeds.length])
  }

  // Scrubber click
  const scrubberRef = useRef<HTMLDivElement>(null)
  const handleScrubClick = (e: React.MouseEvent) => {
    const rect = scrubberRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = (e.clientX - rect.left) / rect.width
    const month = Math.max(1, Math.min(12, Math.round(pct * 12)))
    seekTo(month)
  }

  const progressPct = currentMonth > 0 ? ((currentMonth - 1) / 11) * 100 : 0

  if (!isLoaded) return null

  return (
    <footer
      className="flex-shrink-0 border-t"
      style={{
        backgroundColor: 'rgba(28,17,11,0.9)',
        borderColor: 'rgba(94,94,94,0.35)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 24px rgba(118,185,0,0.08)',
      }}
    >
      <div className="flex items-center gap-4 px-4 h-16">

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{
            backgroundColor: '#76b900',
            color: '#000000',
            boxShadow: isPlaying ? '0 0 14px rgba(118,185,0,0.5)' : 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* Speed badge */}
        <button
          onClick={cycleSpeed}
          className="flex flex-col items-start flex-shrink-0 transition-all"
          title="Click to cycle speed"
        >
          <span className="text-[8px] uppercase tracking-[0.12em]" style={{ color: '#76b900' }}>SPEED</span>
          <span className="text-[13px] font-bold leading-none" style={{ color: '#ffffff' }}>{speed}.0×</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 flex-shrink-0" style={{ backgroundColor: 'rgba(94,94,94,0.4)' }} />

        {/* Timeline scrubber */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          {/* Month labels */}
          <div className="flex justify-between px-0.5">
            {MONTH_LABELS.map((m, i) => {
              const month = i + 1
              const isCurrent = month === currentMonth
              const isPast = month < currentMonth
              const hasEvent = Boolean(KEY_EVENTS[month])
              return (
                <span
                  key={m}
                  className="text-[8px] tabular-nums font-semibold tracking-wide cursor-pointer select-none"
                  style={{
                    color: isCurrent ? '#76b900' : isPast ? '#5e5e5e' : '#333333',
                    fontWeight: isCurrent ? 700 : 400,
                  }}
                  onClick={() => seekTo(month)}
                  title={KEY_EVENTS[month]?.label}
                >
                  {hasEvent ? '◆' : m}
                </span>
              )
            })}
          </div>

          {/* Scrubber track */}
          <div
            ref={scrubberRef}
            onClick={handleScrubClick}
            className="h-2 rounded-full cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: 'rgba(94,94,94,0.4)', border: '1px solid rgba(94,94,94,0.3)' }}
          >
            {/* Filled portion */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, rgba(118,185,0,0.5) 0%, #76b900 100%)' }}
            />
            {/* Scrub handle */}
            {currentMonth > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-500"
                style={{
                  left: `calc(${progressPct}% - 8px)`,
                  backgroundColor: '#76b900',
                  borderColor: '#ffffff',
                  boxShadow: '0 0 10px rgba(118,185,0,0.6)',
                }}
              />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 flex-shrink-0" style={{ backgroundColor: 'rgba(94,94,94,0.4)' }} />

        {/* Jump-to quick links */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {TIME_FRAMES.map((frame) => {
            const isActive = selectedFrame === frame.label
            return (
              <button
                key={frame.label}
                onClick={() => handleFrameSelect(frame)}
                className="px-2 py-1 rounded text-[10px] font-medium tracking-wide transition-all"
                style={isActive
                  ? { backgroundColor: '#76b900', color: '#fff' }
                  : { backgroundColor: 'rgba(26,26,26,0.5)', color: '#5e5e5e', border: '1px solid rgba(94,94,94,0.4)' }
                }
              >
                {frame.label}
              </button>
            )
          })}
        </div>

        {/* Coords + current event */}
        <div className="hidden lg:flex flex-col items-end gap-0 flex-shrink-0">
          <span className="text-[8px] uppercase tracking-widest" style={{ color: '#333333' }}>COORD</span>
          <span className="text-[10px] tabular-nums" style={{ color: '#5e5e5e' }}>37.7749° N, 122.4194° W</span>
        </div>
      </div>

      {/* Event label bar */}
      {currentMonth > 0 && KEY_EVENTS[currentMonth] && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 border-t text-[10px]"
          style={{ borderColor: 'rgba(94,94,94,0.3)', backgroundColor: 'rgba(118,185,0,0.06)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#76b900' }}>
            {KEY_EVENTS[currentMonth].icon}
          </span>
          <span style={{ color: '#76b900' }}>{KEY_EVENTS[currentMonth].label}</span>
          <span style={{ color: '#333333' }}>· Month {currentMonth}</span>
        </div>
      )}
    </footer>
  )
}
