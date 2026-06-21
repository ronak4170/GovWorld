// LeafletMap — uses Leaflet + OpenStreetMap, no API key required.

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useWorldStore } from '@/store/worldStore'
import { ANDHERI_EAST_COORDS } from '@/lib/constants'
import CitizenDots from './CitizenDots'
import ConstructionOverlay from './ConstructionOverlay'
import MapControls from './MapControls'

// Registers the Leaflet map instance into Zustand once it's ready
function MapReadyHandler() {
  const map = useMap()
  const setMapInstance = useWorldStore((s) => s.setMapInstance)

  useEffect(() => {
    setMapInstance(map)
  }, [map, setMapInstance])

  return null
}

export default function CesiumWorld() {
  return (
    <div className="relative w-full h-full bg-slate-950">
      <MapContainer
        center={[ANDHERI_EAST_COORDS.lat, ANDHERI_EAST_COORDS.lng]}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <MapReadyHandler />
        <CitizenDots />
        <ConstructionOverlay />
      </MapContainer>

      {/* Floating controls render above the map */}
      <MapControls />
    </div>
  )
}
