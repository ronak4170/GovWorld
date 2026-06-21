// Voice types — owned by Voice Agent
// Represents the citizen voice chat system described in CLAUDE.md Section 9

export type VoiceMessageRole = 'user' | 'citizen'

export type VoiceState =
  | 'idle'
  | 'listening'       // Microphone active, capturing speech
  | 'processing'      // Speech-to-text done, sending to LLM
  | 'speaking'        // TTS playing back citizen response
  | 'error'

export interface VoiceMessage {
  id: string
  role: VoiceMessageRole
  text: string                  // Transcript of what was said
  timestamp: string             // ISO datetime
  durationMs?: number           // How long the audio was (for TTS playback tracking)
  citizenId?: string            // Set on 'citizen' role messages — which citizen spoke
}

export interface ConversationHistory {
  citizenId: string
  startedAt: string             // ISO datetime
  endedAt?: string              // ISO datetime — set when conversation ends
  messages: VoiceMessage[]
  currentTick: number           // Which simulation month this conversation happened in
  isActive: boolean
}

export interface VoiceChatSession {
  conversationHistory: ConversationHistory | null
  voiceState: VoiceState
  interimTranscript: string     // Real-time partial transcript from Web Speech API
  errorMessage?: string
  isVoiceSupported: boolean     // Whether Web Speech API is available in this browser
  isMicPermissionGranted: boolean
}

// Groq API message format for conversation history
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
