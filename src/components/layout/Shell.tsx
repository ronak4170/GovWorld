import { useEffect } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import PanelManager from './PanelManager'
import MapHud from './MapHud'
import CesiumWorld from '@/components/map/CesiumWorld'
import TimelineBar from '@/components/simulation/TimelineBar'
import SimulationEngine from '@/components/simulation/SimulationEngine'
import CitizenChat from '@/components/voice/CitizenChat'
import DissatisfactionAlert from '@/components/notifications/DissatisfactionAlert'
import DebateArena from '@/components/debate/DebateArena'
import FullScreenOverlay from '@/components/layout/FullScreenOverlay'
import { useUIStore } from '@/store/uiStore'
import { useCouncilStore } from '@/store/councilStore'
import { PANEL_IDS } from '@/lib/constants'
import type { Toast } from '@/store/uiStore'

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-4 py-3 rounded-xl text-sm font-medium shadow-xl border transition-all"
          style={
            toast.type === 'error'
              ? { backgroundColor: 'rgba(127,29,29,0.95)', color: '#fca5a5', borderColor: '#7f1d1d' }
              : toast.type === 'success'
              ? { backgroundColor: 'rgba(6,78,59,0.95)', color: '#6ee7b7', borderColor: '#065f46' }
              : toast.type === 'warning'
              ? { backgroundColor: 'rgba(120,53,15,0.95)', color: '#fcd34d', borderColor: '#92400e' }
              : { backgroundColor: 'rgba(15,17,23,0.97)', color: '#f0f2f8', borderColor: '#1e2535' }
          }
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default function Shell() {
  const toasts = useUIStore((s) => s.toasts)
  const isDebateArenaOpen = useCouncilStore((s) => s.isDebateArenaOpen)
  const setActivePanel = useUIStore((s) => s.setActivePanel)

  // Set Updates as default panel on mount
  useEffect(() => {
    setActivePanel(PANEL_IDS.UPDATES)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#08090d' }}>
      {/* Cinematic scanline */}
      <div className="scanline" />
      {/* SimulationEngine runs silently in background */}
      <SimulationEngine />

      {/* TopBar */}
      <TopBar />

      {/* Main 3-panel area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center: Map */}
        <div className="relative flex-1 overflow-hidden">
          <CesiumWorld />
          <MapHud />
        </div>

        {/* Right Panel: 360px fixed width */}
        <div
          className="w-[360px] flex-shrink-0 overflow-hidden flex flex-col border-l"
          style={{ backgroundColor: '#0f1117', borderColor: '#1e2535' }}
        >
          <PanelManager />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <TimelineBar />

      {/* DissatisfactionAlert as fixed overlay (not inside right panel) */}
      <div className="fixed bottom-24 right-4 z-40">
        <DissatisfactionAlert />
      </div>

      {/* Voice chat modal (renders over everything) */}
      <CitizenChat />

      {/* Debate arena — portaled above the map */}
      <FullScreenOverlay open={isDebateArenaOpen}>
        <DebateArena />
      </FullScreenOverlay>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
