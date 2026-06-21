# AGENT_VOICE — Citizen Voice Chat Agent Specification
## GOVWORLD | Voice Conversation System Owner

---

## YOUR IDENTITY
You are the Voice Agent. You own the single most emotionally powerful feature in GOVWORLD: the ability to click on any citizen dot and have a real voice conversation with them. When a judge hears Maria Santos say "I missed my daughter's school pickup again this week" in her own voice — that is you. Make it feel real.

## FILES YOU OWN
```
src/components/voice/CitizenChat.tsx
src/components/voice/VoiceIndicator.tsx
src/components/voice/TranscriptPanel.tsx
src/lib/speech.ts
src/hooks/useSpeech.ts
src/types/voice.ts                  ← create this
```

## FILES YOU MUST NEVER EDIT
```
src/components/map/**
src/components/citizens/**
src/components/council/**
src/components/simulation/**
src/components/ledger/**
src/store/worldStore.ts
src/store/citizenStore.ts
src/store/councilStore.ts
src/store/simulationStore.ts
src/store/ledgerStore.ts
src/lib/cesium.ts
```

## FILES YOU READ (never write)
```
src/store/citizenStore.ts           ← read selected citizen profile + current status
src/store/simulationStore.ts        ← read currentTick for context
src/store/uiStore.ts                ← read/write voiceChatOpen state
src/lib/llm.ts                      ← call generateVoiceResponse
```

---

## TASK 1 — Voice Types (`src/types/voice.ts`)

```typescript
export interface VoiceMessage {
  id: string
  role: 'user' | 'citizen'
  content: string
  timestamp: string
  audioUrl?: string                 // For future TTS storage
}

export interface VoiceSession {
  citizenId: string
  messages: VoiceMessage[]
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  currentTranscript: string         // Live partial transcript while listening
  error: string | null
  startedAt: string
}

export interface SpeechConfig {
  lang: string                      // e.g. 'en-IN' for Indian English
  continuous: boolean
  interimResults: boolean
  silenceThreshold: number          // ms of silence before auto-submit (1500ms)
}

export interface TTSConfig {
  voice: string                     // SpeechSynthesis voice name
  rate: number                      // 0.8–1.2
  pitch: number                     // 0.8–1.1
  volume: number                    // 0–1
}
```

---

## TASK 2 — Speech Library (`src/lib/speech.ts`)

### Implement all speech functionality here — no component should use Web Speech API directly

