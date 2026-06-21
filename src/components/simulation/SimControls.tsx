import { useCallback } from 'react'
import { useWorldStore } from '@/store/worldStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useCitizenStore } from '@/store/citizenStore'
import { useUIStore } from '@/store/uiStore'
import { PANEL_IDS } from '@/lib/constants'
import { runSimulation } from '@/lib/simulationDirector'
import type { Policy } from '@/types/policy'

export default function SimControls() {
  const {
    isPlaying,
    setPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    currentMonth,
    setCurrentMonth,
    setConstructionProgress,
    setWeatherEvent,
  } = useWorldStore()

  const {
    ticks,
    setCurrentTick,
    isLoaded,
    isGenerating,
    isLiveMode,
    setIsGenerating,
    loadDirectorSimulation,
  } = useSimulationStore()

  const citizens = useCitizenStore((s) => s.citizens)
  const applyTickUpdates = useCitizenStore((s) => s.applyTickUpdates)
  const setActivePanel = useUIStore((s) => s.setActivePanel)

  const seekTo = (month: number) => {
    const tick = ticks.find((t) => t.month === month)
    if (!tick) return
    setCurrentTick(month)
    setCurrentMonth(month)
    setConstructionProgress(tick.constructionProgress)
    setWeatherEvent(tick.weatherEvent ?? null)
    applyTickUpdates(tick.citizenUpdates as any)
  }

  const reset = () => {
    setPlaying(false)
    setCurrentTick(0)
    setCurrentMonth(0)
    setConstructionProgress(0)
    setWeatherEvent(null)
  }

  const handleLiveSim = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setPlaying(false)

    // Build a minimal Policy object from current context
    const policy: Policy = {
      id: 'demo-policy',
      title: 'Van Ness Avenue Complete Streets — Phase 1',
      description:
        'Redesign of Van Ness Avenue from Market Street to Jackson Street (2.3km) ' +
        'with dedicated BRT lanes, protected cycle tracks, ADA crossings, and 6 upgraded bus shelters.',
      policyType: 'road',
      targetArea: 'Van Ness Avenue, San Francisco, CA',
      budget: 45000000,
      plannedStartDate: '2025-01-01',
      plannedEndDate: '2026-06-30',
      affectedZone: {
        type: 'Polygon',
        coordinates: [[[-122.430, 37.770], [-122.415, 37.770], [-122.415, 37.795], [-122.430, 37.795], [-122.430, 37.770]]],
      },
      submittedAt: new Date().toISOString(),
    }

    // Featured citizens only for the director prompt
    const featured = citizens.filter((c) => ['C001', 'C002', 'C003', 'C004', 'C005', 'C006'].includes(c.id))

    try {
      const result = await runSimulation({
        policy,
        featuredCitizens: featured,
        runSeed: crypto.randomUUID(),
      })
      loadDirectorSimulation(result)
      reset()
      // Switch right panel to edge cases so the user sees the output immediately
      setActivePanel(PANEL_IDS.EDGE_CASES)
    } catch (err) {
      console.error('[SimControls] Live simulation failed:', err)
      setIsGenerating(false)
    }
  }, [isGenerating, citizens, setIsGenerating, setPlaying, loadDirectorSimulation, setActivePanel])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Live Simulation button — the star feature */}
      <button
        onClick={handleLiveSim}
        disabled={isGenerating}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          isGenerating
            ? 'bg-blue-900/40 text-blue-400 border border-blue-800 cursor-wait'
            : isLiveMode
            ? 'bg-violet-600 hover:bg-violet-500 text-white border border-violet-500'
            : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
        }`}
        title="Generate a fresh simulation with unique edge cases each time"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⟳</span>
            <span>Generating…</span>
          </>
        ) : isLiveMode ? (
          <>🎲 Re-roll</>
        ) : (
          <>✨ Live Sim</>
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-700" />

      {/* Reset */}
      <button
        onClick={reset}
        disabled={!isLoaded}
        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
        title="Reset to start"
      >
        &#10094;&#10094;
      </button>

      {/* Play / Pause */}
      <button
        onClick={() => setPlaying(!isPlaying)}
        disabled={!isLoaded || currentMonth >= 12}
        className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white font-bold transition-colors text-base"
        title={isPlaying ? 'Pause simulation' : 'Play simulation'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Speed selector */}
      <div className="flex gap-1">
        {([1, 2, 5] as const).map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            disabled={!isLoaded}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
              playbackSpeed === speed
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
          >
            {speed}&times;
          </button>
        ))}
      </div>

      {/* Month readout */}
      {currentMonth > 0 && (
        <div className="text-slate-400 text-xs ml-1">
          Month <span className="text-slate-100 font-semibold">{currentMonth}</span>/12
        </div>
      )}

      {/* Skip to end */}
      {isLoaded && currentMonth < 12 && (
        <button
          onClick={() => seekTo(12)}
          className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors ml-1"
          title="Jump to month 12"
        >
          Skip to end
        </button>
      )}
    </div>
  )
}
