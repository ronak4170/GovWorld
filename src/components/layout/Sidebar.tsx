import { useUIStore } from '@/store/uiStore'
import { PANEL_IDS } from '@/lib/constants'
import { useCitizenStore } from '@/store/citizenStore'
import { useCouncilStore } from '@/store/councilStore'

type RailItem = {
  id: string
  icon: string
  label: string
  onClick: () => void
  active: boolean
  badge?: number
}

export default function Sidebar() {
  const activePanel = useUIStore((s) => s.activePanel)
  const setActivePanel = useUIStore((s) => s.setActivePanel)
  const citizens = useCitizenStore((s) => s.citizens)
  const redCount = citizens.filter((c) => c.statusColor === 'red').length

  const setDebateArenaOpen = useCouncilStore((s) => s.setDebateArenaOpen)
  const isDebateArenaOpen = useCouncilStore((s) => s.isDebateArenaOpen)

  const togglePanel = (id: string) =>
    setActivePanel(activePanel === id ? null : (id as never))

  const items: RailItem[] = [
    {
      id: 'text-debate',
      icon: 'forum',
      label: 'Debate Arena',
      onClick: () => setDebateArenaOpen(true),
      active: isDebateArenaOpen,
    },
    {
      id: PANEL_IDS.UPDATES,
      icon: 'monitoring',
      label: 'Live Updates',
      onClick: () => togglePanel(PANEL_IDS.UPDATES),
      active: activePanel === PANEL_IDS.UPDATES,
    },
    {
      id: PANEL_IDS.CITIZEN,
      icon: 'groups',
      label: 'Citizens',
      onClick: () => togglePanel(PANEL_IDS.CITIZEN),
      active: activePanel === PANEL_IDS.CITIZEN,
      badge: redCount,
    },
  ]

  return (
    <nav
      className="w-12 flex-shrink-0 flex flex-col items-center py-3 z-30 border-r"
      style={{ backgroundColor: '#000000', borderColor: 'rgba(94,94,94,0.3)' }}
    >
      {/* Logo */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center mb-5 flex-shrink-0"
        style={{ backgroundColor: 'rgba(118,185,0,0.18)' }}
        title="GOVWORLD Mission Control"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#76b900', fontVariationSettings: "'FILL' 1" }}>
          rocket_launch
        </span>
      </div>

      {/* Nav icons */}
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            title={item.label}
            aria-label={item.label}
            className="relative w-10 h-10 flex items-center justify-center rounded transition-all cursor-pointer"
            style={
              item.active
                ? { color: '#76b900', backgroundColor: 'rgba(118,185,0,0.12)', borderLeft: '2px solid #76b900' }
                : { color: '#5e5e5e' }
            }
            onMouseEnter={(e) => {
              if (!item.active) {
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.backgroundColor = 'rgba(26,26,26,0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (!item.active) {
                e.currentTarget.style.color = '#5e5e5e'
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {item.icon}
            </span>
            {item.badge != null && item.badge > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
