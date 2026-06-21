import { useCitizenStore } from '@/store/citizenStore'
import { useUIStore } from '@/store/uiStore'
import { useWorldStore } from '@/store/worldStore'
import { STATUS_NARRATIVES } from '@/lib/constants'

const STATUS_CONFIG = {
  green: {
    bar: 'bg-green-500',
    badge: 'bg-green-900/40 text-green-300 border-green-800/50',
    text: 'text-green-400',
    label: 'Thriving',
  },
  amber: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-900/40 text-amber-300 border-amber-800/50',
    text: 'text-amber-400',
    label: 'Stressed',
  },
  red: {
    bar: 'bg-red-500',
    badge: 'bg-red-900/40 text-red-300 border-red-800/50',
    text: 'text-red-400',
    label: 'Crisis',
  },
  grey: {
    bar: 'bg-slate-500',
    badge: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
    text: 'text-slate-400',
    label: 'Displaced',
  },
}

export default function CitizenCard() {
  const selectedId = useUIStore((s) => s.selectedCitizenId)
  const getCitizenById = useCitizenStore((s) => s.getCitizenById)
  const openVoiceChat = useUIStore((s) => s.openVoiceChat)
  const selectCitizen = useUIStore((s) => s.selectCitizen)
  const currentMonth = useWorldStore((s) => s.currentMonth)

  const citizen = getCitizenById(selectedId ?? '')
  if (!citizen) return null

  const cfg = STATUS_CONFIG[citizen.statusColor]
  const firstName = citizen.name.split(' ')[0]

  // DiceBear avatar for featured citizens
  const avatarUrl = citizen.isFeatured
    ? `https://api.dicebear.com/7.x/personas/svg?seed=${citizen.id}&backgroundColor=0d1526`
    : null

  return (
    <div className="h-full flex flex-col bg-[#000000] overflow-y-auto">
      {/* Back + status badge row */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => selectCitizen(null)}
          className="flex items-center gap-1.5 text-[#a7a7a7] hover:text-[#ffffff] transition-colors text-sm"
          aria-label="Back to list"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Avatar + name block */}
      <div className="px-4 pb-4 flex items-start gap-3 flex-shrink-0">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={citizen.name}
              className="w-14 h-14 rounded-full border-2 border-[#333333] bg-[#1a1a1a]"
            />
          ) : (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 border-[#333333] ${cfg.badge}`}>
              {citizen.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Name + details */}
        <div className="flex-1 min-w-0">
          <div className="text-[#ffffff] font-bold text-xl leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            {citizen.name}
          </div>
          <div className="text-[#a7a7a7] text-sm mt-0.5">
            {citizen.occupation} &middot; {citizen.age}
          </div>
          <div className="text-[#757575] text-xs mt-0.5 truncate">{citizen.employer}</div>
        </div>
      </div>

      {/* Status bar */}
      <div className={`h-1 w-full ${cfg.bar} flex-shrink-0`} />

      {/* Worker badge */}
      {citizen.isWorker && (
        <div className="mx-4 mt-3 flex-shrink-0">
          <div className="inline-flex items-center gap-1.5 bg-blue-900/30 text-blue-300 text-xs px-3 py-1.5 rounded-lg border border-blue-700/40">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Assigned — {citizen.assignedTaskId ?? 'Construction Team'}</span>
          </div>
        </div>
      )}

      {/* Impact story */}
      <div className="mx-4 mt-4 p-3 bg-[#1a1a1a] rounded-xl border border-[#333333] flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#757575] mb-2">
          {currentMonth > 0 ? `Month ${currentMonth} Impact` : 'Policy Impact'}
        </div>
        <p className="text-[#ffffff] text-sm leading-relaxed">{citizen.currentPolicyImpact}</p>
        <p className={`text-xs mt-2 ${cfg.text} opacity-70`}>
          {STATUS_NARRATIVES[citizen.statusColor]}
        </p>
      </div>

      {/* Fear & Hope */}
      <div className="mx-4 mt-3 space-y-2 flex-shrink-0">
        <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#333333]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70 mb-1.5">Fear</div>
          <p className="text-[#a7a7a7] text-sm italic leading-relaxed">&ldquo;{citizen.fears}&rdquo;</p>
        </div>
        <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#333333]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-green-400/70 mb-1.5">Hope</div>
          <p className="text-[#a7a7a7] text-sm italic leading-relaxed">&ldquo;{citizen.hopes}&rdquo;</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="mx-4 mt-3 p-3 bg-[#1a1a1a] rounded-xl border border-[#333333] flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#757575] mb-2.5">Details</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[#757575]">Income</span>
            <span className="text-[#ffffff] font-medium tabular-nums">
              ${citizen.monthlyIncome.toLocaleString('en-US')}/mo
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#757575]">Family</span>
            <span className="text-[#a7a7a7] text-right text-xs leading-relaxed max-w-[180px]">{citizen.familyStructure}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#757575]">Health</span>
            <span className="text-[#a7a7a7] capitalize">{citizen.healthStatus.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mx-4 mt-3 flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#757575] mb-2">Skills</div>
        <div className="flex flex-wrap gap-1.5">
          {citizen.skills.map((skill) => (
            <span
              key={skill}
              className="bg-[#1a1a1a] border border-[#333333] text-[#a7a7a7] text-xs px-2.5 py-0.5 rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Status history */}
      {citizen.statusHistory.length > 0 && (
        <div className="mx-4 mt-3 flex-shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#757575] mb-2">Recent History</div>
          <div className="space-y-1.5">
            {citizen.statusHistory.slice(-3).reverse().map((entry) => (
              <div key={`${entry.tick}-${entry.status}`} className="flex gap-3 text-xs p-2 rounded-lg bg-[#1a1a1a] border border-[#333333]">
                <span className="text-[#757575] flex-shrink-0 font-medium w-14">Mo. {entry.tick}</span>
                <span className="text-[#a7a7a7] leading-relaxed">{entry.narrative}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat CTA — available to all citizens, not just featured */}
      <div className="px-4 py-4 mt-3">
        <button
          onClick={openVoiceChat}
          className="w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-150"
          style={{ background: 'linear-gradient(135deg, #76b900 0%, #5a8d00 100%)', boxShadow: '0 4px 14px rgba(118,185,0,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span>Chat with {firstName}</span>
        </button>
        <p className="text-xs text-center mt-2" style={{ color: '#757575' }}>Ask them how the construction is affecting their life</p>
      </div>
    </div>
  )
}
