// Council types — owned by Council Agent
// Represents the 5 adversarial AI council members who debate each policy

export type CouncilMemberId = 'economist' | 'advocate' | 'engineer' | 'watchdog' | 'climate'

export interface CouncilMember {
  id: CouncilMemberId
  name: string                  // e.g. "The Economist"
  avatar: string                // Emoji for display
  color: string                 // Tailwind color class
  stance: string                // One-sentence persona description
  systemPrompt: string          // Full LLM system prompt
  argument: string              // Generated argument text
  severityScore: number         // 1-10 risk rating they assign
  severityLabel: string         // e.g. "HIGH FINANCIAL RISK"
  citedEvidence: string[]       // Sources/data points they cite
  isStreaming: boolean
  isComplete: boolean
}

export interface CouncilDebate {
  policyId: string
  members: CouncilMember[]
  startedAt: string             // ISO datetime
  completedAt?: string          // ISO datetime — set when all members complete
  overallSeverity: number       // Average of all member scores
  synthesis: string             // Final synthesis paragraph after all members complete
}
