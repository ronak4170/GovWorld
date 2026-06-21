import { create } from 'zustand'
import type { CouncilMember } from '@/types/council'
import type { DebateSentence } from '@/lib/debateOrchestrator'
import type { ResearchFact } from '@/lib/expertResearch'

// ---------------------------------------------------------------------------
// Expert pool definition
// ---------------------------------------------------------------------------

export interface ExpertDefinition {
  id: string
  name: string
  title: string     // e.g. "Constitutional Lawyer"
  avatar: string    // emoji
  color: string     // tailwind text color class
  stance: string    // one-line persona
  systemPrompt: string
  avatarUrl: string // "https://api.dicebear.com/7.x/avataaars/svg?seed={id}"
}

export const EXPERT_POOL: ExpertDefinition[] = [
  {
    id: 'economist',
    name: 'Dr. Sarah Kim',
    title: 'Urban Development Economist',
    avatar: '📊',
    color: 'text-blue-400',
    stance: 'Quantifies long-term economic returns vs. short-term disruption costs for SF businesses',
    systemPrompt: 'You are an urban development economist at UC Berkeley specializing in SF infrastructure ROI and transit corridor economics. You reference SPUR studies, SFMTA data, and Bay Area economic impact analyses.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=economist&backgroundColor=b6e3f4',
  },
  {
    id: 'advocate',
    name: 'Marcus Thompson',
    title: 'Mission District Community Organizer',
    avatar: '🤝',
    color: 'text-emerald-400',
    stance: 'Voices the lived impact on Van Ness corridor small businesses and Tenderloin residents',
    systemPrompt: 'You are a community organizer from the Mission District who has lived in SF for 30 years. You advocate for small business owners, seniors, and low-income residents displaced by Van Ness construction. You reference specific neighborhoods: Tenderloin, Mission, Hayes Valley.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=advocate&backgroundColor=d1d4f9',
  },
  {
    id: 'engineer',
    name: 'Jennifer Torres, PE',
    title: 'Civil & Structural Engineer',
    avatar: '⚙️',
    color: 'text-orange-400',
    stance: 'Assesses technical feasibility, seismic safety standards, and SF construction risk',
    systemPrompt: 'You are a licensed Professional Engineer (PE) with 15 years of experience in SF and Caltrans projects. You assess structural integrity, seismic compliance, ADA requirements, and utility coordination for Bay Area infrastructure. You reference Caltrans standards and SF DPW specifications.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=engineer&backgroundColor=ffd5dc',
  },
  {
    id: 'watchdog',
    name: 'Robert Chen',
    title: 'SF Government Accountability Watchdog',
    avatar: '🔍',
    color: 'text-red-400',
    stance: 'Scrutinises SF contractor procurement, cost overruns, and DPW audit trails',
    systemPrompt: 'You are a government accountability journalist and watchdog who tracks SF public works spending. You investigate contractor bid irregularities, DPW change orders, and SF Controller audit findings. You have covered multiple SF infrastructure scandals.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=watchdog&backgroundColor=ffdfbf',
  },
  {
    id: 'climate',
    name: 'Dr. Patricia Osei',
    title: 'Bay Area Climate Resilience Analyst',
    avatar: '🌿',
    color: 'text-teal-400',
    stance: 'Evaluates carbon footprint, seismic risk, sea level rise, and Bay Area climate resilience',
    systemPrompt: 'You are a climate scientist at the Bay Area Air Quality Management District. You evaluate urban heat island effects, PM2.5 from construction, sea level rise impacts on Van Ness corridor, and the greenhouse gas benefits of BRT over private vehicles. You reference Cal EPA data.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=climate&backgroundColor=c0aede',
  },
  {
    id: 'lawyer',
    name: 'Atty. James Morrison',
    title: 'Land Use & Civil Rights Attorney',
    avatar: '⚖️',
    color: 'text-purple-400',
    stance: 'Reviews SF zoning compliance, ADA requirements, and business owner legal recourse',
    systemPrompt: 'You are a San Francisco land use and civil rights attorney with experience in SF Superior Court. You review CEQA compliance, ADA sidewalk requirements, SF small business rights during public works, and eminent domain issues. You reference SF municipal codes and California law.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lawyer&backgroundColor=ffd5dc',
  },
  {
    id: 'urbanplanner',
    name: 'Alex Tanaka, AICP',
    title: 'SF Planning Department Urban Planner',
    avatar: '🏙️',
    color: 'text-sky-400',
    stance: 'Aligns Van Ness project with SF General Plan, Better Streets Policy, and Vision Zero',
    systemPrompt: 'You are a certified urban planner (AICP) with experience at the SF Planning Department. You align infrastructure projects with the SF General Plan, Better Streets Policy, Vision Zero, and the Transit First policy. You reference SF Planning documents and SFMTA strategic plans.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=urbanplanner&backgroundColor=b6e3f4',
  },
  {
    id: 'health',
    name: 'Dr. Aisha Johnson',
    title: 'UCSF Public Health Researcher',
    avatar: '🏥',
    color: 'text-pink-400',
    stance: 'Tracks PM2.5, noise pollution, and mental health impacts on Tenderloin residents',
    systemPrompt: 'You are a public health researcher at UCSF School of Medicine. You track construction PM2.5 exposure, lead paint dust from older SF buildings, noise-induced stress, and health disparities affecting Tenderloin and Mission residents during the Van Ness project.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=health&backgroundColor=d1d4f9',
  },
  {
    id: 'transport',
    name: 'Dr. Kevin Murphy',
    title: 'SFMTA Transportation Analyst',
    avatar: '🚌',
    color: 'text-yellow-400',
    stance: 'Models Van Ness BRT impact on Muni ridership, traffic flow, and cyclist safety',
    systemPrompt: 'You are a transportation engineer with expertise in SF traffic modeling and SFMTA bus rapid transit implementation. You model the impact of Van Ness BRT on Muni lines 47 and 49, intersection level of service, cyclist safety on alternate routes, and ride-share spillover.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=transport&backgroundColor=ffdfbf',
  },
  {
    id: 'heritage',
    name: 'Dr. Linda Fernandez',
    title: 'SF Heritage Foundation Director',
    avatar: '🏛️',
    color: 'text-amber-400',
    stance: 'Protects SF Landmark buildings, Victorian corridor character, and auto row heritage',
    systemPrompt: 'You are the director of SF Heritage Foundation. You protect Victorian and Edwardian building facades along Van Ness, advocate for the historic auto row character, and review construction vibration impacts on unreinforced masonry buildings. You reference SF Landmark designations and CEQA cultural resources review.',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=heritage&backgroundColor=c0aede',
  },
]

