import { useEffect, useRef, useState, useCallback } from 'react'
import { useCouncilStore, EXPERT_POOL, type DebateTurn, type ExpertDefinition } from '@/store/councilStore'
import { generateTurnArgument } from '@/lib/llm'
import { speakArgument, stopAllSpeech } from '@/lib/deepgram'
import { gatherExpertResearch, factsToCitedEvidence } from '@/lib/expertResearch'

// ---------------------------------------------------------------------------
// Severity scoring: parse a numeric score from argument text or assign one
// ---------------------------------------------------------------------------

function parseSeverity(text: string): { score: number; label: string } {
  const match = text.match(/SEVERITY[:\s]+(\d{1,2})\s*\/\s*10/i)
  if (match) {
    const score = Math.min(10, Math.max(1, parseInt(match[1], 10)))
    return { score, label: score >= 8 ? 'HIGH RISK' : score >= 5 ? 'MODERATE RISK' : 'LOW RISK' }
  }
  // Derive a pseudo-score from sentiment words in the text
  const lower = text.toLowerCase()
  const highWords = ['critical', 'severe', 'danger', 'disaster', 'illegal', 'unconstitutional', 'fatal', 'crisis']
  const lowWords = ['opportunity', 'benefit', 'positive', 'improve', 'growth', 'support', 'encourage']
  const highCount = highWords.filter((w) => lower.includes(w)).length
  const lowCount = lowWords.filter((w) => lower.includes(w)).length
  const score = Math.min(10, Math.max(1, 5 + highCount * 2 - lowCount))
  return { score, label: score >= 8 ? 'HIGH RISK' : score >= 5 ? 'MODERATE RISK' : 'LOW RISK' }
}

// ---------------------------------------------------------------------------
// Typing animation — streams text into state character by character
// ---------------------------------------------------------------------------

function useTypingEffect(
  targetText: string,
  isStreaming: boolean,
  onChar: (partial: string) => void
) {
  const indexRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isStreaming || !targetText) return
    indexRef.current = 0

    const tick = () => {
      indexRef.current += Math.floor(Math.random() * 3) + 1 // 1–3 chars at a time
      if (indexRef.current >= targetText.length) {
        indexRef.current = targetText.length
        onChar(targetText)
        return
      }
      onChar(targetText.slice(0, indexRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetText, isStreaming])
}

// ---------------------------------------------------------------------------
// Individual debate turn bubble
// ---------------------------------------------------------------------------

interface TurnBubbleProps {
  turn: DebateTurn
  expert: ExpertDefinition | undefined
  isActive: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
}

