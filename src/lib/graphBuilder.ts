// MiroFish: graph_builder (Interface 2, Zep GraphRAG).
// Builds an in-memory knowledge graph from the ontology + the citizen population.
// Each citizen becomes an entity node; institutional nodes (contractors, officials,
// NGOs, media) are added so the graph captures the full social field.

import type { Citizen } from '@/types/citizen'
import type { Ontology, KnowledgeGraph, GraphNode, GraphEdge } from '@/types/swarm'

function classifyCitizen(c: Citizen): string {
  const occ = c.occupation.toLowerCase()
  if (/(driver|conductor|transit|bus|auto|taxi)/.test(occ)) return 'TransportWorker'
  if (/(shop|store|owner|vendor|trader|business)/.test(occ)) return 'Shopkeeper'
  if (/(teacher|student|retired|nurse|engineer|founder|clerk|worker|unemployed)/.test(occ)) {
    if (/(cycle|cyclist|commut|founder|engineer)/.test(occ)) return 'Commuter'
    return 'Resident'
  }
  return 'Resident'
}

// Institutional nodes seeded from the demo scenario.
const INSTITUTIONS: { id: string; label: string; type: string; summary: string; attributes: Record<string, string> }[] = [
  { id: 'ORG_ROADS', label: 'Metropolitan Roads Division', type: 'CivicOfficial', summary: 'Authority accountable for the widening project.', attributes: { department: 'Roads & Infrastructure' } },
  { id: 'ORG_RAM', label: 'Ram Construction Ltd', type: 'Contractor', summary: 'Lead contractor — Blocks A & B excavation and laying.', attributes: { track_record: '4/5 on time, 1 delayed 8wks', scope: 'Excavation + laying' } },
  { id: 'ORG_BHARAT', label: 'Bharat Infra Pvt Ltd', type: 'Contractor', summary: 'Contractor — Block C, clean delivery record.', attributes: { track_record: '3/3 on time', scope: 'Excavation + laying' } },
  { id: 'ORG_CITYUTIL', label: 'CityUtil Services', type: 'Contractor', summary: 'Utility relocation, mixed delivery record.', attributes: { track_record: '2/3 delayed', scope: 'Utility relocation' } },
  { id: 'ORG_MOBILITY', label: 'Citizen Mobility Forum', type: 'NGO', summary: 'Advocates for commuters and pedestrians on the corridor.', attributes: { focus: 'Mobility & road safety' } },
  { id: 'ORG_CLEANAIR', label: 'Clean Air Coalition', type: 'NGO', summary: 'Campaigns on dust, emissions and induced traffic.', attributes: { focus: 'Air quality' } },
  { id: 'ORG_DAILY', label: 'San Francisco Chronicle', type: 'MediaOutlet', summary: 'Local newspaper covering the project and procurement.', attributes: { reach: 'Citywide' } },
  { id: 'ORG_INSTA', label: 'Van Ness Neighbors Page', type: 'MediaOutlet', summary: 'Community social page amplifying resident voices.', attributes: { reach: 'Neighbourhood' } },
]

function radialLayout(nodes: GraphNode[]): void {
  // Group by type, place each type group on a ring band.
  const byType = new Map<string, GraphNode[]>()
  for (const n of nodes) {
    if (!byType.has(n.type)) byType.set(n.type, [])
    byType.get(n.type)!.push(n)
  }
  const types = [...byType.keys()]
  const cx = 500
  const cy = 360
  types.forEach((type, ti) => {
    const group = byType.get(type)!
    const ring = 120 + ti * 70
    group.forEach((n, i) => {
      const angle = (i / Math.max(1, group.length)) * Math.PI * 2 + ti * 0.6
      n.x = cx + Math.cos(angle) * ring
      n.y = cy + Math.sin(angle) * ring
    })
  })
}

export function buildGraph(ontology: Ontology, citizens: Citizen[]): KnowledgeGraph {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Central policy node
  nodes.push({
    id: 'POLICY',
    label: 'Van Ness Complete Streets',
    type: 'CivicOfficial',
    attributes: { department: 'Phase 1 — 2.8km' },
    summary: 'The road-widening policy seed at the centre of the simulation.',
  })

  // Institutions
  for (const inst of INSTITUTIONS) {
    nodes.push({ id: inst.id, label: inst.label, type: inst.type, attributes: inst.attributes, summary: inst.summary })
  }

  // Citizens → entity nodes (cap to keep the graph legible)
  const sample = citizens.slice(0, 40)
  for (const c of sample) {
    const type = classifyCitizen(c)
    nodes.push({
      id: `N_${c.id}`,
      label: c.name,
      type,
      citizenId: c.id,
      attributes: { role: c.occupation, status: c.statusColor },
      summary: `${c.name}, ${c.age}, ${c.occupation}. ${c.currentPolicyImpact || c.fears}`,
    })
  }

  let edgeId = 0
  const addEdge = (source: string, target: string, type: string, label: string) => {
    edges.push({ id: `E${edgeId++}`, source, target, type, label })
  }

  // Institutions relate to the policy authority
  addEdge('ORG_RAM', 'POLICY', 'EXECUTES_WORK_FOR', 'executes work for')
  addEdge('ORG_BHARAT', 'POLICY', 'EXECUTES_WORK_FOR', 'executes work for')
  addEdge('ORG_CITYUTIL', 'POLICY', 'EXECUTES_WORK_FOR', 'executes work for')
  addEdge('ORG_MOBILITY', 'POLICY', 'ADVOCATES_FOR', 'lobbies')
  addEdge('ORG_CLEANAIR', 'ORG_CITYUTIL', 'OPPOSES', 'opposes')
  addEdge('ORG_DAILY', 'POLICY', 'REPORTS_ON', 'reports on')
  addEdge('ORG_DAILY', 'ORG_RAM', 'REPORTS_ON', 'investigates')
  addEdge('ORG_INSTA', 'POLICY', 'REPORTS_ON', 'amplifies')

  // Citizen edges by type
  for (const c of sample) {
    const type = classifyCitizen(c)
    const nid = `N_${c.id}`
    switch (type) {
      case 'Commuter':
        addEdge(nid, 'POLICY', 'COMMUTES_THROUGH', 'commutes through')
        addEdge('ORG_MOBILITY', nid, 'ADVOCATES_FOR', 'represents')
        break
      case 'TransportWorker':
        addEdge(nid, 'POLICY', 'COMMUTES_THROUGH', 'drives route through')
        break
      case 'Shopkeeper':
        addEdge(nid, 'POLICY', 'OPERATES_ALONG', 'operates along')
        addEdge(nid, 'POLICY', 'OPPOSES', 'protests')
        break
      default:
        addEdge(nid, 'POLICY', 'LIVES_NEAR', 'lives near')
        addEdge('ORG_CLEANAIR', nid, 'ADVOCATES_FOR', 'represents')
    }
  }

  radialLayout(nodes)

  return {
    id: `graph_${Date.now().toString(36)}`,
    nodes,
    edges,
    entityTypes: ontology.entityTypes.map((e) => e.name),
  }
}
