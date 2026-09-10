/**
 * geoUtils.js — Geodesic, Cartographic & Tile Utilities for V2V AgriMap DSP
 *
 * Provides accurate geodetic calculations (Haversine distance, polygon area, perimeter)
 * and crash-resistant, free-tier base map definitions.
 */
import L from 'leaflet'

// ── Geodesic Math ─────────────────────────────────────────────────────────

/**
 * Calculates Haversine distance in meters between two [lat, lng] points.
 */
export function getDistanceMeters(p1, p2) {
  if (!p1 || !p2) return 0
  const R = 6371e3 // Earth radius in meters
  const lat1 = (p1[0] * Math.PI) / 180
  const lat2 = (p2[0] * Math.PI) / 180
  const deltaLat = ((p2[0] - p1[0]) * Math.PI) / 180
  const deltaLng = ((p2[1] - p1[1]) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculates total path length for an array of [lat, lng] points.
 */
export function calculatePathLength(points) {
  if (!points || points.length < 2) return { meters: 0, feet: 0, km: 0 }
  let totalMeters = 0
  for (let i = 0; i < points.length - 1; i++) {
    totalMeters += getDistanceMeters(points[i], points[i + 1])
  }
  return {
    meters: +(totalMeters.toFixed(1)),
    feet: +(totalMeters * 3.28084).toFixed(1),
    km: +(totalMeters / 1000).toFixed(2),
  }
}

/**
 * Calculates perimeter of a closed polygon from [lat, lng] vertices.
 */
export function calculatePerimeter(points) {
  if (!points || points.length < 2) return { meters: 0, feet: 0 }
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    total += getDistanceMeters(points[i], next)
  }
  return {
    meters: +(total.toFixed(1)),
    feet: +(total * 3.28084).toFixed(1),
  }
}

/**
 * Calculates geodesic surface area of a polygon defined by [lat, lng] vertices.
 * Uses spherical projection approximation suitable for farm parcels.
 */
export function calculatePolygonArea(points) {
  if (!points || points.length < 3) {
    return { hectares: 0, acres: 0, sqMeters: 0, sqFeet: 0 }
  }

  // Remove closing duplicate if present
  let clean = [...points]
  if (
    clean.length > 3 &&
    clean[0][0] === clean[clean.length - 1][0] &&
    clean[0][1] === clean[clean.length - 1][1]
  ) {
    clean.pop()
  }
  if (clean.length < 3) return { hectares: 0, acres: 0, sqMeters: 0, sqFeet: 0 }

  const meanLat = (clean.reduce((sum, p) => sum + p[0], 0) / clean.length) * (Math.PI / 180)
  const kx = 111320 * Math.cos(meanLat)
  const ky = 111320

  let area = 0
  for (let i = 0; i < clean.length; i++) {
    const j = (i + 1) % clean.length
    const xi = clean[i][1] * kx
    const yi = clean[i][0] * ky
    const xj = clean[j][1] * kx
    const yj = clean[j][0] * ky
    area += xi * yj - xj * yi
  }

  const sqMeters = Math.abs(area) / 2
  const hectares = +(sqMeters / 10000).toFixed(2)
  const acres = +(hectares * 2.47105).toFixed(2)
  const sqFeet = +(sqMeters * 10.7639).toFixed(0)

  return { hectares, acres, sqMeters: Math.round(sqMeters), sqFeet }
}

/**
 * Validates whether an entity is a valid [lat, lng] array with finite numbers.
 */
export function isValidLatLng(pt) {
  return (
    Array.isArray(pt) &&
    pt.length >= 2 &&
    typeof pt[0] === 'number' &&
    !isNaN(pt[0]) &&
    isFinite(pt[0]) &&
    typeof pt[1] === 'number' &&
    !isNaN(pt[1]) &&
    isFinite(pt[1])
  )
}

/**
 * Robustly extracts an array of Leaflet [lat, lng] points from any GeoJSON Polygon or MultiPolygon geometry.
 * Handles 2, 3, or 4 levels of array nesting safely without ever throwing a TypeError.
 */
export function extractBoundaryLatLngs(geometry) {
  if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) return []
  let coords = geometry.coordinates

  // Recursively unwrap until coords is an array of [lng, lat] coordinate pairs
  while (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
    // If coords[0] is [number, number], we have found the ring of points!
    if (typeof coords[0][0] === 'number') {
      break
    }
    coords = coords[0]
  }

  if (!Array.isArray(coords)) return []

  // Extract points, converting GeoJSON [lng, lat] -> Leaflet [lat, lng]
  const result = []
  for (const pt of coords) {
    if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number' && !isNaN(pt[0]) && !isNaN(pt[1])) {
      result.push([pt[1], pt[0]])
    }
  }

  // Remove duplicate closing point if present
  if (
    result.length > 3 &&
    result[0][0] === result[result.length - 1][0] &&
    result[0][1] === result[result.length - 1][1]
  ) {
    result.pop()
  }

  return result
}

