// CitizenDots — renders citizens as Leaflet CircleMarkers on the OSM map.
// - Pauses animation when simulation is paused
// - Featured citizens (C001–C006) are larger with permanent name labels
// - Click opens the citizen card in the right panel

import { useEffect, useRef, useState, useCallback } from 'react'
import { CircleMarker, Tooltip } from 'react-leaflet'
import { useCitizenStore } from '@/store/citizenStore'
import { useWorldStore } from '@/store/worldStore'
import { useUIStore } from '@/store/uiStore'
import { STATUS_COLORS, CITIZEN_ROUTE_CYCLE_MS, FEATURED_CITIZEN_DOT_SIZE, BACKGROUND_CITIZEN_DOT_SIZE, PANEL_IDS } from '@/lib/constants'

function getRoutePosition(
  route: [number, number][],
  elapsedMs: number,
  cycleMs: number
): [number, number] {
  if (route.length === 0) return [0, 0]
  if (route.length === 1) return route[0]

  const halfCycle = cycleMs / 2
  const elapsed = elapsedMs % cycleMs
  const t = elapsed < halfCycle ? elapsed / halfCycle : (cycleMs - elapsed) / halfCycle

  const segCount = route.length - 1
  const scaled = t * segCount
  const seg = Math.min(Math.floor(scaled), segCount - 1)
  const segT = scaled - seg

  const [lat1, lng1] = route[seg]
  const [lat2, lng2] = route[seg + 1]
  return [lat1 + (lat2 - lat1) * segT, lng1 + (lng2 - lng1) * segT]
}

export default function CitizenDots() {
  const citizens = useCitizenStore((s) => s.citizens)
  const isPlaying = useWorldStore((s) => s.isPlaying)
  const selectCitizen = useUIStore((s) => s.selectCitizen)
  const setActivePanel = useUIStore((s) => s.setActivePanel)
  const selectedId = useUIStore((s) => s.selectedCitizenId)

  // Elapsed ms while playing — freezes when paused
  const elapsedRef = useRef(0)
  const lastTickRef = useRef(Date.now())
  const [renderTick, setRenderTick] = useState(0)

  useEffect(() => {
    if (!isPlaying) return

    const id = setInterval(() => {
      const now = Date.now()
      elapsedRef.current += now - lastTickRef.current
      lastTickRef.current = now
      setRenderTick((t) => t + 1)
    }, 80) // ~12fps — smooth but lightweight

    lastTickRef.current = Date.now()
    return () => clearInterval(id)
  }, [isPlaying])

  const handleClick = useCallback((citizenId: string) => {
    selectCitizen(citizenId)
    setActivePanel(PANEL_IDS.CITIZEN)
  }, [selectCitizen, setActivePanel])

  if (citizens.length === 0) return null

  return (
    <>
      {citizens.map((citizen) => {
        const route =
          citizen.dailyRoute.length >= 2
            ? citizen.dailyRoute
            : [citizen.homeCoords, citizen.workCoords]

        const [lat, lng] = getRoutePosition(route, elapsedRef.current, CITIZEN_ROUTE_CYCLE_MS)
        const color = STATUS_COLORS[citizen.statusColor]?.hex ?? '#64748b'
        const isSelected = citizen.id === selectedId
        const radius = citizen.isFeatured ? FEATURED_CITIZEN_DOT_SIZE : BACKGROUND_CITIZEN_DOT_SIZE

        return (
          <CircleMarker
            key={citizen.id}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: isSelected ? '#ffffff' : 'rgba(0,0,0,0.35)',
              weight: isSelected ? 3 : 1.5,
              fillColor: color,
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () => handleClick(citizen.id),
            }}
          >
            {citizen.isFeatured && (
              <Tooltip
                permanent
                direction="right"
                offset={[radius + 3, 0]}
                className="citizen-label"
              >
                {citizen.name.split(' ')[0]}
              </Tooltip>
            )}
          </CircleMarker>
        )
      })}
    </>
  )
}
