interface Props {
  isListening: boolean
  isSpeaking: boolean
  size?: 'sm' | 'lg'
}

export default function VoiceIndicator({ isListening, isSpeaking, size = 'lg' }: Props) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-10 h-10'
  const innerDim = size === 'lg' ? 'w-14 h-14' : 'w-7 h-7'

  if (!isListening && !isSpeaking) {
    return (
      <div className={`${dim} rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center`}>
        <span className={size === 'lg' ? 'text-3xl' : 'text-lg'}>🎤</span>
      </div>
    )
  }

  return (
    <div className={`${dim} relative flex items-center justify-center`}>
      {/* Outer pulse ring */}
      <div
        className={`absolute ${dim} rounded-full animate-ping ${
          isListening ? 'bg-blue-500/20' : 'bg-emerald-500/20'
        }`}
      />
      {/* Middle pulse ring */}
      <div
        className={`absolute ${dim} rounded-full animate-pulse ${
          isListening ? 'bg-blue-500/10' : 'bg-emerald-500/10'
        }`}
      />
      {/* Inner filled circle */}
      <div
        className={`${innerDim} rounded-full flex items-center justify-center ${
          isListening ? 'bg-blue-600' : 'bg-emerald-600'
        }`}
      >
        <span className={size === 'lg' ? 'text-2xl' : 'text-sm'}>
          {isListening ? '🎤' : '🔊'}
        </span>
      </div>
    </div>
  )
}
