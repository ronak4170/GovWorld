// Simulation types — owned by Simulation Agent
// Represents the tick-based engine that advances time through 12 months

import type { CitizenStatus } from './citizen'

export interface CitizenUpdate {
  citizenId: string
  newStatus: CitizenStatus
  narrative: string             // What happened to them this month
  routeChange?: [number, number][]
}

export interface SimulationEvent {
  id: string
  tick: number
  type: 'construction' | 'displacement' | 'employment' | 'closure' | 'completion' | 'flag'
  title: string
  description: string
  affectedCitizenIds: string[]
  severity: 'info' | 'warning' | 'critical'
}

export interface MapOverlay {
  id: string
  type: 'construction_zone' | 'completed_road' | 'weather' | 'flag' | 'worker'
  label: string
  coordinates: [number, number][]   // Polyline or polygon coordinates [lat, lng]
  color: string                     // CSS color or named color
  style: 'dashed' | 'solid' | 'dotted'
  visible: boolean
  opacity: number                   // 0-1
}

export interface SimulationTick {
  month: number                 // 1-12
  label: string                 // e.g. "Month 3 — Construction Phase 1"
  constructionProgress: number  // 0-100 percentage
  weatherEvent?: string         // e.g. "Winter storm — 14 workdays lost"
  citizenUpdates: CitizenUpdate[]
  events: SimulationEvent[]
  mapOverlays: MapOverlay[]     // What appears/disappears on the 3D map
}

export interface SimulationState {
  currentTick: number           // 0 = pre-construction, 1-12 = active months
  isPlaying: boolean
  speed: 1 | 2 | 5             // Playback speed multiplier
  ticks: SimulationTick[]
  completedTicks: number[]      // Which ticks have been processed
}
