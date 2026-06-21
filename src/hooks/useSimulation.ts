import { useEffect, useRef } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useCitizenStore } from '@/store/citizenStore'
import { useWorldStore } from '@/store/worldStore'
import { TICK_INTERVAL_MS } from '@/lib/constants'

export function useSimulation() {
  const { ticks, currentTick, setCurrentTick } = useSimulationStore()
  const applyTickUpdates = useCitizenStore((s) => s.applyTickUpdates)
  const { isPlaying, setPlaying, playbackSpeed, setCurrentMonth, setConstructionProgress, setWeatherEvent } = useWorldStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const advanceTick = () => {
    const { ticks, currentTick } = useSimulationStore.getState()
    const next = currentTick + 1
    if (next > ticks.length) {
      useWorldStore.getState().setPlaying(false)
      return
    }
    const tick = ticks.find((t) => t.month === next)
    if (tick) {
      setCurrentTick(next)
      setCurrentMonth(next)
      setConstructionProgress(tick.constructionProgress)
      setWeatherEvent(tick.weatherEvent ?? null)
      applyTickUpdates(tick.citizenUpdates as any)
    }
  }

  useEffect(() => {
    if (isPlaying) {
      const ms = TICK_INTERVAL_MS / playbackSpeed
      intervalRef.current = setInterval(advanceTick, ms)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, playbackSpeed])

  const seekToMonth = (month: number) => {
    const tick = ticks.find((t) => t.month === month)
    if (!tick) return
    setCurrentTick(month)
    setCurrentMonth(month)
    setConstructionProgress(tick.constructionProgress)
    setWeatherEvent(tick.weatherEvent ?? null)
    applyTickUpdates(tick.citizenUpdates as any)
  }

  return { currentTick, ticks, isPlaying, setPlaying, seekToMonth, advanceTick }
}
