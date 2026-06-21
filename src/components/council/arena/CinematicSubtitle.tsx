import { EXPERT_POOL } from '@/store/councilStore'

interface Props {
  expertId: string | null
  text: string
  round: number
  visible?: boolean
}

const WAVE_DELAYS = ['0.1s', '0.3s', '0.2s', '0.5s', '0.4s', '0.6s', '0.35s', '0.15s']

export default function CinematicSubtitle({ expertId, text, visible = true }: Props) {
  if (!visible || !expertId) return null

  const expert = EXPERT_POOL.find((e) => e.id === expertId)

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-full max-w-3xl px-4 pointer-events-none">
      <div className="glass-panel rounded-xl px-6 py-4 flex items-center gap-6">
        {/* Waveform */}
        <div className="flex items-end gap-1 h-8 w-16 flex-shrink-0">
          {WAVE_DELAYS.map((delay, i) => (
            <span
              key={i}
              className="waveform-bar w-1 rounded-full"
              style={{ backgroundColor: '#76b900', animationDelay: delay }}
            />
          ))}
        </div>

        {/* Speech text */}
        <div className="min-w-0">
          <span className="block mb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#76b900' }}>
            {expert ? `${expert.name} · ${expert.title}` : 'Analyzing speech'}
          </span>
          <p className="text-[15px] leading-snug italic" style={{ color: '#a7a7a7' }}>
            {text ? `“${text}”` : '…'}
          </p>
        </div>
      </div>
    </div>
  )
}