// ---------------------------------------------------------------------------
// Extended member type used inside the store (id is string, not the narrow
// CouncilMemberId union, because we now support all 10 experts)
// ---------------------------------------------------------------------------

export interface DebateMember extends Omit<ExpertDefinition, 'id'> {
  id: string
  argument: string
  severityScore: number
  severityLabel: string
  citedEvidence: string[]
  isStreaming: boolean
  isComplete: boolean
}

// Helper: turn an ExpertDefinition into an empty DebateMember ready for debate
export function expertToDebateMember(expert: ExpertDefinition): DebateMember {
  return {
    ...expert,
    argument: '',
    severityScore: 0,
    severityLabel: '',
    citedEvidence: [],
    isStreaming: false,
    isComplete: false,
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface DebateSynthesis {
  overallRiskScore: number
  topRisks: string[]
  consensusRecommendations: string[]
}

const DEFAULT_SELECTED = ['economist', 'advocate', 'engineer', 'watchdog', 'climate']

// ---------------------------------------------------------------------------
// Debate Arena types
// ---------------------------------------------------------------------------

export interface DebateTurn {
  expertId: string
  expertName: string
  expertTitle: string
  argument: string
  isStreaming: boolean
  isResearching: boolean
  isComplete: boolean
  severityScore: number
  severityLabel: string
  researchFacts: ResearchFact[]
  citedEvidence: string[]
  round: number
  timestamp: number
}

interface CouncilState {
  // Expert selection
  selectedExpertIds: string[]
  toggleExpert: (id: string) => void

  // Live debate tracking
  speakingExpertId: string | null
  setSpeakingExpert: (id: string | null) => void

  // Debate members (populated when debate starts)
  members: DebateMember[]
  isDebating: boolean
  isComplete: boolean
  policyText: string
  overallRiskScore: number
  topRisks: string[]
  consensusRecommendations: string[]

  // Debate Arena state
  debateHistory: DebateTurn[]
  currentRound: number
  isDebateArenaOpen: boolean

  // Cinematic 3D Council Arena
  isCouncilArenaOpen: boolean
  debatePlaybackState: 'idle' | 'playing' | 'paused' | 'complete'
  currentSentence: DebateSentence | null
  currentSentenceText: string
  debateQueue: DebateSentence[]
  debateProgress: number
  isMuted: boolean
  introComplete: boolean
  pendingArenaStart: boolean

  // Actions
  loadDebate: (members: CouncilMember[], synthesis: DebateSynthesis) => void
  setPolicyText: (text: string) => void
  startDebate: () => void
  updateMember: (id: string, updates: Partial<DebateMember>) => void
  completeDebate: () => void
  reset: () => void

  // Debate Arena actions
  setDebateArenaOpen: (open: boolean) => void
  addTurn: (turn: Omit<DebateTurn, 'timestamp'>) => void
  updateTurn: (expertId: string, round: number, updates: Partial<DebateTurn>) => void
  startNewRound: () => void
  clearHistory: () => void

  // Cinematic Council Arena actions
  setCouncilArenaOpen: (open: boolean) => void
  setDebatePlaybackState: (state: CouncilState['debatePlaybackState']) => void
  setCurrentSentence: (sentence: DebateSentence | null) => void
  setCurrentSentenceText: (text: string) => void
  setDebateQueue: (queue: DebateSentence[]) => void
  setDebateProgress: (progress: number) => void
  setMuted: (muted: boolean) => void
  setIntroComplete: (complete: boolean) => void
  setPendingArenaStart: (pending: boolean) => void
  resetCouncilArena: () => void
}

export const useCouncilStore = create<CouncilState>((set, get) => ({
  selectedExpertIds: [...DEFAULT_SELECTED],
  speakingExpertId: null,

  members: [],
  isDebating: false,
  isComplete: false,
  policyText: '',
  overallRiskScore: 0,
  topRisks: [],
  consensusRecommendations: [],

  // Debate Arena
  debateHistory: [],
  currentRound: 1,
  isDebateArenaOpen: false,

  // Cinematic Council Arena
  isCouncilArenaOpen: false,
  debatePlaybackState: 'idle',
  currentSentence: null,
  currentSentenceText: '',
  debateQueue: [],
  debateProgress: 0,
  isMuted: false,
  introComplete: false,
  pendingArenaStart: false,

  // -------------------------------------------------------------------------
  // Expert selection
  // -------------------------------------------------------------------------

  toggleExpert: (id) =>
    set((s) => {
      const current = s.selectedExpertIds
      if (current.includes(id)) {
        if (current.length <= 2) return {} // min 2
        return { selectedExpertIds: current.filter((x) => x !== id) }
      } else {
        if (current.length >= 7) return {} // max 7
        return { selectedExpertIds: [...current, id] }
      }
    }),

  setSpeakingExpert: (id) => set({ speakingExpertId: id }),

  // -------------------------------------------------------------------------
  // Debate lifecycle
  // -------------------------------------------------------------------------

  loadDebate: (legacyMembers, synthesis) => {
    // Convert legacy CouncilMember[] (from pre-computed JSON) to DebateMember[]
    const members: DebateMember[] = legacyMembers.map((m) => {
      const expert = EXPERT_POOL.find((e) => e.id === m.id)
      return {
        id: m.id,
        name: expert?.name ?? m.name,
        title: expert?.title ?? m.stance,
        avatar: expert?.avatar ?? m.avatar,
        color: expert?.color ?? m.color,
        stance: expert?.stance ?? m.stance,
        systemPrompt: expert?.systemPrompt ?? m.systemPrompt,
        avatarUrl:
          expert?.avatarUrl ??
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`,
        argument: m.argument,
        severityScore: m.severityScore,
        severityLabel: m.severityLabel,
        citedEvidence: m.citedEvidence,
        isStreaming: false,
        isComplete: true,
      }
    })
    set({
      members,
      overallRiskScore: synthesis.overallRiskScore,
      topRisks: synthesis.topRisks,
      consensusRecommendations: synthesis.consensusRecommendations,
      isComplete: true,
    })
  },

  setPolicyText: (text) => set({ policyText: text }),

  startDebate: () =>
    set((s) => {
      // Build fresh DebateMember list from selected experts
      const members: DebateMember[] = s.selectedExpertIds
        .map((id) => EXPERT_POOL.find((e) => e.id === id))
        .filter((e): e is ExpertDefinition => e !== undefined)
        .map(expertToDebateMember)

      return {
        isDebating: true,
        isComplete: false,
        speakingExpertId: null,
        members,
      }
    }),

  updateMember: (id, updates) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  completeDebate: () =>
    set((s) => ({
      isDebating: false,
      isComplete: true,
      speakingExpertId: null,
      members: s.members.map((m) => ({ ...m, isStreaming: false, isComplete: true })),
    })),

  reset: () =>
    set({
      members: [],
      isDebating: false,
      isComplete: false,
      policyText: '',
      overallRiskScore: 0,
      topRisks: [],
      consensusRecommendations: [],
      speakingExpertId: null,
    }),

  // -------------------------------------------------------------------------
  // Debate Arena actions
  // -------------------------------------------------------------------------

  setDebateArenaOpen: (open) => set({ isDebateArenaOpen: open }),

  addTurn: (turn) =>
    set((s) => ({
      debateHistory: [...s.debateHistory, { ...turn, timestamp: Date.now() }],
    })),

  updateTurn: (expertId, round, updates) =>
    set((s) => ({
      debateHistory: s.debateHistory.map((t) =>
        t.expertId === expertId && t.round === round ? { ...t, ...updates } : t
      ),
    })),

  startNewRound: () =>
    set((s) => ({ currentRound: s.currentRound + 1 })),

  clearHistory: () =>
    set({ debateHistory: [], currentRound: 1 }),

  // -------------------------------------------------------------------------
  // Cinematic Council Arena
  // -------------------------------------------------------------------------

  setCouncilArenaOpen: (open) => set({ isCouncilArenaOpen: open }),

  setDebatePlaybackState: (state) => set({ debatePlaybackState: state }),

  setCurrentSentence: (sentence) => set({ currentSentence: sentence }),

  setCurrentSentenceText: (text) => set({ currentSentenceText: text }),

  setDebateQueue: (queue) => set({ debateQueue: queue }),

  setDebateProgress: (progress) => set({ debateProgress: progress }),

  setMuted: (muted) => set({ isMuted: muted }),

  setIntroComplete: (complete) => set({ introComplete: complete }),

  setPendingArenaStart: (pending) => set({ pendingArenaStart: pending }),

  resetCouncilArena: () =>
    set({
      debatePlaybackState: 'idle',
      currentSentence: null,
      currentSentenceText: '',
      debateQueue: [],
      debateProgress: 0,
      speakingExpertId: null,
      introComplete: false,
      pendingArenaStart: false,
    }),
}))
