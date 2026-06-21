// Policy types — shared across all agents
// Represents a government infrastructure policy submitted for simulation

export interface Policy {
  id: string
  title: string
  description: string           // Full text as uploaded
  policyType: 'road' | 'housing' | 'utilities' | 'parks' | 'transit'
  targetArea: string            // Neighbourhood name
  budget: number                // In USD
  plannedStartDate: string      // ISO date
  plannedEndDate: string        // ISO date
  affectedZone: GeoJSONPolygon  // Area polygon on map
  submittedAt: string           // ISO datetime
}

// Minimal GeoJSON Polygon type (avoids external @types/geojson dependency at this stage)
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]  // [[[lng, lat], ...]]
}
