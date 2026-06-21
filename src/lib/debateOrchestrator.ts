import { generateCouncilArgument } from '@/lib/llm'
import { speakSentence, stopAllSpeech } from '@/lib/deepgram'
import { gatherExpertResearch } from '@/lib/expertResearch'
import type { Policy } from '@/types/policy'
import type { DebateMember } from '@/store/councilStore'
import demoDebateSentences from '@/data/demo_debate_sentences.json'

export interface DebateSentence {
  id: string
  expertId: string
  text: string
  round: number
  orderIndex: number
}

export interface DebateOrchestratorCallbacks {
  onSentenceStart: (sentence: DebateSentence) => void
  onSentenceProgress: (sentence: DebateSentence, visibleWords: number, totalWords: number) => void
  onSentenceEnd: (sentence: DebateSentence) => void
  onExpertArgumentComplete: (expertId: string, fullArgument: string) => void
  onQueueBuilt?: (totalSentences: number) => void
  onDebateComplete: () => void
  onError: (err: Error) => void
}

export interface DebateOrchestratorControls {
  pause: () => void
  resume: () => void
  skipSentence: () => void
  skipToEnd: () => void
  abort: () => void
}

const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_SKIP_API === 'true'

export function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
}

export function buildRoundRobinQueue(
  expertSentences: Record<string, string[]>,
  expertIds: string[],
): DebateSentence[] {
  const queue: DebateSentence[] = []
  const maxRounds = Math.max(...expertIds.map((id) => expertSentences[id]?.length ?? 0), 0)
  let orderIndex = 0

  for (let round = 1; round <= maxRounds; round++) {
    for (const expertId of expertIds) {
      const sentences = expertSentences[expertId] ?? []
      const text = sentences[round - 1]
      if (!text) continue
      queue.push({
        id: `s-${expertId}-r${round}-${orderIndex}`,
        expertId,
        text,
        round,
        orderIndex: orderIndex++,
      })
    }
  }

  return queue
}

