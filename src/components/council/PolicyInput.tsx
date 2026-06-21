import { useRef } from 'react'
import { useCouncilStore } from '@/store/councilStore'
import { useUIStore } from '@/store/uiStore'
import { generateCouncilArgument } from '@/lib/llm'
import { gatherExpertResearch, factsToCitedEvidence } from '@/lib/expertResearch'
import type { Policy, GeoJSONPolygon } from '@/types/policy'
import { openCouncilArenaAndStart } from '@/components/council/arena/CouncilArena'

// ---------------------------------------------------------------------------
// Typewriter helper — progressively sets text at ~30ms/char
// ---------------------------------------------------------------------------

async function typewriterUpdate(
  text: string,
  onChunk: (partial: string) => void,
  charDelayMs = 30,
): Promise<void> {
  for (let i = 1; i <= text.length; i++) {
    onChunk(text.slice(0, i))
    await new Promise<void>((r) => setTimeout(r, charDelayMs))
  }
}

// ---------------------------------------------------------------------------
// Demo policy text
// ---------------------------------------------------------------------------

const DEMO_POLICY_TEXT = `Van Ness Avenue Complete Streets — Phase 1 (2.3km stretch)

Budget: $45M | Duration: 18 months | Area: Van Ness Avenue, San Francisco

This project redesigns Van Ness from Market to Jackson Street with dedicated BRT lanes, protected cycle tracks, street trees, and enhanced pedestrian crossings. Phase 1 includes utility undergrounding, new storm drain installation, ADA-compliant corners, and bus shelter upgrades at 6 locations.`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PolicyInput() {
  const store = useCouncilStore()
  const { policyText, isDebating, isComplete, setPolicyText, startDebate, updateMember,
          setSpeakingExpert, completeDebate,
          selectedExpertIds } = store
  const addToast = useUIStore((s) => s.addToast)

  const abortRef = useRef(false)

  const displayText = policyText || DEMO_POLICY_TEXT

  const buildPolicy = (text: string): Policy => ({
    id: 'POL-DEMO',
    title: 'Van Ness Avenue Complete Streets — Phase 1',
    description: text,
    policyType: 'road',
    targetArea: 'Van Ness Avenue, San Francisco, CA',
    budget: 45000000,
    plannedStartDate: '2025-01-01',
    plannedEndDate: '2026-06-30',
    affectedZone: { type: 'Polygon', coordinates: [] } as GeoJSONPolygon,
    submittedAt: new Date().toISOString(),
  })

  const validate = (): boolean => {
    const text = displayText.trim()
    if (!text) {
      addToast('Please enter a policy description', 'warning')
      return false
    }
    if (selectedExpertIds.length < 2) {
      addToast('Please select at least 2 experts', 'warning')
      return false
    }
    return true
  }

  // -------------------------------------------------------------------------
  // Classic panel debate (card grid)
  // -------------------------------------------------------------------------

  const handleLiveDebate = async () => {
    if (!validate()) return

    if (!policyText) setPolicyText(DEMO_POLICY_TEXT)
    const policy = buildPolicy(displayText.trim())

    abortRef.current = false
    startDebate()

    addToast('Live debate started — experts speaking in sequence...', 'info')

    const currentMembers = useCouncilStore.getState().members

    for (const member of currentMembers) {
      if (abortRef.current) break

      updateMember(member.id, { isStreaming: true, isComplete: false, argument: '' })
      setSpeakingExpert(member.id)

      addToast(`Researching web sources for ${member.name.split(' ')[0]}…`, 'info')
      const research = await gatherExpertResearch(member.id, displayText.trim())

      let fullArgument = ''
      try {
        fullArgument = await generateCouncilArgument(member as never, policy, research.facts)
      } catch {
        fullArgument =
          `As ${member.title}, I have concerns about this infrastructure proposal that warrant ` +
          `careful consideration. The ${member.stance.toLowerCase()}. ` +
          `Further review and community consultation are strongly recommended before proceeding.`
      }

      await typewriterUpdate(fullArgument, (partial) => {
        updateMember(member.id, { argument: partial })
      })

      const computedScore = member.severityScore || Math.floor(Math.random() * 5) + 4
      const computedLabel =
        computedScore >= 8 ? 'HIGH RISK' : computedScore >= 6 ? 'MODERATE RISK' : 'LOW RISK'
      updateMember(member.id, {
        argument: fullArgument,
        isStreaming: false,
        isComplete: true,
        severityScore: computedScore,
        severityLabel: computedLabel,
        citedEvidence: factsToCitedEvidence(research.facts),
      })

      if (!abortRef.current) {
        await new Promise<void>((r) => setTimeout(r, 800))
      }
    }

    setSpeakingExpert(null)
    completeDebate()

    const finalMembers = useCouncilStore.getState().members
    const avg =
      finalMembers.reduce((sum, m) => sum + (m.severityScore || 5), 0) /
      Math.max(finalMembers.length, 1)
    useCouncilStore.setState({
      overallRiskScore: Math.round(avg * 10) / 10,
      topRisks: [
        'Construction disruption to existing traffic flow',
        'Small business revenue impact during 8-month work period',
        'Budget overrun risk from utility relocation complications',
      ],
      consensusRecommendations: [
        'Phase construction to maintain one open lane at all times',
        'Establish a business disruption compensation fund',
        'Require monthly independent audits of contractor progress',
      ],
    })

    addToast('Council debate complete', 'success')
  }

  // -------------------------------------------------------------------------
  // Cinematic 3D arena debate
  // -------------------------------------------------------------------------

  const handleCinematicDebate = () => {
    if (!validate()) return
    if (!policyText) setPolicyText(DEMO_POLICY_TEXT)
    openCouncilArenaAndStart()
  }

  return (
    <div className="space-y-3">
      <textarea
        value={displayText}
        onChange={(e) => setPolicyText(e.target.value)}
        rows={5}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-blue-500 resize-none placeholder-slate-600 transition-colors"
        placeholder="Paste your infrastructure policy here..."
      />
      <button
        onClick={handleCinematicDebate}
        disabled={isDebating}
        className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-sm cursor-pointer shadow-lg shadow-blue-900/30"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Start Cinematic 3D Debate</span>
      </button>
      <button
        onClick={handleLiveDebate}
        disabled={isDebating}
        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-xs cursor-pointer"
      >
        {isDebating ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Debate in progress...</span>
          </>
        ) : (
          <span>{isComplete ? 'Re-run Panel Debate' : 'Start Panel Debate'}</span>
        )}
      </button>
    </div>
  )
}