```typescript
// Speech Recognition (user input)
export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null
  private silenceTimer: NodeJS.Timeout | null = null
  
  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }
  
  start(config: SpeechConfig, callbacks: {
    onInterim: (transcript: string) => void
    onFinal: (transcript: string) => void
    onError: (error: string) => void
    onSilence: (transcript: string) => void  // Called after silenceThreshold ms
  }): void {
    if (!this.isSupported()) {
      callbacks.onError('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()
    this.recognition.lang = config.lang           // 'en-IN'
    this.recognition.continuous = config.continuous
    this.recognition.interimResults = config.interimResults
    
    let finalTranscript = ''
    
    this.recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
          callbacks.onFinal(finalTranscript)
        } else {
          interim = transcript
          callbacks.onInterim(interim)
        }
      }
      
      // Reset silence timer on any speech
      if (this.silenceTimer) clearTimeout(this.silenceTimer)
      this.silenceTimer = setTimeout(() => {
        if (finalTranscript.trim()) {
          callbacks.onSilence(finalTranscript.trim())
          finalTranscript = ''
        }
      }, config.silenceThreshold)
    }
    
    this.recognition.onerror = (event) => {
      callbacks.onError(`Speech error: ${event.error}`)
    }
    
    this.recognition.start()
  }
  
  stop(): void {
    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
    }
  }
}

// Text-to-Speech (citizen output)
export class CitizenSpeaker {
  private synth = window.speechSynthesis
  private currentUtterance: SpeechSynthesisUtterance | null = null
  
  isSupported(): boolean {
    return 'speechSynthesis' in window
  }
  
  getVoiceForCitizen(citizen: { gender: string; id: string }): SpeechSynthesisVoice | null {
    const voices = this.synth.getVoices()
    
    // Prefer Indian English voices
    const indianVoice = voices.find(v => 
      v.lang === 'en-IN' && 
      (citizen.gender === 'female' ? v.name.includes('Female') : v.name.includes('Male'))
    )
    
    // Fall back to any English voice
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en') &&
      (citizen.gender === 'female' ? v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Victoria') : true)
    )
    
    return indianVoice ?? englishVoice ?? voices[0] ?? null
  }
  
  speak(text: string, config: TTSConfig, callbacks: {
    onStart: () => void
    onEnd: () => void
    onError: (error: string) => void
  }): void {
    if (!this.isSupported()) {
      callbacks.onError('Text-to-speech not supported')
      return
    }
    
    this.stop() // Cancel any current speech
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = config.rate
    utterance.pitch = config.pitch
    utterance.volume = config.volume
    
    // Set voice if specified
    const voices = this.synth.getVoices()
    const voice = voices.find(v => v.name === config.voice)
    if (voice) utterance.voice = voice
    
    utterance.onstart = callbacks.onStart
    utterance.onend = callbacks.onEnd
    utterance.onerror = (e) => callbacks.onError(e.error)
    
    this.currentUtterance = utterance
    this.synth.speak(utterance)
  }
  
  stop(): void {
    this.synth.cancel()
    this.currentUtterance = null
  }
  
  isPaused(): boolean {
    return this.synth.paused
  }
}

// Voice config per citizen (call this to get the right voice for each person)
export function getVoiceConfigForCitizen(citizen: Citizen): TTSConfig {
  const configs: Record<string, Partial<TTSConfig>> = {
    'C001': { rate: 1.05, pitch: 1.05 },  // Maria — slightly faster, slightly higher
    'C002': { rate: 0.88, pitch: 0.90 },  // Ravi — slower, lower
    'C003': { rate: 1.10, pitch: 1.10 },  // Priya — bright, quick
    'C004': { rate: 0.80, pitch: 0.85 },  // Arjun — slow, gentle
    'C005': { rate: 1.00, pitch: 1.00 },  // Fatima — measured
    'C006': { rate: 1.15, pitch: 1.05 },  // Dev — quick, enthusiastic
  }
  
  return {
    voice: '',          // Set by getVoiceForCitizen
    rate: 0.95,
    pitch: 1.0,
    volume: 0.9,
    ...(configs[citizen.id] ?? {}),
  }
}
```

---

## TASK 3 — Speech Hook (`src/hooks/useSpeech.ts`)

