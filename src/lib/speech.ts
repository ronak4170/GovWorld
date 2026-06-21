// Web Speech API wrapper for GOVWORLD voice chat

export interface SpeechConfig {
  lang?: string
  silenceThresholdMs?: number
  onTranscript?: (text: string, isFinal: boolean) => void
  onSilence?: (finalTranscript: string) => void
  onError?: (error: string) => void
}

export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window
}

export class SpeechRecognizer {
  private recognition: any
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private accumulatedTranscript = ''
  private config: SpeechConfig

  constructor(config: SpeechConfig) {
    this.config = config
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) throw new Error('SpeechRecognition not supported')
    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = config.lang ?? 'en-US'
    this.recognition.onresult = this.handleResult.bind(this)
    this.recognition.onerror = (e: any) => config.onError?.(e.error)
  }

  private handleResult(event: any) {
    let interim = ''
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript
      if (event.results[i].isFinal) final += t
      else interim += t
    }
    if (final) this.accumulatedTranscript += final
    this.config.onTranscript?.(this.accumulatedTranscript + interim, false)
    this.resetSilenceTimer()
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
    this.silenceTimer = setTimeout(() => {
      const text = this.accumulatedTranscript.trim()
      if (text) {
        this.config.onSilence?.(text)
        this.accumulatedTranscript = ''
      }
    }, this.config.silenceThresholdMs ?? 1500)
  }

  start() { this.recognition.start() }
  stop() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
    this.recognition.stop()
  }
}

export function speak(
  text: string,
  options?: {
    rate?: number
    pitch?: number
    lang?: string
    voice?: SpeechSynthesisVoice
    onEnd?: () => void
  },
): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = options?.rate ?? 0.95
  utterance.pitch = options?.pitch ?? 1.0
  utterance.lang = options?.lang ?? 'en-US'
  if (options?.voice) {
    utterance.voice = options.voice
  } else {
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find((v) => v.lang.startsWith('en-US')) ?? voices.find((v) => v.lang.startsWith('en'))
    if (preferred) utterance.voice = preferred
  }
  if (options?.onEnd) utterance.onend = options.onEnd
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel()
}

/** Call once on app load so Web Speech voices are ready for debate TTS */
export function preloadSpeechVoices(): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}
