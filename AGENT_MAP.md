# AGENT_MAP — Map Agent Specification
## GOVWORLD | Map Layer Owner

---

## YOUR IDENTITY
You are the Map Agent. You own everything visual about the 3D world. You do not touch LLM calls, citizen data logic, or council debate. You render the world. Everything else feeds into you.

## FILES YOU OWN (edit ONLY these)
```
src/components/map/CesiumWorld.tsx
src/components/map/CitizenDots.tsx
src/components/map/ConstructionOverlay.tsx
src/components/map/NeighbourhoodSelector.tsx
src/components/map/MapControls.tsx
src/lib/cesium.ts
src/store/worldStore.ts
src/types/map.ts                    ← create this
```

## FILES YOU MUST NEVER EDIT
```
src/components/citizens/**
src/components/council/**
src/components/simulation/**
src/components/voice/**
src/components/ledger/**
src/store/citizenStore.ts
src/store/councilStore.ts
src/lib/llm.ts
```

## FILES YOU READ (but do not write)
```
src/store/citizenStore.ts           ← read citizen positions + statusColor
src/store/simulationStore.ts        ← read currentTick, constructionProgress
src/store/ledgerStore.ts            ← read task flags for map markers
src/data/demo_citizens.json
src/data/demo_simulation_ticks.json
```

---

## TASK 1 — Cesium World Setup (`src/lib/cesium.ts`)

### What to build
A singleton Cesium Ion viewer initialised with Google Photorealistic 3D Tiles.

### Exact implementation
```typescript
import * as Cesium from 'cesium'

const ANDHERI_EAST = {
  lat: 19.1136,
  lng: 72.8697,
  altitude: 800,   // metres above ground for initial view
}

export function initialiseCesium(containerId: string): Cesium.Viewer {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

  const viewer = new Cesium.Viewer(containerId, {
    terrainProvider: await Cesium.createWorldTerrainAsync(),
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    homeButton: false,
    sceneModePicker: false,
    geocoder: false,
    fullscreenButton: false,
  })

  // Add Google Photorealistic 3D Tiles
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207)
  viewer.scene.primitives.add(tileset)

  // Fly to Andheri East on load
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      ANDHERI_EAST.lng,
      ANDHERI_EAST.lat,
      ANDHERI_EAST.altitude
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0,
    },
    duration: 2,
  })

  return viewer
}
```

### Environment variables needed
```
VITE_CESIUM_TOKEN=          # From cesium.com/ion — free account
VITE_GOOGLE_MAPS_API_KEY=   # From Google Cloud — Maps Tiles API
```

### Fallback (if no Cesium token)
If VITE_CESIUM_TOKEN is missing or the tile load fails, fall back to:
- Leaflet.js with OpenStreetMap tiles
- Same citizen dot overlay but on a flat 2D map
- Show a banner: "3D mode unavailable — displaying 2D map"
- The demo must still work completely on the fallback

---

## TASK 2 — Citizen Dot Overlay (`src/components/map/CitizenDots.tsx`)

### What to build
Three.js overlay rendered on top of the Cesium canvas. Renders 50 coloured spheres that move along their daily routes in a loop.

### Citizen dot spec
```typescript
interface DotConfig {
  citizenId: string
  position: [number, number]        // current [lat, lng]
  statusColor: 'green' | 'amber' | 'red' | 'grey'
  isFeatured: boolean               // C001-C006 are featured
  label?: string                    // Only shown on featured citizens
}

const DOT_SIZES = {
  featured: 0.0003,   // degrees — roughly 20px at street zoom
  background: 0.0002, // roughly 12px
}

const DOT_COLORS = {
  green: '#10B981',   // emerald-500
  amber: '#F59E0B',   // amber-500
  red: '#EF4444',     // red-500
  grey: '#64748B',    // slate-500
}
```

### Movement animation
- Each citizen has a `dailyRoute` array of [lat,lng] waypoints
- Animate movement between waypoints over 60 seconds (full cycle)
- Use `requestAnimationFrame` — update every frame
- Smooth interpolation between waypoints (linear)
- Dots should appear to be commuting — home→work→home loop
- When `simulationStore.isRunning === true`, slow movement to 20% speed (construction chaos)

### Click handling
- On dot click → call `uiStore.setSelectedCitizen(citizenId)`
- On dot hover → show tooltip: "{name}, {age}, {occupation}"
- Featured citizens always show first-name label (never hide it)

### Status colour updates
- Subscribe to `citizenStore.citizens` in Zustand
- When a citizen's `statusColor` changes, animate the dot colour transition over 1 second
- Red dots pulse gently (CSS-like animation via Three.js scale oscillation, ±10%, 1Hz)

---

## TASK 3 — Construction Overlay (`src/components/map/ConstructionOverlay.tsx`)

### What to build
A visual overlay on the Cesium map showing the road construction progress. Renders as a coloured polyline along Sahar Road.

### The road route (Sahar Road, Andheri East)
```typescript
const SAHAR_ROAD_ROUTE: [number, number][] = [
  [19.1089, 72.8612],  // Western start
  [19.1098, 72.8641],
  [19.1110, 72.8668],
  [19.1119, 72.8697],  // Midpoint
  [19.1128, 72.8726],
  [19.1136, 72.8755],
  [19.1142, 72.8784],  // Eastern end
]

// Split into 3 blocks
const BLOCK_A = SAHAR_ROAD_ROUTE.slice(0, 3)  // Months 1-3
const BLOCK_B = SAHAR_ROAD_ROUTE.slice(2, 5)  // Months 3-8
const BLOCK_C = SAHAR_ROAD_ROUTE.slice(4, 7)  // Months 6-12
```

