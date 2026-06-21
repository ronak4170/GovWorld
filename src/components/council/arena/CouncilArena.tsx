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
  const completeCount = members.filter((m) => m.isComplete).length
  const riskScore = activeExpert
    ? (members.find((m) => m.id === activeExpert.id)?.severityScore ?? 0)
    : 0

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: '#08090d' }}>
      {/* Cinematic background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="star-field absolute inset-0" />
        <div className="cinematic-vignette absolute inset-0" />
      </div>

      {/* Top navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={handleExit}
            className="w-10 h-10 glass-panel rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            style={{ color: '#a78b7d' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffb690')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a78b7d')}
            aria-label="Close arena"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <button
            onClick={() => setMuted(!isMuted)}
            className="w-10 h-10 glass-panel rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            style={{ color: '#a78b7d' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffb690')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#a78b7d')}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="material-symbols-outlined">{isMuted ? 'volume_off' : 'volume_up'}</span>
          </button>
        </div>
        <div className="text-right flex flex-col items-end pointer-events-auto">
          <span className="text-[10px] font-semibold tracking-[0.2em] mb-1" style={{ color: '#ffb690' }}>
            LIVE SIMULATION
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4edea3', boxShadow: '0 0 8px #4edea3' }} />
            <span className="text-[20px] font-semibold tracking-tighter" style={{ color: '#f6ded3' }}>
              POLICY COUNCIL
            </span>
          </div>
        </div>
      </nav>

      {/* Main stage */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        {use2DFallback ? (
          <div className="absolute inset-0 overflow-y-auto p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto pt-20">
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

        {/* Idle start overlay */}
        {debatePlaybackState === 'idle' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#a78b7d' }}>
              Van Ness Avenue · Complete Streets Phase 1
            </p>
            <button
              onClick={startCinematicDebate}
              className="pointer-events-auto px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              style={{ backgroundColor: '#f97316', color: '#552100', boxShadow: '0 0 30px rgba(249,115,22,0.4)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Begin Debate
            </button>
          </div>
        )}

        {/* Analysis chips (bottom-right) */}
        {debatePlaybackState !== 'idle' && (
          <div className="absolute bottom-28 right-6 z-20 flex gap-2 pointer-events-none">
            <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#4edea3' }}>analytics</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#e0c0b1' }}>
                Experts {completeCount}/{members.length || 5}
              </span>
            </div>
            <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffb690' }}>psychology</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#e0c0b1' }}>
                Risk {riskScore || '—'}/10
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
