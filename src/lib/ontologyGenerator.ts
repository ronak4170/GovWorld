// MiroFish: ontology_generator (Interface 1).
// Analyses the policy seed and produces entity types + relationship (edge) types
// suitable for a social/opinion simulation. Entities must be real actors that can
// "speak" and interact — never abstract concepts.
//
// Tries the LLM (via llm.ts) first; falls back to a deterministic ontology so the
// demo always works with zero API calls.

import type { Ontology } from '@/types/swarm'
import { generateOntology as llmGenerateOntology } from '@/lib/llm'

// Deterministic ontology tuned to an urban infrastructure / road-widening policy.
// 10 entity types (8 specific + Person/Organization fallbacks), 8 edge types.
export const FALLBACK_ONTOLOGY: Ontology = {
  analysisSummary:
    'The seed describes an urban road-widening infrastructure policy. The actors who will publicly react and interact are commuters, shopkeepers, residents, transport workers, contractors, civic officials, NGOs and local media. Relationships capture who affects, opposes, employs, reports on and lives along the corridor.',
  entityTypes: [
    {
      name: 'Commuter',
      description: 'Individuals who travel the affected corridor daily for work or study.',
      attributes: [
        { name: 'mode', type: 'text', description: 'Transport mode (bus, cycle, car, walk)' },
        { name: 'commute_minutes', type: 'number', description: 'Daily one-way commute time' },
      ],
      examples: ['Maria Santos (bus driver)', 'Dev Patel (cyclist)'],
    },
    {
      name: 'Shopkeeper',
      description: 'Owners of storefronts and small businesses along the construction zone.',
      attributes: [
        { name: 'business_type', type: 'text', description: 'Kind of shop' },
        { name: 'revenue_impact', type: 'text', description: 'Effect on revenue' },
      ],
      examples: ['Ravi Nair (roadside shop owner)'],
    },
    {
      name: 'Resident',
      description: 'People who live adjacent to the corridor and experience noise, dust and access changes.',
      attributes: [
        { name: 'household', type: 'text', description: 'Household structure' },
        { name: 'health_sensitivity', type: 'text', description: 'Relevant health concerns' },
      ],
      examples: ['Arjun Pillai (retired, diabetic)', 'Fatima Sheikh (teacher)'],
    },
    {
      name: 'TransportWorker',
      description: 'Bus drivers, auto/taxi operators and transit staff whose routes change.',
      attributes: [{ name: 'employer', type: 'text', description: 'Transit operator' }],
      examples: ['SFMTA bus drivers', 'Muni operators'],
    },
    {
      name: 'Contractor',
      description: 'Construction firms executing excavation, laying and utility work.',
      attributes: [
        { name: 'track_record', type: 'text', description: 'Delivery history' },
        { name: 'scope', type: 'text', description: 'Work package' },
      ],
      examples: ['Bay Area Infrastructure Inc.', 'Golden Gate Civil Works'],
    },
    {
      name: 'CivicOfficial',
      description: 'Municipal / ward officials and the roads department accountable for the project.',
      attributes: [{ name: 'department', type: 'text', description: 'Governing body' }],
      examples: ['Metropolitan Roads Division', 'Ward office'],
    },
    {
      name: 'NGO',
      description: 'Advocacy and community groups representing affected residents and commuters.',
      attributes: [{ name: 'focus', type: 'text', description: 'Cause area' }],
      examples: ['Citizen mobility forum', 'Clean air coalition'],
    },
    {
      name: 'MediaOutlet',
      description: 'Local newspapers, TV and online creators reporting on the project.',
      attributes: [{ name: 'reach', type: 'text', description: 'Audience size' }],
      examples: ['San Francisco Chronicle', 'Neighbourhood Instagram page'],
    },
    {
      name: 'Person',
      description: 'Fallback for any individual who does not fit a more specific type.',
      attributes: [{ name: 'role', type: 'text', description: 'Their role in the event' }],
      examples: ['A passer-by', 'An anonymous online commenter'],
      isFallback: true,
    },
    {
      name: 'Organization',
      description: 'Fallback for any institution that does not fit a more specific type.',
      attributes: [{ name: 'kind', type: 'text', description: 'Type of organization' }],
      examples: ['A local school', 'A utility company'],
      isFallback: true,
    },
  ],
  edgeTypes: [
    {
      name: 'COMMUTES_THROUGH',
      description: 'An actor travels the affected corridor.',
      sourceTargets: [
        { source: 'Commuter', target: 'CivicOfficial' },
        { source: 'TransportWorker', target: 'CivicOfficial' },
      ],
    },
    {
      name: 'OPERATES_ALONG',
      description: 'A business sits on the construction frontage.',
      sourceTargets: [{ source: 'Shopkeeper', target: 'CivicOfficial' }],
    },
    {
      name: 'LIVES_NEAR',
      description: 'A resident lives adjacent to the works.',
      sourceTargets: [{ source: 'Resident', target: 'CivicOfficial' }],
    },
    {
      name: 'EXECUTES_WORK_FOR',
      description: 'A contractor delivers part of the project for the authority.',
      sourceTargets: [{ source: 'Contractor', target: 'CivicOfficial' }],
    },
    {
      name: 'EMPLOYS',
      description: 'A contractor or operator employs workers.',
      sourceTargets: [
        { source: 'Contractor', target: 'Person' },
        { source: 'Contractor', target: 'Resident' },
      ],
    },
    {
      name: 'ADVOCATES_FOR',
      description: 'An NGO represents an affected group.',
      sourceTargets: [
        { source: 'NGO', target: 'Resident' },
        { source: 'NGO', target: 'Commuter' },
      ],
    },
    {
      name: 'REPORTS_ON',
      description: 'Media covers the project and its actors.',
      sourceTargets: [
        { source: 'MediaOutlet', target: 'CivicOfficial' },
        { source: 'MediaOutlet', target: 'Contractor' },
      ],
    },
    {
      name: 'OPPOSES',
      description: 'An actor publicly opposes a decision or party.',
      sourceTargets: [
        { source: 'Shopkeeper', target: 'CivicOfficial' },
        { source: 'NGO', target: 'Contractor' },
      ],
    },
  ],
}

export async function generateOntology(seedText: string): Promise<Ontology> {
  try {
    const ont = await llmGenerateOntology(seedText)
    if (ont && ont.entityTypes?.length) return ont
  } catch {
    // fall through to deterministic ontology
  }
  return FALLBACK_ONTOLOGY
}
