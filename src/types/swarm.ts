// MiroFish-style swarm-intelligence engine types.
// Pipeline: Seed → Ontology → Knowledge Graph → Personas → Social Simulation → Report
// Re-implemented natively in TypeScript (MiroFish is Python + Zep + OASIS + LangChain).

// ---------------------------------------------------------------------------
// Ontology (MiroFish Interface 1: ontology_generator)
// ---------------------------------------------------------------------------

export interface EntityAttribute {
  name: string // snake_case
  type: 'text' | 'number'
  description: string
}

export interface EntityTypeDef {
  name: string // PascalCase, e.g. "Commuter", "Person" (fallback)
  description: string
  attributes: EntityAttribute[]
  examples: string[]
  isFallback?: boolean // Person / Organization fallbacks
}

export interface EdgeTypeDef {
  name: string // UPPER_SNAKE_CASE, e.g. "WORKS_FOR"
  description: string
  sourceTargets: { source: string; target: string }[]
}

export interface Ontology {
  entityTypes: EntityTypeDef[]
  edgeTypes: EdgeTypeDef[]
  analysisSummary: string
}

// ---------------------------------------------------------------------------
// Knowledge Graph (MiroFish Interface 2: graph_builder / GraphRAG)
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string
  label: string
  type: string // entity type name
  attributes: Record<string, string>
  summary: string
  citizenId?: string // links the node to a citizen agent
  // radial layout (computed client-side)
  x?: number
  y?: number
}

export interface GraphEdge {
  id: string
  source: string // node id
  target: string // node id
  type: string // edge type name
  label: string
}

export interface KnowledgeGraph {
  id: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  entityTypes: string[]
}

// ---------------------------------------------------------------------------
// Multi-agent social simulation (MiroFish: OASIS dual-platform)
// ---------------------------------------------------------------------------

export type SwarmPlatform = 'reddit' | 'twitter'
export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface AgentPost {
  id: string
  round: number
  platform: SwarmPlatform
  authorId: string // citizen id or graph node id
  authorName: string
  authorRole: string
  avatar?: string
  content: string
  sentiment: Sentiment
  likes: number
  reposts: number
  replyToId?: string // threaded reply
  topics: string[]
}

export interface SwarmRound {
  round: number
  label: string
  posts: AgentPost[]
  sentimentBreakdown: { positive: number; neutral: number; negative: number }
  emergentThemes: string[]
  injectedVariableId?: string
}

// God's-eye view: inject a variable mid-simulation and re-deduce
export interface InjectedVariable {
  id: string
  round: number
  description: string
}

// ---------------------------------------------------------------------------
// Prediction report (MiroFish: report_agent, ReACT + tools)
// ---------------------------------------------------------------------------

export interface ReportToolCall {
  tool: 'graph_search' | 'sentiment_scan' | 'agent_interview' | 'panorama'
  query: string
  result: string
}

export interface ReportSection {
  title: string
  content: string // markdown-ish
  toolCalls: ReportToolCall[]
}

export interface PredictionReport {
  id: string
  title: string
  outline: string[]
  sections: ReportSection[]
  overallSentiment: Sentiment
  riskScore: number // 1-10
  keyPredictions: string[]
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Pipeline state
// ---------------------------------------------------------------------------

export type PipelinePhase =
  | 'idle'
  | 'seed'
  | 'ontology'
  | 'graph'
  | 'personas'
  | 'simulation'
  | 'report'
  | 'complete'

export interface SeedChunk {
  index: number
  text: string
}
