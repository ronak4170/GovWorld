import { useState, useRef, useEffect, useCallback } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useCitizenStore } from '@/store/citizenStore'
import { useWorldStore } from '@/store/worldStore'
import { generateVoiceResponse } from '@/lib/llm'
import { STATUS_COLORS, STATUS_NARRATIVES } from '@/lib/constants'

interface Message {
  role: 'user' | 'citizen'
  content: string
}

export default function CitizenChat() {
  const voiceChatOpen = useUIStore((s) => s.voiceChatOpen)
  const closeVoiceChat = useUIStore((s) => s.closeVoiceChat)
  const selectedCitizenId = useUIStore((s) => s.selectedCitizenId)
  const getCitizenById = useCitizenStore((s) => s.getCitizenById)
  const currentMonth = useWorldStore((s) => s.currentMonth)

  const citizen = getCitizenById(selectedCitizenId ?? '')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset chat when citizen changes
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [selectedCitizenId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (voiceChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [voiceChatOpen])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !citizen) return

    const userText = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setIsLoading(true)

    try {
      const simulationContext = `Month ${currentMonth} of Van Ness Complete Streets construction. ${citizen.currentPolicyImpact}`
      const history = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      const response = await generateVoiceResponse(citizen, userText, history, simulationContext)
      setMessages((prev) => [...prev, { role: 'citizen', content: response }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'citizen', content: citizen.currentPolicyImpact },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, citizen, messages, currentMonth])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!voiceChatOpen || !citizen) return null

  const statusColors = STATUS_COLORS[citizen.statusColor]
  const firstName = citizen.name.split(' ')[0]
  const statusNarrative = STATUS_NARRATIVES[citizen.statusColor] ?? ''

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 sm:pr-6"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeVoiceChat}
      />

      {/* Chat window */}
      <div
        className="relative w-full sm:w-[400px] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{
          height: '560px',
          backgroundColor: '#000000',
          border: '1px solid #1a1a1a',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{
            backgroundColor: '#000000',
            borderColor: '#1a1a1a',
          }}
        >
          {/* Avatar + status dot */}
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {citizen.avatarEmoji}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${statusColors.bg}`}
              style={{ borderColor: '#000000' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: '#ffffff' }}>
              {citizen.name}
            </div>
            <div className="text-xs truncate" style={{ color: '#757575' }}>
              {citizen.occupation}
              {currentMonth > 0 && <span> · Month {currentMonth}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status pill */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors.text}`}
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid currentColor` }}
            >
              {citizen.statusColor.toUpperCase()}
            </span>
            <button
              onClick={closeVoiceChat}
              className="text-xl leading-none transition-colors"
              style={{ color: '#757575' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#757575')}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
          {/* Opening context pill */}
          {messages.length === 0 && (
            <div className="text-center">
              <div
                className="inline-block text-xs px-3 py-1.5 rounded-full mb-3"
                style={{ backgroundColor: '#1a1a1a', color: '#757575' }}
              >
                {statusNarrative}
              </div>
              <div
                className="text-xs text-center mx-4 italic"
                style={{ color: '#757575' }}
              >
                Ask {firstName} how the Van Ness construction is affecting their life
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role === 'citizen' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: '#1a1a1a' }}
                >
                  {citizen.avatarEmoji}
                </div>
              )}

              {/* Bubble */}
              <div
                className="max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        backgroundColor: '#76b900',
                        color: '#fff',
                        borderRadius: '18px 18px 4px 18px',
                      }
                    : {
                        backgroundColor: '#1a1a1a',
                        color: '#ffffff',
                        border: '1px solid #1a1a1a',
                        borderRadius: '18px 18px 18px 4px',
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: '#1a1a1a' }}
              >
                {citizen.avatarEmoji}
              </div>
              <div
                className="px-4 py-3 rounded-2xl"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '18px 18px 18px 4px',
                }}
              >
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#757575', animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#757575', animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#757575', animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input footer */}
        <div
          className="flex-shrink-0 px-3 py-3 border-t flex gap-2 items-end"
          style={{ backgroundColor: '#000000', borderColor: '#1a1a1a' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${firstName} anything...`}
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #1a1a1a',
              color: '#ffffff',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#76b900')}
            onBlur={(e) => (e.target.style.borderColor = '#1a1a1a')}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              backgroundColor: input.trim() && !isLoading ? '#76b900' : '#1a1a1a',
              color: input.trim() && !isLoading ? '#fff' : '#757575',
              border: '1px solid #1a1a1a',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
