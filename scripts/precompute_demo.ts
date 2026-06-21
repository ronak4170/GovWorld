/**
 * GOVWORLD Precompute Script
 * Run with: npm run precompute
 * Generates all /src/data/ JSON files using LLM APIs
 *
 * In demo mode, these files are pre-generated and committed.
 * This script regenerates them using Gemini 2.5 Flash.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'src', 'data')

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )
  const data = (await response.json()) as any
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}

function writeData(filename: string, data: any) {
  const path = join(DATA_DIR, filename)
  writeFileSync(path, JSON.stringify(data, null, 2))
  console.log(`✓ Wrote ${filename}`)
}

async function generateCitizens() {
  console.log('Generating 50 citizens...')
  const prompt = `Generate exactly 50 realistic Mumbai residents for Andheri East neighbourhood simulation.
  First 6 must be exactly: C001=Maria Santos (bus driver), C002=Ravi Nair (shop owner), C003=Priya Mehra (civil engineer), C004=Arjun Pillai (retired diabetic), C005=Fatima Sheikh (teacher), C006=Dev Patel (startup founder).
  Return a JSON array matching this TypeScript interface:
  { id: string, name: string, age: number, gender: string, occupation: string, employer: string, monthlyIncome: number, familyStructure: string, healthStatus: string, homeCoords: [number, number], workCoords: [number, number], dailyRoute: [number, number][], skills: string[], fears: string, hopes: string, persona: string, statusColor: string, statusHistory: [], currentPolicyImpact: string, isWorker: boolean, assignedTaskId?: string, isFeatured: boolean, avatarEmoji: string }
  Coordinates must be near Andheri East: lat 19.10-19.13, lng 72.86-72.88`
  const result = await callGemini(prompt)
  return JSON.parse(result)
}

async function generateCouncilDebate() {
  console.log('Generating council debate...')
  const prompt = `Generate a policy council debate for the Sahar Road widening project in Andheri East, Mumbai.
  Policy: Widening of Sahar Road from 2 lanes to 4 lanes — Phase 1, 3.2km stretch, budget ₹42 crore, 12 months.
  Return a JSON object with this structure:
  {
    "members": {
      "economist": { "id": "economist", "name": "The Economist", "avatar": "📊", "color": "text-blue-400", "stance": "...", "argument": "...", "severityScore": 7, "severityLabel": "MODERATE FINANCIAL RISK", "citedEvidence": ["..."], "isStreaming": false, "isComplete": true },
      "advocate": { "id": "advocate", "name": "Community Advocate", "avatar": "🤝", "color": "text-emerald-400", "stance": "...", "argument": "...", "severityScore": 8, "severityLabel": "HIGH SOCIAL IMPACT", "citedEvidence": ["..."], "isStreaming": false, "isComplete": true },
      "engineer": { "id": "engineer", "name": "Civil Engineer", "avatar": "⚙️", "color": "text-amber-400", "stance": "...", "argument": "...", "severityScore": 5, "severityLabel": "MANAGEABLE TECHNICAL RISK", "citedEvidence": ["..."], "isStreaming": false, "isComplete": true },
      "watchdog": { "id": "watchdog", "name": "Corruption Watchdog", "avatar": "🔍", "color": "text-red-400", "stance": "...", "argument": "...", "severityScore": 9, "severityLabel": "HIGH CORRUPTION RISK", "citedEvidence": ["..."], "isStreaming": false, "isComplete": true },
      "climate": { "id": "climate", "name": "Climate Analyst", "avatar": "🌿", "color": "text-teal-400", "stance": "...", "argument": "...", "severityScore": 6, "severityLabel": "MODERATE CLIMATE IMPACT", "citedEvidence": ["..."], "isStreaming": false, "isComplete": true }
    },
    "synthesis": {
      "overallRiskScore": 7,
      "topRisks": ["Contractor delay risk based on Ram Construction history", "Monsoon season disruption in months 3-5", "Budget overrun risk due to utility relocation complexity"],
      "consensusRecommendations": ["Establish independent oversight committee", "Require performance bonds from all contractors", "Pre-position materials before monsoon season"]
    }
  }`
  const result = await callGemini(prompt)
  return JSON.parse(result)
}

async function generateSimulationTicks() {
  console.log('Generating 12 simulation ticks...')
  const prompt = `Generate 12 monthly simulation ticks for the Sahar Road widening project in Andheri East, Mumbai.
  Citizens: C001=Maria Santos (bus driver), C002=Ravi Nair (shop owner), C003=Priya Mehra (civil engineer), C004=Arjun Pillai (retired diabetic), C005=Fatima Sheikh (teacher), C006=Dev Patel (startup founder).

  Key events per month:
  Month 1: Excavation begins Block A — Ravi amber, Maria rerouted
  Month 2: Priya assigned as inspector — Priya green
  Month 3: Monsoon, 14 days lost — Contractor B flagged
  Month 4: Block A complete, Block B starts — Ravi red (peak disruption)
  Month 5: Fatima school dust complaint — Fatima amber
  Month 6: Contractor B misses milestone — red flag fires
  Month 7: Midpoint review — all citizens updated
  Month 8: Block B complete — Ravi still amber
  Month 9: Dev files relocation intent — Dev red
  Month 10: Utility pipe burst — budget +4cr, delay +3 weeks
  Month 11: Block C complete — Ravi amber to green
  Month 12: Road complete — Arjun green (clinic access), Maria normalised

  Return a JSON array of 12 objects matching:
  { month: number, label: string, constructionProgress: number, weatherEvent?: string, citizenUpdates: [{ citizenId: string, newStatus: string, narrative: string, routeChange?: [number, number][] }], events: [{ id: string, tick: number, type: string, title: string, description: string, affectedCitizenIds: string[], severity: string }], mapOverlays: [{ id: string, type: string, coordinates: any, color: string, label: string }] }`
  const result = await callGemini(prompt)
  const parsed = JSON.parse(result)
  return Array.isArray(parsed) ? parsed : parsed.ticks ?? []
}

async function generateLedger() {
  console.log('Generating accountability ledger...')
  const tasks = [
    {
      id: 'T001',
      title: 'Excavation Block A (1.1km)',
      contractor: 'Ram Construction Ltd',
      contractorHistory: 'Completed 4/5 projects. 1 project delayed 8 weeks (2022 Juhu Rd project).',
      assignedWorkers: ['C003', 'BG001', 'BG002', 'BG003'],
      projectedStartDate: '2024-01-01',
      projectedEndDate: '2024-03-31',
      actualStartDate: '2024-01-03',
      actualEndDate: '2024-03-28',
      progressPercent: 100,
      status: 'complete',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 8500000,
      spentToDate: 8320000,
    },
    {
      id: 'T002',
      title: 'Excavation Block B (1.1km)',
      contractor: 'Ram Construction Ltd',
      contractorHistory: 'Completed 4/5 projects. 1 project delayed 8 weeks (2022 Juhu Rd project).',
      assignedWorkers: ['C003', 'BG004', 'BG005', 'BG006'],
      projectedStartDate: '2024-03-01',
      projectedEndDate: '2024-06-30',
      actualStartDate: '2024-03-05',
      actualEndDate: undefined,
      progressPercent: 55,
      status: 'flagged',
      delayDays: 21,
      flagReason: 'Monsoon season caused 14 lost workdays; contractor failed to accelerate as per contract clause 8.3',
      weatherImpactDays: 14,
      budget: 8500000,
      spentToDate: 5100000,
    },
    {
      id: 'T003',
      title: 'Excavation Block C (1.0km)',
      contractor: 'Bharat Infra Pvt Ltd',
      contractorHistory: 'Completed 3/3 projects on time. No flags.',
      assignedWorkers: ['BG007', 'BG008', 'BG009', 'BG010'],
      projectedStartDate: '2024-06-01',
      projectedEndDate: '2024-09-30',
      actualStartDate: undefined,
      actualEndDate: undefined,
      progressPercent: 0,
      status: 'pending',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 7800000,
      spentToDate: 0,
    },
    {
      id: 'T004',
      title: 'Road Laying Block A',
      contractor: 'Ram Construction Ltd',
      contractorHistory: 'Completed 4/5 projects. 1 project delayed 8 weeks (2022 Juhu Rd project).',
      assignedWorkers: ['BG011', 'BG012', 'BG013', 'BG014', 'BG015'],
      projectedStartDate: '2024-03-01',
      projectedEndDate: '2024-05-31',
      actualStartDate: '2024-03-28',
      actualEndDate: '2024-05-25',
      progressPercent: 100,
      status: 'complete',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 5200000,
      spentToDate: 5050000,
    },
    {
      id: 'T005',
      title: 'Road Laying Block B',
      contractor: 'Bharat Infra Pvt Ltd',
      contractorHistory: 'Completed 3/3 projects on time. No flags.',
      assignedWorkers: ['BG016', 'BG017', 'BG018', 'BG019', 'BG020'],
      projectedStartDate: '2024-06-01',
      projectedEndDate: '2024-08-31',
      actualStartDate: undefined,
      actualEndDate: undefined,
      progressPercent: 0,
      status: 'pending',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 5200000,
      spentToDate: 0,
    },
    {
      id: 'T006',
      title: 'Road Laying Block C',
      contractor: 'Bharat Infra Pvt Ltd',
      contractorHistory: 'Completed 3/3 projects on time. No flags.',
      assignedWorkers: ['BG021', 'BG022', 'BG023', 'BG024', 'BG025'],
      projectedStartDate: '2024-09-01',
      projectedEndDate: '2024-11-30',
      actualStartDate: undefined,
      actualEndDate: undefined,
      progressPercent: 0,
      status: 'pending',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 4800000,
      spentToDate: 0,
    },
    {
      id: 'T007',
      title: 'Utility Relocation',
      contractor: 'CityUtil Services',
      contractorHistory: '2/3 projects delayed. Average delay: 3.5 weeks. Under review.',
      assignedWorkers: ['BG026', 'BG027', 'BG028'],
      projectedStartDate: '2024-02-01',
      projectedEndDate: '2024-04-30',
      actualStartDate: '2024-02-05',
      actualEndDate: '2024-04-22',
      progressPercent: 100,
      status: 'complete',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 1800000,
      spentToDate: 1950000,
      flagReason: 'Budget overrun: unexpected underground cable rerouting added ₹1.5 lakh',
    },
    {
      id: 'T008',
      title: 'Signage + Road Markings',
      contractor: 'SignPro Ltd',
      contractorHistory: 'No prior projects on record in this municipality.',
      assignedWorkers: ['BG029', 'BG030'],
      projectedStartDate: '2024-11-01',
      projectedEndDate: '2024-12-31',
      actualStartDate: undefined,
      actualEndDate: undefined,
      progressPercent: 0,
      status: 'pending',
      delayDays: 0,
      weatherImpactDays: 0,
      budget: 200000,
      spentToDate: 0,
    },
  ]

  const summary = {
    totalBudget: 42000000,
    totalSpent: tasks.reduce((sum, t) => sum + t.spentToDate, 0),
    flaggedTasks: tasks.filter((t) => t.status === 'flagged').length,
    totalDelayDays: tasks.reduce((sum, t) => sum + t.delayDays, 0),
    contractorFlags: [
      {
        contractor: 'Ram Construction Ltd',
        reason: 'Block B excavation 21 days behind schedule despite contractual acceleration clause',
        severity: 'critical',
      },
      {
        contractor: 'CityUtil Services',
        reason: 'History of delays (2/3 prior projects). Under municipal review.',
        severity: 'warning',
      },
      {
        contractor: 'SignPro Ltd',
        reason: 'No prior projects on record — performance risk unverifiable',
        severity: 'info',
      },
    ],
  }

  return { tasks, summary }
}

function generatePolicy() {
  return {
    id: 'POL-2024-SAHAR-001',
    title: 'Sahar Road Widening — Phase 1',
    description:
      'Widening of Sahar Road from 2 lanes to 4 lanes — Phase 1 covering a 3.2km stretch from Andheri East Station to MIDC Junction.',
    policyType: 'road',
    targetArea: 'Andheri East, Mumbai',
    budget: 42000000,
    plannedStartDate: '2024-01-01',
    plannedEndDate: '2024-12-31',
    affectedZone: {
      type: 'Polygon',
      coordinates: [
        [
          [72.865, 19.1089],
          [72.875, 19.1089],
          [72.875, 19.118],
          [72.865, 19.118],
          [72.865, 19.1089],
        ],
      ],
    },
    submittedAt: '2023-11-15T10:00:00Z',
  }
}

async function main() {
  console.log('GOVWORLD Precompute Script')
  console.log('==========================')

  mkdirSync(DATA_DIR, { recursive: true })

  // Policy (no LLM needed — deterministic)
  writeData('demo_policy.json', generatePolicy())

  // Ledger (no LLM needed — deterministic from spec)
  writeData('demo_ledger.json', await generateLedger())

  // LLM-generated content
  const hasGeminiKey = !!process.env.GEMINI_API_KEY

  if (!hasGeminiKey) {
    console.warn('\nWARNING: GEMINI_API_KEY not set.')
    console.warn('Skipping LLM generation. Existing JSON files will be used.')
    console.warn('Set GEMINI_API_KEY and re-run to regenerate citizen/council/tick data.\n')
  } else {
    // Citizens
    try {
      const citizens = await generateCitizens()
      writeData('demo_citizens.json', citizens)
    } catch (e) {
      console.warn('Citizens generation failed — keeping existing file:', (e as Error).message)
    }

    // Council debate
    try {
      const debate = await generateCouncilDebate()
      writeData('demo_council_debate.json', debate)
    } catch (e) {
      console.warn('Council debate generation failed — keeping existing file:', (e as Error).message)
    }

    // Simulation ticks
    try {
      const ticks = await generateSimulationTicks()
      writeData('demo_simulation_ticks.json', ticks)
    } catch (e) {
      console.warn('Simulation ticks generation failed — keeping existing file:', (e as Error).message)
    }
  }

  console.log('\nPrecompute complete.')
  console.log('Commit the /src/data/ JSON files and run: npm run demo')
}

main().catch(console.error)
