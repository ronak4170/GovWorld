// MapControls.tsx — OWNED BY Map Agent
// Floating controls overlay on the Cesium map.
// Shows: camera reset button, construction progress pill, weather event banner.

import { useWorldStore } from '@/store/worldStore'
import { VAN_NESS_COORDS, DEMO_ROAD_NAME } from '@/lib/constants'

export default function MapControls() {
  const mapInstance = useWorldStore((s) => s.mapInstance)
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const constructionProgress = useWorldStore((s) => s.constructionProgress)
  const weatherEvent = useWorldStore((s) => s.weatherEvent)
  const neighbourhoodName = useWorldStore((s) => s.neighbourhoodName)

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.setView([VAN_NESS_COORDS.lat, VAN_NESS_COORDS.lng], 15)
    }
  }

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000] pointer-events-none">
      {/* Reset view button */}
      <button
        onClick={handleResetView}
        className="pointer-events-auto w-9 h-9 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-colors text-base backdrop-blur-sm"
        title="Reset map view"
        aria-label="Reset map view"
      >
        ⌂
      </button>

      {/* Neighbourhood label */}
      <div className="pointer-events-none bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 backdrop-blur-sm">
        <p className="text-slate-300 text-xs font-medium leading-tight">{neighbourhoodName}</p>
        <p className="text-slate-500 text-[10px]">OpenStreetMap</p>
      </div>

      {/* Construction progress */}
      {currentMonth > 0 && (
        <div className="pointer-events-none bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 backdrop-blur-sm min-w-[140px]">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1.5 font-medium">
            {DEMO_ROAD_NAME}
          </div>
          <div className="w-full bg-slate-600 rounded-full h-1.5 mb-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${constructionProgress}%`,
                backgroundColor: currentMonth === 12 ? '#76b900' : '#76b900',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px]">Month {currentMonth}/12</span>
            <span
              className="text-xs font-semibold"
              style={{ color: currentMonth === 12 ? '#76b900' : '#76b900' }}
            >
              {constructionProgress}%
            </span>
          </div>
        </div>
      )}

      {/* Weather event banner */}
      {weatherEvent && (
        <div className="pointer-events-none bg-blue-900/70 border border-blue-700/60 rounded-lg px-3 py-2 backdrop-blur-sm max-w-[180px]">
          <div className="text-blue-400 text-[10px] uppercase tracking-wider mb-0.5 font-medium">
            Weather
          </div>
          <p className="text-blue-200 text-xs leading-snug">{weatherEvent}</p>
        </div>
      )}
    </div>
  )
}
