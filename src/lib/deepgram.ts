import { speak, stopSpeaking } from '@/lib/speech'

/**
 * Deepgram Aura-2 — much more natural / human than Aura-1.
 * Picked for clarity + conversational tone (storytelling / interview / informative).
 * @see https://developers.deepgram.com/docs/tts-models
 */
export const DEEPGRAM_VOICE_MAP: Record<string, string> = {
  economist: 'aura-2-jupiter-en',    // knowledgeable baritone — informative
  advocate: 'aura-2-vesta-en',       // natural, empathetic — storytelling
  engineer: 'aura-2-athena-en',      // calm, professional — storytelling
  watchdog: 'aura-2-orpheus-en',     // clear, trustworthy — storytelling
  climate: 'aura-2-cora-en',         // smooth, caring — storytelling
  lawyer: 'aura-2-hera-en',          // warm, professional — informative
  urbanplanner: 'aura-2-apollo-en',  // comfortable, casual chat
  health: 'aura-2-helena-en',        // caring, natural, friendly
  transport: 'aura-2-orion-en',      // calm, approachable — informative
  heritage: 'aura-2-minerva-en',    // friendly, natural — storytelling
}

/** Slightly slower = clearer, more human (Deepgram speed range 0.7–1.5) */
const SPEECH_SPEED = 0.92

/** Browser fallback — near-neutral pitch/rate; distinct voice per expert */
const BROWSER_VOICE_PROFILES: Record<string, { pitch: number; rate: number; voiceSlot: number }> = {
  economist: { pitch: 0.95, rate: 0.88, voiceSlot: 0 },
  advocate: { pitch: 1.0, rate: 0.9, voiceSlot: 1 },
  engineer: { pitch: 1.05, rate: 0.88, voiceSlot: 2 },
  watchdog: { pitch: 0.92, rate: 0.87, voiceSlot: 3 },
  climate: { pitch: 1.02, rate: 0.9, voiceSlot: 4 },
  lawyer: { pitch: 1.08, rate: 0.86, voiceSlot: 5 },
  urbanplanner: { pitch: 0.98, rate: 0.91, voiceSlot: 6 },
  health: { pitch: 1.06, rate: 0.89, voiceSlot: 7 },
  transport: { pitch: 0.94, rate: 0.9, voiceSlot: 8 },
  heritage: { pitch: 1.0, rate: 0.88, voiceSlot: 9 },
}

const NATURAL_BROWSER_VOICE_HINTS = [
  'Samantha',
  'Google US English',
  'Google UK English',
  'Karen',
  'Daniel',
  'Alex',
  'Victoria',
  'Microsoft Zira',
  'Microsoft David',
  'Moira',
  'Tessa',
  'Veena',
  'Rishi',
]

export function getDeepgramApiKey(): string | undefined {
  return import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined
}

export function getExpertVoiceId(expertId: string): string {
  return DEEPGRAM_VOICE_MAP[expertId] ?? 'aura-2-orion-en'
}

export interface SpeakResult {
  durationMs: number
  usedFallback: boolean
}