function TurnBubble({ turn, expert, isActive, isCollapsed, onToggleCollapse }: TurnBubbleProps) {
  const [displayedText, setDisplayedText] = useState('')

  useTypingEffect(turn.argument, turn.isStreaming, setDisplayedText)

  // Once streaming stops, lock to full text
  useEffect(() => {
    if (!turn.isStreaming && turn.argument) {
      setDisplayedText(turn.argument)
    }
  }, [turn.isStreaming, turn.argument])

  const color = expert?.color ?? 'text-slate-400'
  const severityColor =
    turn.severityScore >= 8
      ? 'text-red-400 bg-red-900/30 border-red-700'
      : turn.severityScore >= 5
      ? 'text-amber-400 bg-amber-900/30 border-amber-700'
      : 'text-emerald-400 bg-emerald-900/30 border-emerald-700'

  return (
    <div
      className={`flex gap-4 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-90'}`}
    >
      {/* Avatar column */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div
          className={`relative w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 ${
            isActive ? 'border-blue-500' : 'border-slate-700'
          } flex-shrink-0`}
        >
          {isActive && (
            <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-60" />
          )}
          <img
            src={expert?.avatarUrl}
            alt={turn.expertName}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement
              el.style.display = 'none'
              const parent = el.parentElement
              if (parent) {
                const span = document.createElement('span')
                span.className = 'text-2xl absolute inset-0 flex items-center justify-center'
                span.textContent = expert?.avatar ?? '🎙️'
                parent.appendChild(span)
              }
            }}
          />
        </div>
        {/* Round pill */}
        <span className="text-[10px] text-slate-500 font-mono">R{turn.round}</span>
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`font-semibold text-sm ${color}`}>{turn.expertName}</span>
          <span className="text-slate-500 text-xs">·</span>
          <span className="text-slate-400 text-xs">{turn.expertTitle}</span>

          {turn.isComplete && (
            <>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${severityColor}`}>
                {turn.severityLabel} {turn.severityScore}/10
              </span>
              <button
                onClick={onToggleCollapse}
                className="text-slate-500 hover:text-slate-300 text-xs px-1.5"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? '▼' : '▲'}
              </button>
            </>
          )}
        </div>

        {/* Research indicator */}
      {turn.isResearching && (
        <div className="flex items-center gap-2 mb-2 text-xs text-blue-400">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Scraping sector sources (Wikipedia, web)…
        </div>
      )}

      {/* Researched facts preview */}
      {turn.researchFacts?.length > 0 && !turn.isResearching && (
        <div className="mb-2 space-y-1">
          {turn.researchFacts.slice(0, 2).map((f) => (
            <div key={f.id} className="text-[10px] text-slate-500 flex gap-1.5">
              <span className="text-blue-500 flex-shrink-0">🔗</span>
              <span>
                <span className="text-slate-400">{f.source}:</span> {f.snippet.slice(0, 90)}…
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Body */}
        <div
          className={`bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm leading-relaxed transition-all duration-300 ${
            isCollapsed ? 'max-h-10 overflow-hidden' : 'max-h-[500px]'
          }`}
        >
          {turn.isStreaming && !displayedText && (
            <span className="flex gap-1 items-center text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
          {displayedText}
          {turn.isStreaming && displayedText && (
            <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>

        {turn.isComplete && turn.citedEvidence?.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-slate-700/40 pt-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sources scraped</div>
            {turn.citedEvidence.map((ev, i) => (
              <div key={i} className="flex gap-1.5 text-[10px] text-slate-500">
                <span className="text-emerald-500 flex-shrink-0">▸</span>
                <span>{ev}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expert selector chip
// ---------------------------------------------------------------------------

interface ExpertChipProps {
  expert: ExpertDefinition
  selected: boolean
  disabled: boolean
  onToggle: () => void
}

function ExpertChip({ expert, selected, disabled, onToggle }: ExpertChipProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={expert.title}
      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-slate-500 border-slate-700 bg-slate-800'
          : selected
          ? `${expert.color} border-current bg-current/10 ring-2 ring-current/40`
          : 'text-slate-400 border-slate-700 bg-slate-800 hover:border-slate-500 hover:text-slate-200'
      }`}
    >
      <img
        src={expert.avatarUrl}
        alt=""
        width={20}
        height={20}
        className="rounded-full bg-slate-700 flex-shrink-0"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <span className="whitespace-nowrap">{expert.name.split(' ')[0]}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Synthesis banner (shown after all experts finish a round)
// ---------------------------------------------------------------------------

function SynthesisBanner({ turns, round }: { turns: DebateTurn[]; round: number }) {
  const avgScore = turns.length > 0
    ? Math.round(turns.reduce((s, t) => s + t.severityScore, 0) / turns.length)
    : 0
  const highRisk = turns.filter((t) => t.severityScore >= 8).length
  const color = avgScore >= 8 ? 'border-red-700 bg-red-900/20 text-red-300'
    : avgScore >= 5 ? 'border-amber-700 bg-amber-900/20 text-amber-300'
    : 'border-emerald-700 bg-emerald-900/20 text-emerald-300'

  return (
    <div className={`rounded-xl border px-5 py-4 mt-2 ${color}`}>
      <div className="font-semibold text-sm mb-1">Round {round} — Council Assessment</div>
      <div className="text-xs opacity-80">
        Average risk score: <strong>{avgScore}/10</strong>
        {highRisk > 0 && ` · ${highRisk} expert${highRisk > 1 ? 's' : ''} flagged HIGH RISK`}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main DebateArena component
// ---------------------------------------------------------------------------

export default function DebateArena() {
  const {
    policyText,
    selectedExpertIds,
    debateHistory,
    currentRound,
    setDebateArenaOpen,
    setSpeakingExpert,
    addTurn,
    updateTurn,
    startNewRound,
    clearHistory,
    toggleExpert,
    isMuted,
    setMuted,
  } = useCouncilStore()

  const [isRunning, setIsRunning] = useState(false)
  const [isPolicyExpanded, setIsPolicyExpanded] = useState(false)
  const [collapsedTurns, setCollapsedTurns] = useState<Set<string>>(new Set())
  const [speakingTurnKey, setSpeakingTurnKey] = useState<string | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)

  // Auto-scroll whenever debateHistory changes
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [debateHistory])

  // Helper: did all selected experts speak in a given round?
  const allExpertsSpoke = (round: number) => {
    const roundTurns = debateHistory.filter((t) => t.round === round)
    return (
      roundTurns.length === selectedExpertIds.length &&
      roundTurns.every((t) => t.isComplete)
    )
  }
  const round1Done = allExpertsSpoke(1)

  // Toggle collapse for a single bubble
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedTurns((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  // Build previous turns list for context injection
  function buildPreviousTurns(): Array<{ expertName: string; expertTitle: string; argument: string }> {
    return debateHistory
      .filter((t) => t.isComplete)
      .map((t) => ({ expertName: t.expertName, expertTitle: t.expertTitle, argument: t.argument }))
  }

  // Run a full round
  const runRound = useCallback(
    async (round: number) => {
      if (!policyText.trim()) return
      abortRef.current = false
      setIsRunning(true)

      const experts: ExpertDefinition[] = selectedExpertIds
        .map((id) => EXPERT_POOL.find((e) => e.id === id))
        .filter((e): e is ExpertDefinition => e !== undefined)

      for (const expert of experts) {
        if (abortRef.current) break

        // Skip if this expert already spoke this round
        const alreadySpoke = debateHistory.some(
          (t) => t.expertId === expert.id && t.round === round
        )
        if (alreadySpoke) continue

        // Placeholder turn — research phase
        addTurn({
          expertId: expert.id,
          expertName: expert.name,
          expertTitle: expert.title,
          argument: '',
          isStreaming: false,
          isResearching: true,
          isComplete: false,
          severityScore: 0,
          severityLabel: '',
          researchFacts: [],
          citedEvidence: [],
          round,
        })

        try {
          // Step 1: Web research for this expert's sector
          const research = await gatherExpertResearch(expert.id, policyText)
          if (abortRef.current) break

          updateTurn(expert.id, round, {
            isResearching: false,
            researchFacts: research.facts,
            isStreaming: true,
          })

          // Step 2: Generate argument using research + Groq
          const argument = await generateTurnArgument({
            expert,
            policyText,
            previousTurns: buildPreviousTurns(),
            round,
            researchFacts: research.facts,
          })

          if (abortRef.current) break

          const { score, label } = parseSeverity(argument)
          updateTurn(expert.id, round, {
            argument,
            isStreaming: false,
            isComplete: true,
            severityScore: score,
            severityLabel: label,
            citedEvidence: factsToCitedEvidence(research.facts),
          })

          // Speak the argument with TTS (Deepgram or Web Speech fallback).
          // Capped so a long/slow voice can never make the debate look frozen —
          // the next expert always follows within a bounded time.
          if (!abortRef.current) {
            const turnKey = `${expert.id}-${round}`
            setSpeakingTurnKey(turnKey)
            setSpeakingExpert(expert.id)
            try {
              const speakDone = speakArgument(argument, expert.id, {
                muted: useCouncilStore.getState().isMuted,
              })
              const cap = new Promise<void>((resolve) => setTimeout(resolve, 22_000))
              await Promise.race([speakDone, cap])
            } catch {
              // TTS failure is non-fatal
            }
            stopAllSpeech()
            setSpeakingExpert(null)
            setSpeakingTurnKey(null)
          }
        } catch {
          updateTurn(expert.id, round, {
            argument: `[${expert.name} — connection error. Please try again.]`,
            isStreaming: false,
            isResearching: false,
            isComplete: true,
            severityScore: 5,
            severityLabel: 'MODERATE RISK',
          })
        }

        // Brief pause between turns so bubbles feel sequential
        await new Promise((r) => setTimeout(r, 600))
      }

      setIsRunning(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policyText, selectedExpertIds, debateHistory, addTurn, updateTurn]
  )

  const handleStartDebate = () => {
    clearHistory()
    runRound(1)
  }

  const handleStartRebuttal = () => {
    startNewRound()
    runRound(currentRound + 1)
  }

  const handleStop = () => {
    abortRef.current = true
    stopAllSpeech()
    setSpeakingExpert(null)
    setSpeakingTurnKey(null)
    setIsRunning(false)
  }

  const handleClose = () => {
    handleStop()
    setDebateArenaOpen(false)
  }

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1.5 text-sm cursor-pointer"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-slate-100 font-semibold text-sm tracking-wide">
            POLICY COUNCIL DEBATE
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
            Round {currentRound}
          </span>
        </div>

        {isRunning && (
          <button
            onClick={handleStop}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/60 border border-red-700 text-red-300 hover:bg-red-800/60 transition-colors flex items-center gap-1 cursor-pointer"
          >
            Stop
          </button>
        )}
        {!isRunning && (
          <button
            onClick={() => setMuted(!isMuted)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute voices' : 'Mute voices'}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Policy brief (collapsible)                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-shrink-0 border-b border-slate-800">
        <button
          onClick={() => setIsPolicyExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-900/60 transition-colors"
        >
          <span className="text-slate-500 text-xs uppercase tracking-wider">Policy Brief</span>
          <span className="flex-1 text-slate-300 text-xs truncate mx-2">
            {policyText.trim().slice(0, 100) || 'No policy text entered'}
            {policyText.length > 100 && '…'}
          </span>
          <span className="text-slate-500 text-xs">{isPolicyExpanded ? '▲' : '▼'}</span>
        </button>
        {isPolicyExpanded && (
          <div className="px-4 pb-3">
            <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans bg-slate-900 rounded-lg p-3 border border-slate-700 max-h-40 overflow-y-auto">
              {policyText.trim() || 'No policy text entered. Go to the Policy panel and paste your policy first.'}
            </pre>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Debate transcript                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {debateHistory.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
            <div className="text-5xl select-none">🎙️</div>
            <p className="text-sm text-center leading-relaxed max-w-xs">
              Select your experts below and click <strong className="text-slate-300">Start Debate</strong>.
              <br />
              Each expert will argue in sequence, responding to what was said before them.
            </p>
          </div>
        )}

        {/* Render turns grouped by round */}
        {[...Array(currentRound)].map((_, ri) => {
          const round = ri + 1
          const roundTurns = debateHistory.filter((t) => t.round === round)
          if (roundTurns.length === 0) return null

          return (
            <div key={round} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  {round === 1 ? 'Round 1 — Opening Arguments' : `Round ${round} — Rebuttal`}
                </span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {roundTurns.map((turn) => {
                const expert = EXPERT_POOL.find((e) => e.id === turn.expertId)
                const key = `${turn.expertId}-${turn.round}`
                const isCurrentlyStreaming = turn.isStreaming
                const turnKey = `${turn.expertId}-${turn.round}`
                const isSpeakingNow = speakingTurnKey === turnKey
                return (
                  <TurnBubble
                    key={key}
                    turn={turn}
                    expert={expert}
                    isActive={isCurrentlyStreaming || isSpeakingNow}
                    isCollapsed={collapsedTurns.has(key)}
                    onToggleCollapse={() => toggleCollapse(key)}
                  />
                )
              })}

              {/* Synthesis after each completed round */}
              {allExpertsSpoke(round) && (
                <SynthesisBanner turns={roundTurns} round={round} />
              )}
            </div>
          )
        })}

        {/* Scroll anchor */}
        <div ref={scrollAnchorRef} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom controls                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-shrink-0 border-t border-slate-700 bg-slate-900 px-4 py-3">
        {/* Expert chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {EXPERT_POOL.map((expert) => (
            <ExpertChip
              key={expert.id}
              expert={expert}
              selected={selectedExpertIds.includes(expert.id)}
              disabled={isRunning}
              onToggle={() => toggleExpert(expert.id)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-2">
          {!isRunning && debateHistory.length === 0 && (
            <button
              onClick={handleStartDebate}
              disabled={!policyText.trim() || selectedExpertIds.length < 2}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              ▶ Start Debate
            </button>
          )}

          {!isRunning && debateHistory.length > 0 && round1Done && currentRound > 1 && (
            <button
              onClick={handleStartDebate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
            >
              ↺ New Debate
            </button>
          )}

          {!isRunning && debateHistory.length > 0 && round1Done && currentRound === 1 && (
            <>
              <button
                onClick={handleStartRebuttal}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold text-sm transition-colors"
              >
                🔄 Round 2 — Rebuttal
              </button>
              <button
                onClick={handleStartDebate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
              >
                ↺ New Debate
              </button>
            </>
          )}

          {isRunning && (
            <div className="flex-1 flex items-center gap-2 text-slate-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Debate in progress…
            </div>
          )}
        </div>

        {!policyText.trim() && (
          <p className="text-amber-400 text-xs mt-2">
            ⚠ No policy text found. Go to the Policy panel and paste your policy first.
          </p>
        )}
      </div>
    </div>
  )
}
