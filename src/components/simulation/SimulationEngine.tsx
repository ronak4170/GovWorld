import { useEffect } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useCitizenStore } from '@/store/citizenStore'
import { useWorldStore } from '@/store/worldStore'
import { TICK_INTERVAL_MS } from '@/lib/constants'

// Non-visual controller component. Wires the simulation tick loop.
// Renders nothing — mount this once inside the app shell.
export default function SimulationEngine() {
  const { ticks, setCurrentTick } = useSimulationStore()
  const applyTickUpdates = useCitizenStore((s) => s.applyTickUpdates)
  const {
    isPlaying,
    playbackSpeed,
    setPlaying,
    setCurrentMonth,
    setConstructionProgress,
    setWeatherEvent,
  } = useWorldStore()

  useEffect(() => {
    if (!isPlaying) return

    const intervalMs = TICK_INTERVAL_MS / playbackSpeed

    const interval = setInterval(() => {
      const { currentTick } = useSimulationStore.getState()
      const nextMonth = currentTick + 1

      if (nextMonth > ticks.length) {
        setPlaying(false)
        return
      }

      const tick = ticks.find((t) => t.month === nextMonth)
      if (tick) {
        setCurrentTick(nextMonth)
        setCurrentMonth(nextMonth)
        setConstructionProgress(tick.constructionProgress)
        setWeatherEvent(tick.weatherEvent ?? null)
        applyTickUpdates(tick.citizenUpdates as any)
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [isPlaying, playbackSpeed, ticks])

  return null
}