```typescript
export function useSpeech(citizenId: string) {
  const citizen = useCitizenStore(state => state.getCitizenById(citizenId))
  const currentTick = useSimulationStore(state => state.currentTick)
  
  const [session, setSession] = useState<VoiceSession>({
    citizenId,
    messages: [],
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentTranscript: '',
    error: null,
    startedAt: new Date().toISOString(),
  })
  
  const recognizer = useRef(new SpeechRecognizer())
  const speaker = useRef(new CitizenSpeaker())
  
  // Start listening
  const startListening = useCallback(() => {
    setSession(s => ({ ...s, isListening: true, currentTranscript: '', error: null }))
    
    recognizer.current.start(
      { lang: 'en-IN', continuous: true, interimResults: true, silenceThreshold: 1500 },
      {
        onInterim: (text) => setSession(s => ({ ...s, currentTranscript: text })),
        onFinal: (text) => setSession(s => ({ ...s, currentTranscript: text })),
        onError: (err) => setSession(s => ({ ...s, error: err, isListening: false })),
        onSilence: (text) => {
          // User stopped talking — send to LLM
          stopListening()
          sendMessage(text)
        },
      }
    )
  }, [citizenId])
  
  // Stop listening
  const stopListening = useCallback(() => {
    recognizer.current.stop()
    setSession(s => ({ ...s, isListening: false }))
  }, [])
  
  // Send message to citizen and get response
  const sendMessage = useCallback(async (userText: string) => {
    if (!citizen || !userText.trim()) return
    
    const userMsg: VoiceMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    }
    
    setSession(s => ({
      ...s,
      messages: [...s.messages, userMsg],
      isProcessing: true,
      currentTranscript: '',
    }))
    
    try {
      // Build simulation context for LLM
      const simulationContext = buildSimulationContext(citizen, currentTick, session.messages)
      
      // Call LLM (Groq for speed)
      const response = await generateVoiceResponse(citizen, userText, simulationContext)
      
      const citizenMsg: VoiceMessage = {
        id: crypto.randomUUID(),
        role: 'citizen',
        content: response,
        timestamp: new Date().toISOString(),
      }
      
      setSession(s => ({
        ...s,
        messages: [...s.messages, citizenMsg],
        isProcessing: false,
        isSpeaking: true,
      }))
      
      // Speak the response
      const voiceConfig = getVoiceConfigForCitizen(citizen)
      const voice = speaker.current.getVoiceForCitizen(citizen)
      if (voice) voiceConfig.voice = voice.name
      
      speaker.current.speak(response, voiceConfig, {
        onStart: () => setSession(s => ({ ...s, isSpeaking: true })),
        onEnd: () => {
          setSession(s => ({ ...s, isSpeaking: false }))
          // Auto-restart listening after citizen speaks
          setTimeout(() => startListening(), 500)
        },
        onError: (err) => setSession(s => ({ ...s, isSpeaking: false, error: err })),
      })
      
    } catch (error) {
      setSession(s => ({
        ...s,
        isProcessing: false,
        error: 'Connection error — please try again',
      }))
    }
  }, [citizen, currentTick, session.messages])
  
  // Text fallback (for when speech API unavailable)
  const sendTextMessage = useCallback((text: string) => {
    sendMessage(text)
  }, [sendMessage])
  
  // Cleanup
  useEffect(() => {
    return () => {
      recognizer.current.stop()
      speaker.current.stop()
    }
  }, [])
  
  return {
    session,
    startListening,
    stopListening,
    sendTextMessage,
    isSpeechSupported: recognizer.current.isSupported(),
  }
}

function buildSimulationContext(citizen: Citizen, currentTick: number, history: VoiceMessage[]): string {
  const statusNarrative = {
    green: 'Things are relatively okay for you right now.',
    amber: 'You are under significant pressure and strain.',
    red: 'You are in crisis. Things are very hard right now.',
    grey: 'You have been displaced or your situation has collapsed.',
  }[citizen.statusColor]
  
  const recentHistory = history.slice(-4)
    .map(m => `${m.role === 'user' ? 'User' : citizen.name}: ${m.content}`)
    .join('\n')
  
  return `
Current simulation month: ${currentTick} of 12
Your current status: ${citizen.statusColor.toUpperCase()} — ${statusNarrative}
What's happening to you right now: ${citizen.currentPolicyImpact}
${citizen.isWorker ? `You are currently assigned to construction task: ${citizen.assignedTaskId}` : ''}

Recent conversation (for context):
${recentHistory || 'This is the start of the conversation.'}
  `.trim()
}
```

---

## TASK 4 — Citizen Chat Component (`src/components/voice/CitizenChat.tsx`)

### Layout (full modal overlay)
```
┌─────────────────────────────────────────────┐
│  [← Close]          Talking to Maria Santos  │
│                                              │
│  🚌 Maria Santos  •  🟡 Under pressure       │
│  "Month 4: Route +40 min. Missed pickup."    │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│  [User]:  How is the road construction       │
│           affecting you?                     │
│                                              │
│  [🚌 Maria]:  "It's been really hard.        │
│  My bus route now takes 40 minutes longer    │
│  each way. Last week I missed picking up     │
│  Priya from school twice — she waited        │
│  alone until a neighbour saw her..."         │
│                                              │
│ ─────────────────────────────────────────── │
│                                              │
│   [ 🎤 Speaking... ]                         │
│   "what do you think about..."               │
│                                              │
│  [Tap to speak]    [Type instead]            │
└─────────────────────────────────────────────┘
```

### States
1. **Idle:** "Tap to speak" button, microphone icon
2. **Listening:** Animated waveform, live transcript appearing
3. **Processing:** Spinner, "Maria is thinking..."
4. **Speaking:** Animated citizen avatar, waveform for audio output
5. **Error:** Error message + retry button + "Type instead" option

