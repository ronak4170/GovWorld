import { useCouncilStore, EXPERT_POOL } from '@/store/councilStore'
import AgentCard from './AgentCard'
import SeverityReport from './SeverityReport'
import PolicyInput from './PolicyInput'

export default function CouncilDebate() {
  const { members, isDebating, isComplete, selectedExpertIds, speakingExpertId, toggleExpert } =
    useCouncilStore()

  const hasMembers = members.length > 0

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Section heading */}
      <div>
        <div className="text-slate-100 font-semibold text-sm mb-1">Policy Council</div>
        <div className="text-slate-400 text-xs">
          Select 2–7 experts, then start the live debate
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Expert selector — horizontally scrollable chip row                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs uppercase tracking-wider">Select Experts</span>
          <span className="text-slate-500 text-xs">
            {selectedExpertIds.length} selected (min 2, max 7)
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {EXPERT_POOL.map((expert) => {
            const isSelected = selectedExpertIds.includes(expert.id)
            return (
              <button
                key={expert.id}
                onClick={() => toggleExpert(expert.id)}
                title={expert.title}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? `${expert.color} border-current bg-current/10 ring-2 ring-current/40`
                    : 'text-slate-400 border-slate-700 bg-slate-800 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                <img
                  src={expert.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full bg-slate-700 flex-shrink-0"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
                <span className="whitespace-nowrap">{expert.name.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Policy text + run button */}
      <PolicyInput />

      {/* ------------------------------------------------------------------ */}
      {/* Expert cards grid                                                   */}
      {/* ------------------------------------------------------------------ */}
      {hasMembers && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((member) => (
            <AgentCard
              key={member.id}
              member={member}
              isSpeaking={speakingExpertId === member.id}
            />
          ))}
        </div>
      )}

      {/* Empty state — shown before first debate */}
      {!isComplete && !isDebating && !hasMembers && (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center text-slate-500">
            <div className="text-4xl mb-3 select-none">⚖️</div>
            <p className="text-sm leading-relaxed">
              Select experts above and start the live debate
              <br />
              to see adversarial analysis of this policy
            </p>
          </div>
        </div>
      )}

      {/* Synthesis report — appears after all members complete */}
      <SeverityReport />
    </div>
  )
}
