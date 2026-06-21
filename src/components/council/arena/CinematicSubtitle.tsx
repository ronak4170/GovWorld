import { EXPERT_POOL } from '@/store/councilStore'

interface Props {
  expertId: string | null
  text: string
  round: number
  visible?: boolean
}

export default function CinematicSubtitle({ expertId, text, round, visible = true }: Props) {
  if (!visible || !expertId || !text) return null

  const expert = EXPERT_POOL.find((e) => e.id === expertId)
  const colorClass = expert?.color ?? 'text-slate-300'

  return (
    <div className="absolute bottom-28 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
      <div
        className="w-full max-w-3xl rounded-xl border border-slate-700/60 px-6 py-4 backdrop-blur-md"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(15,23,42,0.92) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`text-xs font-semibold uppercase tracking-widest ${colorClass}`}
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            {expert?.name ?? expertId}
          </span>
          <span className="text-slate-600 text-[10px]">·</span>
          <span
            className="text-slate-500 text-[10px] uppercase tracking-wider"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            {expert?.title}
          </span>
          <span className="ml-auto text-slate-600 text-[10px] tabular-nums">Round {round}</span>
        </div>
        <p
          className="text-slate-100 text-base sm:text-lg leading-relaxed"
          style={{ fontFamily: '"Source Sans 3", sans-serif' }}
        >
          &ldquo;{text}&rdquo;
        </p>
      </div>
    </div>
  )
}
