import type { DebateMember } from '@/store/councilStore'

interface Props {
  member: DebateMember
  isSpeaking?: boolean
  typedText?: string
}

function SeverityBar({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-red-500' : score >= 6 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 mt-3">
      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-300 tabular-nums">{score}/10</span>
    </div>
  )
}

export default function AgentCard({ member, isSpeaking = false, typedText }: Props) {
  const severityColor =
    member.severityScore >= 8
      ? 'text-red-400 bg-red-900/20 border-red-800/40'
      : member.severityScore >= 6
      ? 'text-amber-400 bg-amber-900/20 border-amber-800/40'
      : 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40'

  // Displayed text: during live debate we use typedText, otherwise the stored argument
  const displayText = typedText !== undefined ? typedText : member.argument

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 relative ${
        isSpeaking
          ? 'border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.25)] animate-pulse-border'
          : member.isStreaming
          ? 'border-blue-700/60 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
          : 'border-slate-700'
      }`}
    >
      {/* "Now speaking" badge */}
      {isSpeaking && (
        <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          Now speaking
        </div>
      )}

      {/* Speech bubble above content — visible while speaking */}
      {isSpeaking && displayText && (
        <div className="bg-slate-800 border border-blue-700/50 rounded-lg px-3 py-2 text-slate-200 text-xs leading-relaxed relative">
          {displayText}
          <span className="inline-block w-0.5 h-3 bg-blue-400 ml-0.5 animate-pulse align-middle" />
          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-6 w-3 h-2 overflow-hidden">
            <div className="w-3 h-3 bg-slate-800 border-l border-b border-blue-700/50 rotate-45 translate-y-[-50%] translate-x-[2px]" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Round avatar image */}
          <img
            src={member.avatarUrl}
            alt={member.name}
            width={50}
            height={50}
            className="rounded-full flex-shrink-0 bg-slate-700 border border-slate-600"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <div>
            <div className={`text-sm font-semibold ${member.color}`}>{member.name}</div>
            <div className="text-slate-400 text-xs font-medium">{member.title}</div>
            <div className="text-slate-500 text-xs mt-0.5">{member.stance}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {member.isComplete && member.severityLabel && (
            <div
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${severityColor} text-center leading-tight whitespace-nowrap`}
            >
              {member.severityLabel}
            </div>
          )}

          {member.isStreaming && !member.isComplete && !isSpeaking && (
            <div className="flex gap-0.5 mt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Argument body — hidden while speech bubble is active */}
      {!isSpeaking && (
        <div className="flex-1 min-h-[80px]">
          {displayText ? (
            <p className="text-slate-300 text-xs leading-relaxed">{displayText}</p>
          ) : (
            <p className="text-slate-600 text-xs italic">Awaiting analysis...</p>
          )}
        </div>
      )}

      {/* Placeholder height when speaking so card doesn't collapse */}
      {isSpeaking && !displayText && <div className="min-h-[40px]" />}

      {/* Cited evidence */}
      {member.isComplete && member.citedEvidence.length > 0 && !isSpeaking && (
        <div className="border-t border-slate-700/50 pt-3 space-y-1">
          {member.citedEvidence.map((ev, i) => (
            <div key={i} className="flex gap-1.5 text-xs text-slate-500">
              <span className="text-slate-600 flex-shrink-0">▸</span>
              <span>{ev}</span>
            </div>
          ))}
        </div>
      )}

      {/* Severity bar */}
      {member.isComplete && <SeverityBar score={member.severityScore} />}
    </div>
  )
}
