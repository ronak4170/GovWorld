// Citizen types — owned by Citizen Agent
// All other agents depend on this file — do not modify without coordination

export type CitizenStatus = 'green' | 'amber' | 'red' | 'grey'

export interface StatusHistoryEntry {
  tick: number
  status: CitizenStatus
  narrative: string             // What happened this month
  routeChange?: [number, number][]  // New route if rerouted
}

export interface CitizenUpdate {
  citizenId: string
  tick: number
  newStatus: CitizenStatus
  narrative: string
  newPolicyImpact: string
  routeChange?: [number, number][]
}

export interface Citizen {
  // Identity
  id: string                         // Format: "C001", "C002", ... "C050"
  name: string
  age: number
  gender: 'male' | 'female' | 'nonbinary'

  // Work + life
  occupation: string
  employer: string
  monthlyIncome: number              // In USD
  familyStructure: string            // e.g. "Married, 3 children"
  healthStatus: 'healthy' | 'chronic_condition' | 'mobility_limited'

  // Location
  homeCoords: [number, number]       // [lat, lng]
  workCoords: [number, number]
  dailyRoute: [number, number][]     // Ordered waypoints home→work, min 4 waypoints

  // Character
  skills: string[]                   // Max 5 skills
  fears: string                      // One sentence
  hopes: string                      // One sentence
  persona: string                    // Full persona text for voice chat system prompt

  // Simulation state
  statusColor: CitizenStatus
  statusHistory: StatusHistoryEntry[]
  currentPolicyImpact: string        // What's happening to them right now
  isWorker: boolean
  assignedTaskId?: string
  isFeatured: boolean                // true for C001-C006

  // Display
  avatarEmoji: string                // Single emoji representing them
}