/**
 * Ensures an array of [lng, lat] points is closed and packaged into a standard GeoJSON MultiPolygon coordinates structure (4 levels deep).
 */
export function ensureMultiPolygonCoordinates(ringPoints) {
  if (!Array.isArray(ringPoints) || ringPoints.length < 3) return [[[[]]]]
  const ring = [...ringPoints]
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]])
  }
  return [[ring]]
}

// ── Free, High-Reliability Base Map Providers ──────────────────────────────
export const BASEMAP_OPTIONS = [
  {
    id: 'satellite',
    name: 'Satellite (Esri)',
    icon: '🛰️',
    description: 'High-res satellite aerial photography',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, DigitalGlobe, Earthstar Geographics',
    maxZoom: 19,
    maxNativeZoom: 18,
    hasLabels: true,
  },
  {
    id: 'osm',
    name: 'Roads & Cadastral (OSM)',
    icon: '🗺️',
    description: 'OpenStreetMap standard community vector map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
    hasLabels: false,
  },
  {
    id: 'voyager',
    name: 'Clean Farmland (Carto)',
    icon: '🌿',
    description: 'CartoDB Voyager clean contrast land view',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19,
    maxNativeZoom: 19,
    hasLabels: false,
  },
  {
    id: 'topo',
    name: 'Terrain & Contours',
    icon: '⛰️',
    description: 'OpenTopoMap topographic elevation contours',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap &copy; OpenStreetMap',
    maxZoom: 17,
    maxNativeZoom: 17,
    hasLabels: false,
  },
]

// ── Leaflet Pin & Vertex Icons ─────────────────────────────────────────────

/**
 * Creates an interactive numbered vertex marker pin for boundary editing.
 */
export function createVertexIcon(num, isStart = false, isHovered = false) {
  const bg = isStart ? '#10B981' : isHovered ? '#EC4899' : '#8A57C0'
  const glow = isStart
    ? '0 0 10px rgba(16, 185, 129, 0.9)'
    : isHovered
    ? '0 0 12px rgba(236, 72, 153, 0.9)'
    : '0 0 8px rgba(138, 87, 192, 0.75)'

  return L.divIcon({
    className: 'v2v-vertex-pin',
    html: `
      <div style="
        background: ${bg};
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        box-shadow: ${glow};
        cursor: grab;
        transform: translate(-50%, -50%);
        transition: transform 0.15s ease, background 0.15s ease;
      ">
        ${num}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

/**
 * Standard device/resource pin icon.
 */
export function createPinIcon(emoji, color = '#2E0D5E') {
  return L.divIcon({
    className: 'v2v-pin-icon',
    html: `
      <div style="
        background: ${color};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 2.5px solid #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        color: white;
        transform: translate(-50%, -50%);
      ">
        ${emoji}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}