/** Make policy jargon readable aloud — stops the "cryptic robot" effect */
export function prepareTextForSpeech(text: string): string {
  return (
    text
      // Currency & numbers
      .replace(/\$(\d+(?:\.\d+)?)\s*[Mm]\b/g, '$1 million dollars')
      .replace(/\$(\d+(?:\.\d+)?)\s*[Kk]\b/g, '$1 thousand dollars')
      .replace(/\$(\d+(?:,\d+)*)/g, '$1 dollars')
      .replace(/\b(\d+(?:\.\d+)?)\s*km\b/gi, '$1 kilometers')
      .replace(/\b(\d+(?:\.\d+)?)\s*mi\b/gi, '$1 miles')
      .replace(/\b(\d+(?:\.\d+)?)%/g, '$1 percent')
      // Acronyms & technical terms
      .replace(/\bPM2\.5\b/gi, 'fine particulate matter')
      .replace(/\bPM10\b/gi, 'particulate matter ten')
      .replace(/\bEIA\b/g, 'environmental impact assessment')
      .replace(/\bROI\b/g, 'return on investment')
      .replace(/\bADB\b/g, 'Asian Development Bank')
      .replace(/\bSFMTA\b/g, 'S F M T A')
      .replace(/\bDPW\b/g, 'D P W')
      .replace(/\bCEQA\b/g, 'C E Q A')
      .replace(/\bIVR\b/g, 'interactive voice response')
      .replace(/\bGIS\b/g, 'G I S')
      .replace(/\bIPCC\b/g, 'I P C C')
      // Punctuation that TTS reads oddly
      .replace(/—/g, ', ')
      .replace(/–/g, ', ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function estimateDurationMs(text: string): number {
  // ~150 words/min at natural pace
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max((words / 150) * 60_000, 1500)
}

function pickBrowserVoice(expertId: string): SpeechSynthesisVoice | undefined {
  const all = window.speechSynthesis.getVoices()
  const english = all.filter((v) => v.lang.startsWith('en'))
  if (english.length === 0) return undefined

  const natural = english.filter((v) =>
    NATURAL_BROWSER_VOICE_HINTS.some((hint) => v.name.includes(hint)),
  )
  const pool = natural.length >= 3 ? natural : english
  const profile = BROWSER_VOICE_PROFILES[expertId] ?? { pitch: 1, rate: 0.9, voiceSlot: 0 }
  return pool[profile.voiceSlot % pool.length]
}

function waitForSpeechSynthesis(text: string, expertId: string): Promise<number> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (ms: number) => {
      if (settled) return
      settled = true
      activeFallbackResolve = null
      resolve(ms)
    }
    const start = performance.now()
    const profile = BROWSER_VOICE_PROFILES[expertId] ?? { pitch: 1, rate: 0.9, voiceSlot: 0 }
    const voice = pickBrowserVoice(expertId)

    // Allow stopAllSpeech()/skip to resolve immediately.
    activeFallbackResolve = () => finish(performance.now() - start)

    speak(text, {
      lang: voice?.lang ?? 'en-US',
      rate: profile.rate,
      pitch: profile.pitch,
      voice,
      onEnd: () => finish(Math.max(performance.now() - start, estimateDurationMs(text))),
    })
    setTimeout(() => finish(estimateDurationMs(text)), estimateDurationMs(text) + 2000)
  })
}

let activeAudio: HTMLAudioElement | null = null
// Resolvers for any in-flight speech so that stopping/skipping always unblocks
// the awaiting orchestrator (previously pausing the audio left the promise hanging).
let activeAudioResolve: (() => void) | null = null
let activeFallbackResolve: (() => void) | null = null

export function stopAllSpeech(): void {
  stopSpeaking()
  if (activeFallbackResolve) {
    const r = activeFallbackResolve
    activeFallbackResolve = null
    r()
  }
  if (activeAudioResolve) {
    const r = activeAudioResolve
    activeAudioResolve = null
    r()
  }
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }
}

/** Group sentences into natural speech chunks (2–3 sentences) for better prosody */
export function chunkTextForNaturalSpeech(text: string, maxChars = 480): string[] {
  const prepared = prepareTextForSpeech(text)
  const sentences = prepared
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)

  if (sentences.length === 0) return prepared ? [prepared] : []

  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? ' ' : '') + sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

