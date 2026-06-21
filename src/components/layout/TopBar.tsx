import SimControls from '@/components/simulation/SimControls'
import { useWorldStore } from '@/store/worldStore'
import { useCitizenStore } from '@/store/citizenStore'

export default function TopBar() {
  const currentMonth = useWorldStore((s) => s.currentMonth)
  const constructionProgress = useWorldStore((s) => s.constructionProgress)
  const isPlaying = useWorldStore((s) => s.isPlaying)
  const citizens = useCitizenStore((s) => s.citizens)
  const redCount = citizens.filter((c) => c.statusColor === 'red').length
  const greenCount = citizens.filter((c) => c.statusColor === 'green').length

  const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const currentLabel = currentMonth > 0 ? MONTH_LABELS[currentMonth - 1] : null

  return (
    <header
      className="h-12 flex items-center px-4 gap-4 flex-shrink-0 z-40 relative border-b"
      style={{ backgroundColor: 'rgba(28, 17, 11, 0.85)', borderColor: 'rgba(94,94,94, 0.3)', backdropFilter: 'blur(16px)' }}
    >
      {/* LEFT — wordmark */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="font-black text-[18px] tracking-tighter leading-none"
          style={{ color: '#76b900', fontFamily: 'Inter, sans-serif' }}
        >
          GOVWORLD
        </span>
        <span className="text-[10px] tracking-[0.15em] uppercase opacity-50" style={{ color: '#ffffff' }}>
          SIMULATION
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* STATUS CHIPS */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Citizens */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded text-[10px] tracking-[0.08em] uppercase"
          style={{ backgroundColor: 'rgba(26,26,26,0.5)', border: '1px solid rgba(94,94,94,0.4)', color: '#a7a7a7' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#76b900' }}>group</span>
          <span className="tabular-nums font-bold" style={{ color: '#ffffff' }}>{citizens.length}</span>
          <span>active</span>
        </div>

        {/* Crisis count — only when there are red citizens */}
        {redCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[10px] tracking-[0.08em] uppercase"
            style={{ backgroundColor: 'rgba(229,32,32,0.3)', border: '1px solid rgba(229,32,32,0.3)', color: '#e52020' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
            <span className="tabular-nums font-bold">{redCount}</span>
            <span>crisis</span>
          </div>
        )}

        {/* Month — only when simulation running */}
        {currentMonth > 0 && currentLabel && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[10px] tracking-[0.08em] uppercase"
            style={{ backgroundColor: 'rgba(118,185,0,0.12)', border: '1px solid rgba(118,185,0,0.3)', color: '#76b900' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
            <span className="font-bold tabular-nums">{currentLabel}</span>
            <span className="opacity-60">· {constructionProgress}%</span>
          </div>
        )}

        {/* Thriving count */}
        {greenCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[10px] tracking-[0.08em] uppercase"
            style={{ backgroundColor: 'rgba(0,165,114,0.15)', border: '1px solid rgba(118,185,0,0.2)', color: '#76b900' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>thumb_up</span>
            <span className="tabular-nums font-bold">{greenCount}</span>
            <span>thriving</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: '#333333' }} />

      {/* Sim controls + live dot */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <SimControls />
        {isPlaying && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#76b900', boxShadow: '0 0 6px #76b900' }} />
            <span className="text-[9px] uppercase tracking-widest hidden lg:block" style={{ color: '#76b900' }}>Live</span>
          </div>
        )}
      </div>

      {/* Coords readout */}
      <div className="hidden lg:flex flex-col items-end gap-0">
        <span className="text-[9px] uppercase tracking-widest" style={{ color: '#333333' }}>COORD</span>
        <span className="text-[10px] tabular-nums font-medium" style={{ color: '#5e5e5e' }}>37.7790° N, 122.4193° W</span>
      </div>
    </header>
  )
}
