// ConstructionOverlay — renders the Van Ness Avenue construction progress
// as a Leaflet Polyline. Color and length react to currentMonth / constructionProgress.

import { Polyline } from 'react-leaflet'
import { useWorldStore } from '@/store/worldStore'
import { useSimulationStore } from '@/store/simulationStore'
import { VAN_NESS_ROUTE, CONSTRUCTION_COLORS } from '@/lib/constants'

export default function ConstructionOverlay() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const constructionProgress = useWorldStore((s) => s.constructionProgress)
  const getCurrentTick = useSimulationStore((s) => s.getCurrentTick)

  if (currentMonth === 0 || constructionProgress === 0) return null

  const color = CONSTRUCTION_COLORS[currentMonth] ?? '#ffffff'
  const weight = currentMonth === 12 ? 12 : 8

  // Slice the route proportionally to constructionProgress
  const totalPoints = VAN_NESS_ROUTE.length
  const progressIndex = Math.ceil((constructionProgress / 100) * (totalPoints - 1))
  const visibleRoute = VAN_NESS_ROUTE.slice(0, Math.max(2, progressIndex + 1))

  // Extra overlays from the current simulation tick
  const tick = getCurrentTick()
  const tickOverlays = tick?.mapOverlays.filter((o) => o.visible && o.coordinates.length >= 2) ?? []

  return (
    <>
      <Polyline
        positions={visibleRoute}
        pathOptions={{ color, weight, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
      />
      {tickOverlays.map((overlay) => (
        <Polyline
          key={overlay.id}
          positions={overlay.coordinates}
          pathOptions={{ color: overlay.color, weight: 5, opacity: overlay.opacity ?? 0.7 }}
        />
      ))}
    </>
  )
}