async function playDeepgramAudio(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<number | null> {
  const params = new URLSearchParams({
    model: voiceId,
    encoding: 'mp3',
    sample_rate: '24000',
    speed: String(SPEECH_SPEED),
  })

  const start = performance.now()

  // Fetch must not hang forever — if Deepgram is slow/blocked, bail fast and let
  // the caller fall back to browser speech so the debate keeps moving.
  const controller = new AbortController()
  const fetchTimer = setTimeout(() => controller.abort(), 8000)
  let res: Response
  try {
    res = await fetch(`https://api.deepgram.com/v1/speak?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
  } catch {
    return null
  } finally {
    clearTimeout(fetchTimer)
  }

  if (!res.ok) return null

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  return new Promise<number>((resolve) => {
    const audio = new Audio(url)
    activeAudio = audio
    audio.playbackRate = 1.0

    let finished = false
    const done = (ms: number) => {
      if (finished) return
      finished = true
      URL.revokeObjectURL(url)
      if (activeAudio === audio) activeAudio = null
      activeAudioResolve = null
      resolve(Math.max(ms, 800))
    }

    // Allow stopAllSpeech()/skip to resolve this promise immediately.
    activeAudioResolve = () => done(performance.now() - start)
    audio.onended = () => done(performance.now() - start)
    audio.onerror = () => done(performance.now() - start)
    audio.play().catch(() => done(performance.now() - start))
  })
}

async function speakSentenceCore(
  trimmed: string,
  expertId: string,
  options?: { muted?: boolean; apiKey?: string },
): Promise<SpeakResult> {
  const apiKey = options?.apiKey ?? getDeepgramApiKey()
  const voiceId = getExpertVoiceId(expertId)

  if (apiKey) {
    try {
      const durationMs = await playDeepgramAudio(trimmed, voiceId, apiKey)
      if (durationMs !== null) {
        return { durationMs, usedFallback: false }
      }
      // Retry with Aura-1 fallback voice if Aura-2 model unavailable
      const legacyVoice = voiceId.replace('aura-2-', 'aura-')
      if (legacyVoice !== voiceId) {
        const legacyMs = await playDeepgramAudio(trimmed, legacyVoice, apiKey)
        if (legacyMs !== null) return { durationMs: legacyMs, usedFallback: false }
      }
    } catch {
      // fall through to Web Speech
    }
  }

  const durationMs = await waitForSpeechSynthesis(trimmed, expertId)
  return { durationMs, usedFallback: true }
}

export async function speakSentence(
  text: string,
  expertId: string,
  options?: { muted?: boolean; apiKey?: string },
): Promise<SpeakResult> {
  const trimmed = prepareTextForSpeech(text)
  if (!trimmed) return { durationMs: 0, usedFallback: true }

  if (options?.muted) {
    const durationMs = estimateDurationMs(trimmed)
    await new Promise((r) => setTimeout(r, durationMs))
    return { durationMs, usedFallback: true }
  }

  stopAllSpeech()

  // Hard safety cap: no single line may stall playback (a buffering/looping audio
  // element that never fires `onended` would otherwise freeze the whole debate).
  const capMs = Math.min(estimateDurationMs(trimmed) * 1.5 + 6_000, 30_000)
  let capTimer: ReturnType<typeof setTimeout> | undefined
  const cap = new Promise<SpeakResult>((resolve) => {
    capTimer = setTimeout(() => {
      stopAllSpeech()
      resolve({ durationMs: estimateDurationMs(trimmed), usedFallback: true })
    }, capMs)
  })

  try {
    return await Promise.race([speakSentenceCore(trimmed, expertId, options), cap])
  } finally {
    if (capTimer) clearTimeout(capTimer)
  }
}

/**
 * Speak a full argument in natural multi-sentence chunks (not one sentence per API call).
 * Much more human than staccato single-sentence playback.
 */
export async function speakArgument(
  text: string,
  expertId: string,
  options?: { muted?: boolean; onSentenceStart?: (chunk: string) => void },
): Promise<void> {
  const chunks = chunkTextForNaturalSpeech(text)

  if (chunks.length === 0) {
    await speakSentence(text, expertId, options)
    return
  }

  for (const chunk of chunks) {
    options?.onSentenceStart?.(chunk)
    await speakSentence(chunk, expertId, options)
    await new Promise((r) => setTimeout(r, 200))
  }
}

/** Speak a single short line (council arena round-robin) — still uses Aura-2 + text prep */
export async function speakDebateLine(
  text: string,
  expertId: string,
  options?: { muted?: boolean },
): Promise<SpeakResult> {
  return speakSentence(text, expertId, options)
}