### Text fallback
- Always show "Type instead" link
- Text input appears when clicked
- Sends via Enter or send button
- Same LLM call, no TTS (or basic TTS if available)

### Conversation context shown at top
- Citizen name, emoji, status dot
- Current policy impact statement (updates as ticks advance)
- Small label showing current simulation month

---

## TASK 5 — Voice Indicator (`src/components/voice/VoiceIndicator.tsx`)

### Three visual states
```typescript
// Listening state — animated bars
<div className="flex gap-1 items-end">
  {[1,2,3,4,5].map(i => (
    <div key={i} className="w-1 bg-blue-400 rounded animate-voice-bar" style={{animationDelay: `${i*0.1}s`}} />
  ))}
</div>

// Speaking state — circular pulse
<div className="w-12 h-12 rounded-full bg-emerald-500/20 animate-ping" />
<div className="w-8 h-8 rounded-full bg-emerald-500 absolute" />

// Processing state — spinning ring
<div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-blue-400 animate-spin" />
```

Add these to `tailwind.config.ts`:
```javascript
animation: {
  'voice-bar': 'voiceBar 0.8s ease-in-out infinite alternate',
}
keyframes: {
  voiceBar: {
    '0%': { height: '4px' },
    '100%': { height: '24px' },
  }
}
```

---

## TASK 6 — Pre-computed Voice Responses (DEMO_MODE)

In DEMO_MODE, do not make Groq API calls. Instead, load canned responses for the 6 featured citizens. Store in a JSON file that you manage: `src/data/demo_voice_responses.json`

### Minimum pre-computed exchanges (implement all 6 × 3 questions)

**For every featured citizen (C001–C006), pre-compute responses to:**
1. "How is the road construction affecting you?"
2. "What do you think the government should have done differently?"
3. "What happens if things stay like this?"

**C001 Maria Santos — sample:**
```json
{
  "C001": {
    "q1": "Honestly? My life has become much harder since construction started. My bus route now takes 40 minutes longer each way — that's over an hour extra every single day. Last week I missed picking up Priya from school twice. She's only 7, bhaiya. She was standing there alone. My neighbour Sharda aunty saw her and stayed with her, but... it's not right. I'm doing everything I can but this road is making it impossible.",
    "q2": "They should have told us first. Haan? Just come, talk to us. Tell us what's happening, when it will be done, what bus routes will change. Instead we found out when the orange fencing appeared one morning. No letter, no meeting, nothing. And the cycling lane is gone now — my colleague Dev had to stop cycling. At least consult before you decide.",
    "q3": "I can't do this for much longer. If this goes on another few months, I'll have to find a place closer to work — maybe in Kurla — even though rent is higher. My children can't be left alone every evening. I'm their mother. This road is more important than my family's routine? That doesn't seem right to me.",
    "general": "You know, I've been driving this route for six years. I know every pothole, every signal. Now I don't recognise it anymore. I just want to pick up my children on time. Is that too much to ask?"
  }
}
```

Generate equivalent responses for C002 (Ravi), C003 (Priya), C004 (Arjun), C005 (Fatima), C006 (Dev) — each in their distinct voice as specified in their persona.

When user asks a question not matching pre-computed ones → use Groq API (or fall back to a graceful "connection error" in DEMO_MODE).

---

## ACCEPTANCE CRITERIA — Voice Agent Complete When:

- [ ] `useSpeech` hook manages full conversation lifecycle without memory leaks
- [ ] SpeechRecognizer starts listening, captures speech, fires onSilence after 1.5s gap
- [ ] CitizenSpeaker speaks citizen responses in appropriate voice
- [ ] CitizenChat modal opens correctly when citizen is selected and "Talk" button clicked
- [ ] All 3 states (listening/processing/speaking) show correct UI
- [ ] Text fallback works identically to voice input
- [ ] Pre-computed responses load from demo_voice_responses.json in DEMO_MODE
- [ ] Conversation history is maintained within a session
- [ ] Modal closes cleanly and stops microphone on close
- [ ] Chrome and Edge both work (Safari may not — note this in a comment)
- [ ] Zero TypeScript errors
