import { useEffect, useRef } from 'react'
import type { Message } from '@/hooks/useSpeech'

interface Props {
  messages: Message[]
  interimTranscript: string
  citizenName: string
  citizenEmoji: string
}

export default function TranscriptPanel({ messages, interimTranscript, citizenName, citizenEmoji }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, interimTranscript])

  if (messages.length === 0 && !interimTranscript) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center p-4">
        <div>
          <div className="text-3xl mb-2">{citizenEmoji}</div>
          <p>
            Click the microphone and speak.
            <br />
            {citizenName} will respond in character.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, idx) => (
        <div
          key={`${msg.role}-${idx}`}
          className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <div className="flex-shrink-0 text-lg">
            {msg.role === 'user' ? '👤' : citizenEmoji}
          </div>
          <div
            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-900/50 text-blue-100 border border-blue-800/40'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {/* Interim transcript — user is still speaking */}
      {interimTranscript && (
        <div className="flex gap-2 flex-row-reverse">
          <div className="flex-shrink-0 text-lg">👤</div>
          <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-blue-900/20 text-blue-300 border border-blue-800/30 italic">
            {interimTranscript}...
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
