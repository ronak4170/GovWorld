import { create } from 'zustand'
import { VAN_NESS_COORDS, DEMO_TOTAL_MONTHS } from '@/lib/constants'

export interface WorldState {
  neighbourhoodName: string
  centreCoords: [number, number]
  mapInstance: any | null
  isMapReady: boolean
  currentMonth: number
  isPlaying: boolean
  playbackSpeed: 1 | 2 | 5
  constructionProgress: number
  activeOverlayIds: string[]
  weatherEvent: string | null

  // Actions
  setMapInstance: (map: any) => void
  setMapReady: (ready: boolean) => void
  setCurrentMonth: (month: number) => void
  setPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: 1 | 2 | 5) => void
  setConstructionProgress: (progress: number) => void
  setWeatherEvent: (event: string | null) => void
  addOverlay: (id: string) => void
  removeOverlay: (id: string) => void
  reset: () => void
}

const initialState = {
  neighbourhoodName: 'Van Ness Avenue, San Francisco',
  centreCoords: [VAN_NESS_COORDS.lat, VAN_NESS_COORDS.lng] as [number, number],
  mapInstance: null,
  isMapReady: false,
  currentMonth: 0,
  isPlaying: false,
  playbackSpeed: 1 as const,
  constructionProgress: 0,
  activeOverlayIds: [],
  weatherEvent: null,
}

export const useWorldStore = create<WorldState>((set) => ({
  ...initialState,
  setMapInstance: (map) => set({ mapInstance: map, isMapReady: true }),
  setMapReady: (ready) => set({ isMapReady: ready }),
  setCurrentMonth: (month) => set({ currentMonth: Math.min(Math.max(month, 0), DEMO_TOTAL_MONTHS) }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setConstructionProgress: (progress) => set({ constructionProgress: progress }),
  setWeatherEvent: (event) => set({ weatherEvent: event }),
  addOverlay: (id) => set((s) => ({ activeOverlayIds: [...s.activeOverlayIds, id] })),
  removeOverlay: (id) => set((s) => ({ activeOverlayIds: s.activeOverlayIds.filter((x) => x !== id) })),
  reset: () => set(initialState),
}))