### Visual states per construction phase
```typescript
const OVERLAY_STATES = {
  'pending':      { color: '#94A3B8', width: 4, dash: true,  opacity: 0.5 },
  'excavating':   { color: '#F97316', width: 8, dash: true,  opacity: 0.9 },
  'paving':       { color: '#F59E0B', width: 10, dash: false, opacity: 0.9 },
  'complete':     { color: '#94A3B8', width: 12, dash: false, opacity: 1.0 },
}
```

### Tick-to-visual mapping (read from simulationStore.currentTick)
```
Tick 0:   All blocks pending (grey dashed)
Tick 1-2: Block A excavating (orange dashed)
Tick 3:   Block A paving + Block B excavating
Tick 4-5: Block A complete + Block B excavating
Tick 6-7: Block B paving + Block C excavating
Tick 8:   Block B complete + Block C paving
Tick 9-10: Block C paving (+ utility burst icon at midpoint)
Tick 11:  Block C complete (nearly full grey road)
Tick 12:  All complete — bright road, celebration particle burst
```

### Construction zone markers
- At the active block start, render an orange cone emoji marker
- At the active block end, render a construction sign marker
- Utility burst at Month 10: render a warning icon at coords [19.1119, 72.8697]

---

## TASK 4 — Neighbourhood Selector (`src/components/map/NeighbourhoodSelector.tsx`)

### What to build
The initial input screen shown before the map loads. Allows picking a neighbourhood.

### UI
```
┌─────────────────────────────────────────┐
│  🌍 GOVWORLD                            │
│  The Living City Simulator              │
│                                         │
│  Enter a neighbourhood to simulate:     │
│  [ Andheri East, Mumbai          ] [→]  │
│                                         │
│  Or use demo neighbourhood:             │
│  [ Load Andheri East Demo ]             │
│                                         │
│  ─────────────────────────────          │
│  For demo: click "Load Demo" above      │
└─────────────────────────────────────────┘
```

### Behaviour
- "Load Andheri East Demo" → sets VITE_DEMO_MODE behaviour, loads all pre-computed data
- Free text input → in a real build, would geocode and load real data. For hackathon, show: "Custom neighbourhoods coming soon — loading Andheri East demo"
- On confirm → hide selector, show Cesium map, start citizen population

---

## TASK 5 — Map Controls (`src/components/map/MapControls.tsx`)

### What to build
A floating control bar over the map with camera controls.

### Controls
```
[🏠 Reset View]  [🔍+ Zoom In]  [🔍- Zoom Out]  [🧭 North Up]  [📸 Screenshot]
```

- Reset View: fly back to ANDHERI_EAST default position
- Zoom In/Out: adjust Cesium camera altitude ±20%
- North Up: reset heading to 0
- Screenshot: `viewer.canvas.toDataURL()` → download as PNG

---

## TASK 6 — World Store (`src/store/worldStore.ts`)

### Zustand store interface — implement exactly
```typescript
interface WorldState {
  // Map state
  neighbourhood: string
  centreCoords: [number, number]
  zoomLevel: number
  isMapReady: boolean
  
  // Viewer ref (not serialisable — keep outside Zustand or use ref)
  cesiumViewerRef: React.RefObject<Cesium.Viewer | null>
  
  // Construction
  constructionProgress: number      // 0-100
  activeBlock: 'A' | 'B' | 'C' | 'complete' | null
  
  // Weather overlay
  activeWeatherEvent: string | null
  
  // Actions
  setNeighbourhood: (name: string, coords: [number, number]) => void
  setMapReady: (ready: boolean) => void
  setConstructionProgress: (progress: number) => void
  setActiveBlock: (block: WorldState['activeBlock']) => void
  setWeatherEvent: (event: string | null) => void
  resetView: () => void
}
```

---

## TASK 7 — Map Types (`src/types/map.ts`)

### Create this file
```typescript
export interface MapOverlay {
  id: string
  type: 'construction' | 'hazard' | 'completion' | 'flag'
  coords: [number, number]
  label: string
  tick: number          // Which month this overlay appears
  endTick?: number      // Which month it disappears (optional)
  color: string
  icon: string          // Emoji
}

export interface CesiumConfig {
  token: string
  googleMapsKey: string
  defaultLat: number
  defaultLng: number
  defaultAlt: number
}
```

---

## ACCEPTANCE CRITERIA — Map Agent Complete When:

- [ ] Cesium map loads Andheri East at street level within 4 seconds
- [ ] Fallback to Leaflet works if Cesium token missing
- [ ] 50 citizen dots visible, colour-coded, moving along routes
- [ ] Featured citizens (C001-C006) are larger and labelled
- [ ] Clicking a dot sets selectedCitizen in uiStore (verify by console.log)
- [ ] Construction overlay changes visual state correctly for each of the 12 ticks
- [ ] Map controls all function correctly
- [ ] worldStore exports a fully typed Zustand store
- [ ] Zero TypeScript errors in all owned files