/** Remove TTS-unfriendly artefacts (severity tag, markdown) before speaking. */
function sanitizeArgument(text: string): string {
  return text
    .replace(/SEVERITY\s*:?\s*\d+\s*\/\s*10/gi, '')
    .replace(/\*\*?|__?|^#+\s*|`|>/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function demoArgumentFor(member: DebateMember): string {
  const demoMembers = (demoDebateSentences as { members?: Record<string, { argument: string }> }).members
  return (
    demoMembers?.[member.id]?.argument ??
    member.argument ??
    `As ${member.title}, I have serious concerns about this proposal. ${member.stance}. ` +
      `Independent review is essential before any contract is signed, and the affected residents must be consulted directly.`
  )
}

async function fetchExpertArguments(
  members: DebateMember[],
  policy: Policy,
  variant: number,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  // Offline / zero-API demo: use the rich pre-written arguments.
  if (DEMO_MODE) {
    for (const member of members) results[member.id] = sanitizeArgument(demoArgumentFor(member))
    return results
  }

  // Live: generate fresh, varied arguments per expert (falls back to rich demo text).
  await Promise.all(
    members.map(async (member) => {
      try {
        const research = await gatherExpertResearch(member.id, policy.description)
        const arg = await generateCouncilArgument(member as never, policy, research.facts, variant)
        const chosen = arg && arg.trim().length > 40 ? arg : demoArgumentFor(member)
        results[member.id] = sanitizeArgument(chosen)
      } catch {
        results[member.id] = sanitizeArgument(demoArgumentFor(member))
      }
    }),
  )

  return results
}

/** Rotate an array so a different expert opens each run (cheap per-run variation). */
function rotate<T>(arr: T[], by: number): T[] {
  if (arr.length === 0) return arr
  const n = ((by % arr.length) + arr.length) % arr.length
  return [...arr.slice(n), ...arr.slice(0, n)]
}

function estimateSentenceMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max((words / 150) * 60_000, 1500)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

async function animateSubtitleToDuration(
  sentence: DebateSentence,
  durationMs: number,
  onProgress: DebateOrchestratorCallbacks['onSentenceProgress'],
  isPaused: () => boolean,
  shouldSkip: () => boolean,
  signal?: AbortSignal,
): Promise<void> {
  const words = sentence.text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return

  const msPerWord = durationMs / words.length
  for (let i = 1; i <= words.length; i++) {
    if (signal?.aborted || shouldSkip()) break
    while (isPaused()) {
      await sleep(100, signal)
    }
    onProgress(sentence, i, words.length)
    await sleep(msPerWord, signal)
  }
}

export async function runCinematicDebate(
  params: {
    policy: Policy
    members: DebateMember[]
    expertIds: string[]
    muted?: boolean | (() => boolean)
    abortSignal?: AbortSignal
  },
  callbacks: DebateOrchestratorCallbacks,
): Promise<DebateOrchestratorControls> {
  let paused = false
  let skipCurrent = false
  let finishNow = false
  const abortController = new AbortController()
  const signal = params.abortSignal ?? abortController.signal

  const controls: DebateOrchestratorControls = {
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
    },
    skipSentence: () => {
      skipCurrent = true
      stopAllSpeech()
    },
    skipToEnd: () => {
      finishNow = true
      paused = false
      skipCurrent = true
      stopAllSpeech()
    },
    abort: () => {
      stopAllSpeech()
      abortController.abort()
    },
  }

  ;(async () => {
    try {
      const arenaExpertIds = params.expertIds.slice(0, 5)
      const members = params.members.filter((m) => arenaExpertIds.includes(m.id))

      // Per-run variation: different opening speaker + fresh LLM sampling each run.
      const variant = Math.floor(Math.random() * 1_000_000)

      const fullArguments = await fetchExpertArguments(members, params.policy, variant)
      for (const [expertId, argument] of Object.entries(fullArguments)) {
        callbacks.onExpertArgumentComplete(expertId, argument)
      }

      const expertSentences: Record<string, string[]> = {}
      for (const id of arenaExpertIds) {
        expertSentences[id] = splitIntoSentences(fullArguments[id] ?? '')
      }

      const speakingOrder = rotate(arenaExpertIds, variant)
      const queue = buildRoundRobinQueue(expertSentences, speakingOrder)

      if (queue.length === 0) {
        throw new Error('No debate sentences available')
      }

      callbacks.onQueueBuilt?.(queue.length)

      for (const sentence of queue) {
        if (signal.aborted || finishNow) break
        skipCurrent = false

        while (paused) {
          await sleep(100, signal)
        }
        if (signal.aborted || finishNow) break

        callbacks.onSentenceStart(sentence)

        const speakPromise = speakSentence(sentence.text, sentence.expertId, {
          muted:
            typeof params.muted === 'function' ? params.muted() : params.muted,
        })

        const subtitlePromise = speakPromise.then(({ durationMs }) =>
          animateSubtitleToDuration(
            sentence,
            skipCurrent ? 200 : durationMs,
            callbacks.onSentenceProgress,
            () => paused,
            () => skipCurrent,
            signal,
          ),
        )

        // Hard safety timeout — a hung/looping audio element can never freeze the
        // debate; we cut it and advance to the next sentence.
        const maxMs = Math.max(estimateSentenceMs(sentence.text) * 1.8, 9000)
        await Promise.race([
          Promise.all([speakPromise, subtitlePromise]),
          sleep(maxMs, signal).catch(() => undefined),
        ])
        // Ensure audio is cut and any pending promise is resolved before advancing.
        stopAllSpeech()
        await Promise.allSettled([speakPromise, subtitlePromise])

        callbacks.onSentenceEnd(sentence)

        if (!signal.aborted && !skipCurrent) {
          await sleep(250, signal)
        }
      }

      if (!signal.aborted) {
        callbacks.onDebateComplete()
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)))
      }
    }
  })()

  return controls
}
