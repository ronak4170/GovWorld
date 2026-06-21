import { useState, useRef, useCallback } from 'react'
import { SpeechRecognizer, speak, stopSpeaking, isSpeechRecognitionSupported } from '@/lib/speech'
import { generateVoiceResponse } from '@/lib/llm'

export interface Message {
  role: 'user' | 'citizen'
  content: string
}

export function useSpeech(citizen: any, simulationContext: string) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const recognizerRef = useRef<SpeechRecognizer | null>(null)

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return
    setIsListening(true)
    recognizerRef.current = new SpeechRecognizer({
      onTranscript: (text) => setInterimTranscript(text),
      onSilence: async (text) => {
        setIsListening(false)
        setInterimTranscript('')
        setMessages((m) => [...m, { role: 'user', content: text }])
        try {
          const history = messages.map((m) => ({ role: m.role === 'citizen' ? 'assistant' : 'user', content: m.content }))
          const response = await generateVoiceResponse(citizen, text, history, simulationContext)
          setMessages((m) => [...m, { role: 'citizen', content: response }])
          setIsSpeaking(true)
          speak(response, { onEnd: () => setIsSpeaking(false) })
        } catch {
          stopListening()
        }
      },
    })
    recognizerRef.current.start()
  }, [citizen, messages, simulationContext])

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const stopAll = useCallback(() => {
    stopListening()
    stopSpeaking()
    setIsSpeaking(false)
  }, [stopListening])

  return { isListening, isSpeaking, interimTranscript, messages, startListening, stopListening, stopAll }
}
