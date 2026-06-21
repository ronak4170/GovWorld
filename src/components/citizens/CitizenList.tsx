import { useState, useMemo } from 'react'
import { useCitizenStore } from '@/store/citizenStore'
import { useUIStore } from '@/store/uiStore'
import { PANEL_IDS } from '@/lib/constants'
import type { CitizenStatus as CitizenStatusType } from '@/types/citizen'

const STATUS_SEVERITY_ORDER: Record<CitizenStatusType, number> = {
  red: 0,
  amber: 1,
  grey: 2,
  green: 3,
}

const STATUS_CONFIG: Record<CitizenStatusType, { dot: string; text: string; badge: string; label: string; border: string }> = {
  red:   { dot: 'bg-red-500',   text: 'text-red-400',   badge: 'bg-red-900/40 text-red-300 border-red-800/50',   label: 'Crisis',    border: 'border-red-500/40' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-900/40 text-amber-300 border-amber-800/50', label: 'Stressed', border: 'border-amber-500/40' },
  green: { dot: 'bg-green-500', text: 'text-green-400', badge: 'bg-green-900/40 text-green-300 border-green-800/50', label: 'Thriving', border: 'border-green-500/40' },
  grey:  { dot: 'bg-slate-500', text: 'text-slate-400', badge: 'bg-slate-800/60 text-slate-400 border-slate-700/50',  label: 'Displaced', border: 'border-slate-600/40' },
}

export default function CitizenList() {
  const citizens = useCitizenStore((s) => s.citizens)
  const selectedId = useUIStore((s) => s.selectedCitizenId)
  const selectCitizen = useUIStore((s) => s.selectCitizen)
  const setActivePanel = useUIStore((s) => s.setActivePanel)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CitizenStatusType | 'all'>('all')

  const filtered = useMemo(() => {
    return citizens
      .filter((c) => {
        if (filter !== 'all' && c.statusColor !== filter) return false
        if (search) {
          const q = search.toLowerCase()
          if (
            !c.name.toLowerCase().includes(q) &&
            !c.occupation.toLowerCase().includes(q) &&
            !c.employer.toLowerCase().includes(q)
          ) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1
        if (!a.isFeatured && b.isFeatured) return 1
        return STATUS_SEVERITY_ORDER[a.statusColor] - STATUS_SEVERITY_ORDER[b.statusColor]
      })
  }, [citizens, search, filter])

  const statusCounts = useMemo(() => {
    const counts: Record<CitizenStatusType, number> = { red: 0, amber: 0, green: 0, grey: 0 }
    citizens.forEach((c) => counts[c.statusColor]++)
    return counts
  }, [citizens])

  const handleSelect = (id: string) => {
    selectCitizen(id)
    setActivePanel(PANEL_IDS.CITIZEN)
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1526]">
      {/* Status summary / filter bar */}
      <div className="grid grid-cols-4 gap-1.5 p-3 border-b border-[#1e2d4a]">
        {(['red', 'amber', 'green', 'grey'] as CitizenStatusType[]).map((s) => {
          const cfg = STATUS_CONFIG[s]
          const isActive = filter === s
          return (
            <button
              key={s}
              onClick={() => setFilter((prev) => (prev === s ? 'all' : s))}
              className={`rounded-xl p-2 text-center transition-all duration-150 border ${
                isActive
                  ? `${cfg.badge} ${cfg.border} shadow-sm`
                  : 'bg-[#131f38] border-[#1e2d4a] hover:border-[#2a4480]'
              }`}
              aria-label={`Filter by ${s} status`}
            >
              <div className={`text-sm font-bold tabular-nums ${isActive ? cfg.text : 'text-[#e8edf7]'}`}>
                {statusCounts[s]}
              </div>
              <div className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${isActive ? cfg.text : 'text-[#3d5280]'}`}>
                {cfg.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-[#1e2d4a]">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3d5280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or job..."
            className="w-full bg-[#131f38] border border-[#1e2d4a] rounded-xl pl-9 pr-3 py-2 text-[#e8edf7] text-sm focus:outline-none focus:border-[#2a4480] focus:ring-1 focus:ring-blue-500/20 placeholder:text-[#3d5280] transition-colors"
          />
        </div>
      </div>

      {/* Active filter bar */}
      {filter !== 'all' && (
        <div className="px-3 py-2 bg-[#131f38] border-b border-[#1e2d4a] flex items-center justify-between">
          <span className="text-[#7a90b8] text-xs">
            {filtered.length} {filter} citizen{filtered.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setFilter('all')}
            className="text-[#3d5280] hover:text-[#7a90b8] text-xs transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Citizen rows */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-[#131f38] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#3d5280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-[#7a90b8] text-sm">No citizens match your search</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-blue-400 text-xs hover:text-blue-300 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filtered.map((citizen) => {
            const cfg = STATUS_CONFIG[citizen.statusColor]
            const isSelected = selectedId === citizen.id

            return (
              <button
                key={citizen.id}
                onClick={() => handleSelect(citizen.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-150 flex items-center gap-3 group ${
                  isSelected
                    ? `bg-[#131f38] border-[#2a4480] shadow-[0_0_12px_rgba(59,130,246,0.12)]`
                    : `bg-[#0d1526] border-[#1e2d4a] hover:bg-[#131f38] hover:${cfg.border}`
                }`}
              >
                {/* Status dot */}
                <div className="flex-shrink-0 relative">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  {citizen.statusColor === 'red' && (
                    <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${cfg.dot} animate-ping opacity-60`} />
                  )}
                </div>

                {/* Name + job */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {citizen.isFeatured && (
                      <span className="text-blue-400 text-[11px] flex-shrink-0">✦</span>
                    )}
                    <span className={`text-sm font-semibold truncate ${citizen.isFeatured ? 'text-[#e8edf7]' : 'text-[#b0bcd4]'}`}>
                      {citizen.name}
                    </span>
                    {citizen.isWorker && (
                      <span className="flex-shrink-0 text-[9px] bg-[#131f38] text-[#7a90b8] px-1.5 py-px rounded border border-[#1e2d4a]">
                        worker
                      </span>
                    )}
                  </div>
                  <div className="text-[#3d5280] text-xs truncate group-hover:text-[#7a90b8] transition-colors">
                    {citizen.occupation}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badge} ${cfg.border}`}>
                  {cfg.label}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-[#1e2d4a]">
        <p className="text-[#3d5280] text-[11px] text-center">
          {citizens.length} citizens in simulation
        </p>
      </div>
    </div>
  )
}
