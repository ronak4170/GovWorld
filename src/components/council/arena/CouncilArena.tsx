import { useCallback, useEffect, useRef, useState } from 'react'
import { useCouncilStore, EXPERT_POOL } from '@/store/councilStore'
import { useUIStore } from '@/store/uiStore'
import {
  runCinematicDebate,
  type DebateOrchestratorControls,
  type DebateSentence,
} from '@/lib/debateOrchestrator'
import { stopAllSpeech, getDeepgramApiKey } from '@/lib/deepgram'
import type { Policy, GeoJSONPolygon } from '@/types/policy'
import CouncilChamber3D from './CouncilChamber3D'
import CinematicSubtitle from './CinematicSubtitle'
import DebateControls from './DebateControls'
import SeverityReveal from './SeverityReveal'
import AgentCard from '../AgentCard'
import demoDebateSentences from '@/data/demo_debate_sentences.json'

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}


interface Props {
  autoStart?: boolean
}

export default function CouncilArena({ autoStart: _autoStart }: Props) {
  const store = useCouncilStore()
  const addToast = useUIStore((s) => s.addToast)
  const controlsRef = useRef<DebateOrchestratorControls | null>(null)
  const isRunningRef = useRef(false)
  const sentenceCountRef = useRef(0)
  const totalSentencesRef = useRef(25)
  void useReducedMotion()
  // Always use 3D cinematic chamber
  const use2DFallback = false

  const {
    selectedExpertIds,
    policyText,
    speakingExpertId,
    currentSentence,
    currentSentenceText,
    debatePlaybackState,
    debateProgress,
    isMuted,
    introComplete,
    members,
    setCouncilArenaOpen,
    setSpeakingExpert,
    setCurrentSentence,
    setCurrentSentenceText,
    setDebatePlaybackState,
    setDebateProgress,
    setIntroComplete,
    setMuted,
    resetCouncilArena,
    startDebate,
    updateMember,
    completeDebate,
    setDebateQueue,
    pendingArenaStart,
    setPendingArenaStart,
  } = store

  const arenaExpertIds = selectedExpertIds.slice(0, 5)
  const maxRound = Math.max(...((demoDebateSentences as { sentences: DebateSentence[] }).sentences?.map((s) => s.round) ?? [5]))

  const buildPolicy = useCallback((): Policy => {
    const text = policyText.trim() || 'Van Ness Avenue Complete Streets policy'
    return {
      id: 'POL-ARENA',
      title: 'Van Ness Avenue Complete Streets — Phase 1',
      description: text,
      policyType: 'road',
      targetArea: 'Van Ness Avenue, San Francisco',
      budget: 45000000,
      plannedStartDate: '2024-01-01',
      plannedEndDate: '2024-12-31',
      affectedZone: { type: 'Polygon', coordinates: [] } as GeoJSONPolygon,
      submittedAt: new Date().toISOString(),
    }
  }, [policyText])

  const startCinematicDebate = useCallback(async () => {
    // Guard against double-start (React.StrictMode re-invokes effects, and the
    // header button + pending-start effect can both fire). One debate at a time.
    if (isRunningRef.current) return
    isRunningRef.current = true

    controlsRef.current?.abort()
    stopAllSpeech()
    resetCouncilArena()
    startDebate()
    setDebatePlaybackState('playing')
    setIntroComplete(false)

    if (!getDeepgramApiKey()) {
      addToast('Using browser voice — add VITE_DEEPGRAM_API_KEY for natural AI voices.', 'info')
    }

    // Intro camera sequence
    await new Promise((r) => setTimeout(r, 2000))
    setIntroComplete(true)

    const debateMembers = useCouncilStore.getState().members
    const policy = buildPolicy()
    const demoSentences = (demoDebateSentences as { sentences: DebateSentence[] }).sentences.filter(
      (s) => arenaExpertIds.includes(s.expertId),
    )
    totalSentencesRef.current = demoSentences.length || 25
    setDebateQueue(demoSentences)
    sentenceCountRef.current = 0

    controlsRef.current = await runCinematicDebate(
      {
        policy,
        members: debateMembers,
        expertIds: arenaExpertIds,
        muted: () => useCouncilStore.getState().isMuted,
      },
      {
        onSentenceStart: (sentence) => {
          setCurrentSentence(sentence)
          setCurrentSentenceText('')
          setSpeakingExpert(sentence.expertId)
          updateMember(sentence.expertId, { isStreaming: true, isComplete: false })
        },
        onSentenceProgress: (sentence, visibleWords) => {
          const words = sentence.text.split(/\s+/).filter(Boolean)
          setCurrentSentenceText(words.slice(0, visibleWords).join(' '))
        },
        onSentenceEnd: (sentence) => {
          sentenceCountRef.current += 1
          setDebateProgress(sentenceCountRef.current / totalSentencesRef.current)
          updateMember(sentence.expertId, {
            argument: (useCouncilStore.getState().members.find((m) => m.id === sentence.expertId)?.argument ?? '') +
              ' ' + sentence.text,
            isStreaming: false,
          })
        },
        onExpertArgumentComplete: (expertId, fullArgument) => {
          const score =
            expertId === 'watchdog' ? 9 : expertId === 'advocate' ? 8 : expertId === 'climate' ? 7 : expertId === 'economist' ? 6 : 5
          const label = score >= 8 ? 'HIGH RISK' : score >= 6 ? 'MODERATE RISK' : 'LOW RISK'
          updateMember(expertId, {
            argument: fullArgument,
            severityScore: score,
            severityLabel: label,
            isComplete: true,
            isStreaming: false,
          })
        },
        onQueueBuilt: (total) => {
          totalSentencesRef.current = total || 25
          sentenceCountRef.current = 0
        },
        onDebateComplete: () => {
          isRunningRef.current = false
          setSpeakingExpert(null)
          setDebatePlaybackState('complete')
          completeDebate()
          useCouncilStore.setState({
            overallRiskScore: 7,
            topRisks: [
              'Monsoon delay risk compounded by contractor performance history',
              '55% revenue loss for Van Ness corridor small businesses with no compensation framework',
              'Induced demand from 4-lane road negates projected congestion relief within 18 months',
            ],
            consensusRecommendations: [
              'Escrow payment structure with milestone-gated releases for all contractors',
              'Establish $2M SF business disruption fund with monthly disbursements before Block B begins',
              'Designate leftmost lane as dedicated electric bus and cycling corridor',
            ],
          })
          addToast('Cinematic council debate complete', 'success')
        },
        onError: (err) => {
          isRunningRef.current = false
          addToast(err.message, 'error')
          setDebatePlaybackState('idle')
        },
      },
    )
  }, [
    arenaExpertIds,
    buildPolicy,
    addToast,
    completeDebate,
    resetCouncilArena,
    setCurrentSentence,
    setCurrentSentenceText,
    setDebatePlaybackState,
    setDebateProgress,
    setDebateQueue,
    setIntroComplete,
    setSpeakingExpert,
    startDebate,
    updateMember,
  ])

  useEffect(() => {
    if (pendingArenaStart && debatePlaybackState === 'idle') {
      setPendingArenaStart(false)
      startCinematicDebate()
    }
  }, [pendingArenaStart, debatePlaybackState, setPendingArenaStart, startCinematicDebate])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExit()
      if (e.key === ' ') {
        e.preventDefault()
        if (debatePlaybackState === 'playing') controlsRef.current?.pause()
        else if (debatePlaybackState === 'paused') controlsRef.current?.resume()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [debatePlaybackState])

  const handleExit = () => {
    isRunningRef.current = false
    controlsRef.current?.abort()
    stopAllSpeech()
    resetCouncilArena()
    setCouncilArenaOpen(false)
  }

  const handleDismissVerdict = () => {
    handleExit()
  }

  const activeExpert = EXPERT_POOL.find((e) => e.id === speakingExpertId)

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="relative z-20 flex items-center justify-between px-5 py-3 border-b border-slate-800/80"
        style={{ background: 'rgba(0,0,0,0.85)' }}
      >
        <div>
          <h1
            className="text-slate-100 text-sm font-semibold tracking-wide"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            Policy Council — Live Debate
          </h1>
          <p className="text-slate-500 text-xs">Van Ness Avenue, San Francisco · Complete Streets Phase 1</p>
        </div>
        {debatePlaybackState === 'idle' && (
          <button
            onClick={startCinematicDebate}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            Start Debate
          </button>
        )}
      </div>

      {/* Main stage */}
      <div className="relative flex-1 overflow-hidden">
        {use2DFallback ? (
          <div className="absolute inset-0 overflow-y-auto p-4 bg-slate-950">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {members.map((member) => (
                <AgentCard
                  key={member.id}
                  member={member}
                  isSpeaking={speakingExpertId === member.id}
                  typedText={
                    speakingExpertId === member.id ? currentSentenceText : undefined
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <CouncilChamber3D
            expertIds={arenaExpertIds}
            activeExpertId={speakingExpertId}
            policyTitle="Van Ness Complete Streets"
            introComplete={introComplete}
          />
        )}

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)',
          }}
        />

        {/* Active speaker indicator (top) */}
        {activeExpert && debatePlaybackState !== 'idle' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-700/50 backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className={`text-xs font-semibold ${activeExpert.color}`} style={{ fontFamily: 'Lexend, sans-serif' }}>
                {activeExpert.name} · {activeExpert.title}
              </span>
            </div>
          </div>
        )}

        <CinematicSubtitle
          expertId={speakingExpertId}
          text={currentSentenceText || currentSentence?.text || ''}
          round={currentSentence?.round ?? 1}
          visible={debatePlaybackState === 'playing' || debatePlaybackState === 'paused'}
        />
      </div>

      <DebateControls
        playbackState={debatePlaybackState}
        progress={debateProgress}
        round={currentSentence?.round ?? 1}
        maxRound={maxRound}
        isMuted={isMuted}
        onPlay={() => {
          setDebatePlaybackState('playing')
          controlsRef.current?.resume()
        }}
        onPause={() => {
          setDebatePlaybackState('paused')
          controlsRef.current?.pause()
        }}
        onSkip={() => controlsRef.current?.skipSentence()}
        onSkipToEnd={() => controlsRef.current?.skipToEnd()}
        onToggleMute={() => setMuted(!isMuted)}
        onExit={handleExit}
      />

      <SeverityReveal
        visible={debatePlaybackState === 'complete'}
        onDismiss={handleDismissVerdict}
      />
    </div>
  )
}

/** Opens the arena and auto-starts debate — called from PolicyInput */
export function openCouncilArenaAndStart(): void {
  const store = useCouncilStore.getState()
  store.resetCouncilArena()
  store.setPendingArenaStart(true)
  store.setCouncilArenaOpen(true)
}
