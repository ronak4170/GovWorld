import { useUIStore } from '@/store/uiStore'
import { PANEL_IDS } from '@/lib/constants'
import { useCitizenStore } from '@/store/citizenStore'
import { useCouncilStore } from '@/store/councilStore'

type PanelIdValue = typeof PANEL_IDS[keyof typeof PANEL_IDS]

interface BottomNavItem {
  id: PanelIdValue
  label: string
  icon: string
}

const BOTTOM_NAV: BottomNavItem[] = [
  { id: PANEL_IDS.UPDATES, label: 'Updates', icon: 'sensors' },
  { id: PANEL_IDS.CITIZEN, label: 'People',  icon: 'group' },
]

function NavBtn({
  icon, label, isActive, onClick, badge,
  accentColor = '#ffb690',
}: {
  icon: string
  label: string
  isActive?: boolean
  onClick: () => void
  badge?: number
  accentColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full h-11 flex flex-col items-center justify-center gap-0.5 rounded transition-all duration-150"
      style={{
        color: isActive ? accentColor : '#a78b7d',
        backgroundColor: isActive ? `${accentColor}14` : 'transparent',
        borderLeft: `2px solid ${isActive ? accentColor : 'transparent'}`,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.color = '#e0c0b1'
          e.currentTarget.style.backgroundColor = 'rgba(240,190,150,0.06)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.color = '#a78b7d'
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
      title={label}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
      <span className="text-[8px] font-semibold tracking-[0.08em] uppercase opacity-80">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 text-[8px] font-bold"
          style={{ backgroundColor: '#93000a', color: '#ffdad6' }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export default function Sidebar() {
  const activePanel = useUIStore((s) => s.activePanel)
  const setActivePanel = useUIStore((s) => s.setActivePanel)
  const setDebateArenaOpen = useCouncilStore((s) => s.setDebateArenaOpen)
  const citizens = useCitizenStore((s) => s.citizens)
  const redCount = citizens.filter((c) => c.statusColor === 'red').length

  return (
    <nav
      className="w-12 flex flex-col flex-shrink-0 z-20 border-r"
      style={{ backgroundColor: '#160c06', borderColor: 'rgba(88,66,55,0.3)' }}
    >
      {/* Logo */}
      <div
        className="h-12 flex items-center justify-center border-b flex-shrink-0"
        style={{ borderColor: 'rgba(88,66,55,0.3)' }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,182,144,0.18)', border: '1px solid rgba(255,182,144,0.3)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ffb690' }}>rocket_launch</span>
        </div>
      </div>

      {/* Top action buttons — Council + Arena */}
      <div className="flex flex-col py-2 gap-0.5 px-1">
        <NavBtn
          icon="forum"
          label="Council"
          accentColor="#93ccff"
          onClick={() => setDebateArenaOpen(true)}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="mx-2 h-px" style={{ backgroundColor: 'rgba(88,66,55,0.3)' }} />

      {/* Bottom nav — Updates / People / Ledger */}
      <div className="flex flex-col py-2 gap-0.5 px-1">
        {BOTTOM_NAV.map(({ id, label, icon }) => {
          const isActive = activePanel === id
          const badge = id === PANEL_IDS.CITIZEN ? redCount : undefined
          return (
            <NavBtn
              key={id}
              icon={icon}
              label={label}
              isActive={isActive}
              badge={badge}
              onClick={() => setActivePanel(isActive ? null : id)}
            />
          )
        })}
      </div>

      {/* Settings */}
      <div className="flex flex-col pb-3 px-1">
        <div className="mx-2 h-px mb-2" style={{ backgroundColor: 'rgba(88,66,55,0.3)' }} />
        <NavBtn icon="settings" label="Config" onClick={() => {}} />
      </div>
    </nav>
  )
}
