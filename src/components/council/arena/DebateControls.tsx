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

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      {/* Progress bar */}
      <div className="h-0.5 bg-slate-800">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div
        className="flex items-center gap-3 px-4 py-3 border-t border-slate-800/80 backdrop-blur-md"
        style={{ background: 'rgba(0,0,0,0.75)' }}
      >
        <button
          onClick={onExit}
          className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-500 transition-colors cursor-pointer"
          aria-label="Exit debate"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isComplete && (
          <>
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={playbackState === 'idle'}
              className="flex items-center justify-center w-11 h-11 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>

            <button
              onClick={onSkip}
              disabled={!isPlaying && playbackState !== 'paused'}
              className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              aria-label="Skip to next point"
              title="Skip to next point"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm2-6l8.5 6V6L8 12zm8.5 6V6H18v12h-1.5z" />
              </svg>
            </button>

            <button
              onClick={onSkipToEnd}
              disabled={!isPlaying && playbackState !== 'paused'}
              className="flex items-center justify-center px-3 h-11 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-40 transition-colors cursor-pointer text-xs font-semibold gap-1"
              aria-label="Skip to verdict"
              title="Skip to verdict"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
              Verdict
            </button>
          </>
        )}

        <button
          onClick={onToggleMute}
          className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        <div className="flex-1 text-center">
          <span
            className="text-slate-500 text-xs uppercase tracking-widest"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            {isComplete ? 'Debate Complete' : `Round ${round} / ${maxRound}`}
          </span>
        </div>

        <div className="text-slate-600 text-xs tabular-nums w-12 text-right">
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  )
}
