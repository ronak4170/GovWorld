import { Suspense, lazy, useEffect, useState } from 'react'
import { useCitizenStore } from '@/store/citizenStore'
import { useCouncilStore } from '@/store/councilStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

const Shell = lazy(() =>
  import('./components/layout/Shell').catch(() => ({
    default: () => (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#08090d' }}>
        <div className="text-center">
          <div className="text-4xl font-bold gradient-text mb-2">GOVWORLD</div>
          <div style={{ color: '#8b95a8' }}>Layout loading...</div>
        </div>
      </div>
    ),
  }))
)

const DEMO_POLICY_TEXT = `Van Ness Avenue Complete Streets — Phase 1 (2.3km stretch)

Budget: $45M | Duration: 18 months | Area: Van Ness Avenue, San Francisco

This project redesigns Van Ness from Market to Jackson Street with dedicated BRT lanes, protected cycle tracks, street trees, and enhanced pedestrian crossings. Phase 1 includes utility undergrounding, new storm drain installation, ADA-compliant corners, and bus shelter upgrades at 6 locations.`

function Splash({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#08090d' }}>
      <div className="text-center">
        <div className="text-5xl font-black gradient-text mb-3 tracking-tight">GOVWORLD</div>
        <div className="text-sm mb-1" style={{ color: '#8b95a8' }}>The Living City</div>
        <div className="text-sm mt-4 flex items-center gap-2 justify-center" style={{ color: '#3d4b61' }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
          {message}
        </div>
      </div>
    </div>
  )
}

async function loadDemoData(
  loadCitizens: (c: any[]) => void,
  loadDebate: (members: any[], synthesis: any) => void,
  setPolicyText: (t: string) => void,
  loadTicks: (t: any[]) => void,
  setLoading: (l: boolean, msg?: string) => void
) {
  try {
    setLoading(true, 'Loading citizens...')
    const [citizens, debate, ticks] = await Promise.all([
      import('./data/demo_citizens.json').then((m) => m.default),
      import('./data/demo_council_debate.json').then((m) => m.default),
      import('./data/demo_simulation_ticks.json').then((m) => m.default),
    ])

    setLoading(true, 'Populating simulation...')

    // Load citizens
    loadCitizens(citizens as any[])

    // Load council debate
    const debateData = debate as any
    const membersArray = Object.values(debateData.members ?? debateData) as any[]
    loadDebate(membersArray, {
      overallRiskScore: debateData.synthesis?.overallRiskScore ?? 7,
      topRisks: debateData.synthesis?.topRisks ?? [],
      consensusRecommendations: debateData.synthesis?.consensusRecommendations ?? [],
    })
    setPolicyText(DEMO_POLICY_TEXT)

    // Load simulation ticks (handle both array and wrapped formats)
    const ticksArray = Array.isArray(ticks) ? ticks : (ticks as any).ticks ?? []
    loadTicks(ticksArray as any[])

    setLoading(false)
  } catch (err) {
    console.error('Demo data load failed:', err)
    setLoading(false)
  }
}

export default function App() {
  const [isReady, setIsReady] = useState(false)
  const [loadMsg, setLoadMsg] = useState('Initialising...')

  const loadCitizens = useCitizenStore((s) => s.loadCitizens)
  const loadDebate = useCouncilStore((s) => s.loadDebate)
  const setPolicyText = useCouncilStore((s) => s.setPolicyText)
  const loadTicks = useSimulationStore((s) => s.loadTicks)
  const { setLoading } = useUIStore()

  useEffect(() => {
    const setLoadingWithMsg = (loading: boolean, msg?: string) => {
      if (msg) setLoadMsg(msg)
      setLoading(loading, msg)
      if (!loading) setIsReady(true)
    }

    loadDemoData(
      loadCitizens,
      loadDebate,
      setPolicyText,
      loadTicks,
      setLoadingWithMsg
    )
  }, [])

  if (!isReady) return <Splash message={loadMsg} />

  return (
    <Suspense fallback={<Splash message="Loading interface..." />}>
      <Shell />
    </Suspense>
  )
}
