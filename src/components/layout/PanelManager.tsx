import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { PANEL_IDS } from '@/lib/constants'
import CitizenCard from '@/components/citizens/CitizenCard'
import CitizenList from '@/components/citizens/CitizenList'
import UpdatesFeed from '@/components/simulation/UpdatesFeed'

const TABS = [
  { id: PANEL_IDS.UPDATES, label: 'Updates' },
  { id: PANEL_IDS.CITIZEN, label: 'People' },
] as const

type TabId = typeof TABS[number]['id']

export default function PanelManager() {
  const activePanel = useUIStore((s) => s.activePanel)
  const setActivePanel = useUIStore((s) => s.setActivePanel)
  const selectedCitizenId = useUIStore((s) => s.selectedCitizenId)

  // When a citizen is selected, auto-switch to the People tab
  useEffect(() => {
    if (selectedCitizenId) {
      setActivePanel(PANEL_IDS.CITIZEN)
    }
  }, [selectedCitizenId])

  // Determine the effective active tab (fall back to UPDATES for non-tab panels)
  const activeTab: TabId =
    activePanel === PANEL_IDS.CITIZEN || activePanel === PANEL_IDS.UPDATES
      ? activePanel as TabId
      : PANEL_IDS.UPDATES

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex-shrink-0 flex items-stretch border-b"
        style={{ height: '40px', backgroundColor: '#000000', borderColor: '#1a1a1a' }}
      >
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className="relative flex-1 flex items-center justify-center text-xs font-semibold tracking-wide transition-colors duration-150"
              style={{ color: isActive ? '#ffffff' : '#757575' }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = '#a7a7a7'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = '#757575'
              }}
            >
              {label}
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: '#76b900' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === PANEL_IDS.UPDATES && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <UpdatesFeed />
          </div>
        )}

        {activeTab === PANEL_IDS.CITIZEN && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {selectedCitizenId ? <CitizenCard /> : <CitizenList />}
          </div>
        )}
      </div>
    </div>
  )
}
