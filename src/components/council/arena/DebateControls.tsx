interface Props {
  playbackState: 'idle' | 'playing' | 'paused' | 'complete'
  progress: number
  round: number
  maxRound: number
  isMuted: boolean
  onPlay: () => void
  onPause: () => void
  onSkip: () => void
  onSkipToEnd: () => void
  onToggleMute: () => void
  onExit: () => void
}

const ICON_BTN =
  'flex items-center justify-center w-11 h-11 rounded-lg transition-all active:scale-95 cursor-pointer'

export default function DebateControls({
  playbackState,
  progress,
  round,
  maxRound,
  isMuted,
  onPlay,
  onPause,
  onSkip,
  onSkipToEnd,
  onToggleMute,
  onExit,
}: Props) {
  const isPlaying = playbackState === 'playing'
  const isComplete = playbackState === 'complete'
  const pct = Math.round(progress * 100)

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      {/* Session progress bar */}
      <div className="px-8 pb-2 pt-1">
        <div className="flex justify-between items-center px-1 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#a78b7d' }}>
            Session Progress
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] tabular-nums" style={{ color: '#f6ded3' }}>
            {isComplete ? 'Complete' : `Round ${round} / ${maxRound}`} · {pct}%
          </span>
        </div>
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(64,50,42,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            className="h-full relative transition-all duration-300"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #ffb690 0%, #f97316 100%)' }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-8 blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
      </div>

      {/* Transport bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-t backdrop-blur-md"
        style={{ borderColor: 'rgba(88,66,55,0.4)', background: 'rgba(15,17,23,0.7)' }}
      >
        <button
          onClick={onExit}
          className={ICON_BTN}
          style={{ border: '1px solid #584237', color: '#a78b7d' }}
          aria-label="Exit debate"
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffb690')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#a78b7d')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>

        {!isComplete && (
          <>
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={playbackState === 'idle'}
              className={ICON_BTN + ' disabled:opacity-40'}
              style={{ backgroundColor: '#f97316', color: '#552100' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              onClick={onSkip}
              disabled={!isPlaying && playbackState !== 'paused'}
              className={ICON_BTN + ' disabled:opacity-40'}
              style={{ border: '1px solid #584237', color: '#e0c0b1' }}
              aria-label="Skip to next point"
              title="Skip to next point"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>skip_next</span>
            </button>

            <button
              onClick={onSkipToEnd}
              disabled={!isPlaying && playbackState !== 'paused'}
              className="flex items-center justify-center gap-1 px-3 h-11 rounded-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer text-xs font-semibold"
              style={{ border: '1px solid #584237', color: '#e0c0b1' }}
              aria-label="Skip to verdict"
              title="Skip to verdict"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fast_forward</span>
              Verdict
            </button>
          </>
        )}

        <button
          onClick={onToggleMute}
          className={ICON_BTN}
          style={{ border: '1px solid #584237', color: '#e0c0b1' }}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>

        <div className="flex-1 text-center">
          <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#584237' }}>
            {isComplete ? 'Debate Complete' : 'Live Council Simulation'}
          </span>
        </div>

        <div className="text-xs tabular-nums w-12 text-right" style={{ color: '#a78b7d' }}>
          {pct}%
        </div>
      </div>
    </div>
  )
}
