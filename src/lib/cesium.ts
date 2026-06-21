import * as Cesium from 'cesium'

// Van Ness & Market — midpoint of the Van Ness Complete Streets project (2.3km stretch)
export const VAN_NESS = {
  lat: 37.7790,
  lng: -122.4193,
  height: 500,
}

export const VAN_NESS_ROUTE: [number, number][] = [
  [37.7749, -122.4194],
  [37.7769, -122.4196],
  [37.7779, -122.4200],
  [37.7790, -122.4205],
  [37.7800, -122.4210],
  [37.7811, -122.4215],
  [37.7821, -122.4220],
  [37.7841, -122.4228],
  [37.7861, -122.4233],
  [37.7900, -122.4247],
]

export interface CesiumViewerOptions {
  containerId: string
  googleApiKey?: string
  onReady?: (viewer: Cesium.Viewer) => void
}

export async function initCesiumViewer(options: CesiumViewerOptions): Promise<Cesium.Viewer> {
  const viewer = new Cesium.Viewer(options.containerId, {
    timeline: false,
    animation: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    geocoder: false,
    fullscreenButton: false,
    shadows: true,
    terrainShadows: Cesium.ShadowMode.ENABLED,
  })

  // Call onReady immediately so the UI is usable — tiles load in background
  flyToVanNess(viewer)
  options.onReady?.(viewer)

  // Load Google Photorealistic 3D Tiles async (non-blocking)
  if (options.googleApiKey) {
    Cesium.createGooglePhotorealistic3DTileset({ key: options.googleApiKey })
      .then((tileset) => viewer.scene.primitives.add(tileset))
      .catch((e) => console.warn('Google 3D Tiles unavailable:', e))
  }

  return viewer
}

export function flyToVanNess(viewer: Cesium.Viewer, heightMeters = 600): void {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(VAN_NESS.lng, VAN_NESS.lat, heightMeters),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0,
    },
    duration: 2,
  })
}

export function addConstructionPolyline(
  viewer: Cesium.Viewer,
  coordinates: [number, number][],
  color: string,
  width = 8
): Cesium.Entity {
  const positions = coordinates.map(([lat, lng]) =>
    Cesium.Cartesian3.fromDegrees(lng, lat, 2)
  )
  return viewer.entities.add({
    polyline: {
      positions,
      width,
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString(color).withAlpha(0.85)
      ),
      clampToGround: true,
    },
  })
}

export function removeEntity(viewer: Cesium.Viewer, entity: Cesium.Entity): void {
  viewer.entities.remove(entity)
}

export function getCesiumColor(statusColor: 'green' | 'amber' | 'red' | 'grey'): Cesium.Color {
  switch (statusColor) {
    case 'green': return Cesium.Color.fromCssColorString('#76b900')
    case 'amber': return Cesium.Color.fromCssColorString('#f59e0b')
    case 'red':   return Cesium.Color.fromCssColorString('#ef4444')
    case 'grey':  return Cesium.Color.fromCssColorString('#757575')
  }
}

export function screenToWorld(
  viewer: Cesium.Viewer,
  x: number,
  y: number
): { lat: number; lng: number } | null {
  const cartesian = viewer.scene.pickPosition(new Cesium.Cartesian2(x, y))
  if (!cartesian) return null
  const carto = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lng: Cesium.Math.toDegrees(carto.longitude),
  }
}

export function addBillboard(
  viewer: Cesium.Viewer,
  lat: number,
  lng: number,
  label: string,
  color: string
): Cesium.Entity {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 5),
    label: {
      text: label,
      font: '14px Inter, sans-serif',
      fillColor: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20),
    },
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
  })
}

export function getConstructionColor(month: number): string {
  if (month <= 3) return '#76b900'   // orange — excavation
  if (month <= 8) return '#f59e0b'   // amber — active construction
  if (month <= 11) return '#eab308'  // yellow — paving
  return '#ffffff'                    // white/grey — complete
}
