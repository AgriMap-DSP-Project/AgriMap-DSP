/**
 * farmStorage.js — Resilient Data Access Layer for V2V Tech AgriMap DSP
 *
 * Provides offline-first / preview-ready data persistence with seamless localStorage backing.
 * Enables full CRUD on Farmers, Land Boundaries, Borewells, CCTV Cameras, Pipelines, and Crop Zones.
 */
import {
  INITIAL_FARMERS,
  FIELD_1_GEOJSON,
  FIELD_2_GEOJSON,
  FIELD_3_GEOJSON,
  FIELD_4_GEOJSON,
  INITIAL_PROJECTS,
} from './mockData'
import { extractBoundaryLatLngs, ensureMultiPolygonCoordinates } from './geoUtils'

const STORAGE_KEYS = {
  FARMERS: 'v2v_farmers_v3',
  GEOJSON_PREFIX: 'v2v_field_geojson_v3_',
  PROJECTS: 'v2v_projects_v3',
}

const DEFAULT_FIELD_MAP = {
  'field-1': FIELD_1_GEOJSON,
  'field-2': FIELD_2_GEOJSON,
  'field-3': FIELD_3_GEOJSON,
  'field-4': FIELD_4_GEOJSON,
}

// ── Initialization Helper ──────────────────────────────────────────────────
function getStoredOrInit(key, initialData) {
  try {
    const raw = localStorage.getItem(key)
    if (raw && raw !== 'undefined' && raw !== 'null') return JSON.parse(raw)
  } catch (e) {
    console.warn(`[farmStorage] Failed to read ${key} from storage:`, e)
  }
  try {
    localStorage.setItem(key, JSON.stringify(initialData))
  } catch (e) {
    /* ignore */
  }
  return initialData
}

/**
 * Sanitizes GeoJSON data to ensure field coordinates are guaranteed valid
 * 4-level MultiPolygon and point features have valid numerical coordinates.
 */
function sanitizeGeoJSON(raw, fallback) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.features) || raw.features.length === 0) {
    return JSON.parse(JSON.stringify(fallback || FIELD_1_GEOJSON))
  }
  const cleanFeatures = []
  for (const f of raw.features) {
    if (!f || !f.geometry) continue
    const ent = f.properties?.entity_type
    if (ent === 'field') {
      const latlngs = extractBoundaryLatLngs(f.geometry)
      if (latlngs.length >= 3) {
        const geoCoords = latlngs.map(([lat, lng]) => [lng, lat])
        f.geometry.type = 'MultiPolygon'
        f.geometry.coordinates = ensureMultiPolygonCoordinates(geoCoords)
      }
      cleanFeatures.push(f)
    } else if (f.geometry.type === 'Point') {
      const c = f.geometry.coordinates
      if (Array.isArray(c) && typeof c[0] === 'number' && !isNaN(c[0]) && typeof c[1] === 'number' && !isNaN(c[1])) {
        cleanFeatures.push(f)
      }
    } else {
      cleanFeatures.push(f)
    }
  }
  raw.features = cleanFeatures
  return raw
}

// ── Farmers CRUD ──────────────────────────────────────────────────────────
export const farmStorage = {
  // 1. Get all farmers
  getFarmers: () => {
    return getStoredOrInit(STORAGE_KEYS.FARMERS, INITIAL_FARMERS)
  },

  // 2. Get single farmer by ID
  getFarmerById: (id) => {
    const farmers = farmStorage.getFarmers()
    return farmers.find(f => f.id === id) || farmers[0]
  },

  // 3. Create a new farmer
  createFarmer: (farmerData = {}) => {
    const farmers = farmStorage.getFarmers()
    const id = farmerData.id || `farmer-${Date.now()}`
    const fieldId = farmerData.field_id || `field-${Date.now()}`
    const newFarmer = {
      id,
      field_id: fieldId,
      created_at: new Date().toISOString(),
      borewells_count: 1,
      cctv_count: 1,
      sensors_count: 2,
      readiness_score: 9.0,
      power_status: '3-Phase Grid (Active)',
      ...farmerData,
    }
    const updated = [newFarmer, ...farmers]
    localStorage.setItem(STORAGE_KEYS.FARMERS, JSON.stringify(updated))

    // Initialize an empty/starter GeoJSON for this new farmer ONLY if not already saved!
    const key = STORAGE_KEYS.GEOJSON_PREFIX + fieldId
    const existing = localStorage.getItem(key)
    if (!existing) {
      const starterGeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'MultiPolygon',
              coordinates: [
                [
                  [
                    [77.0102, 10.6565],
                    [77.0155, 10.6570],
                    [77.0162, 10.6608],
                    [77.0128, 10.6618],
                    [77.0098, 10.6598],
                    [77.0102, 10.6565],
                  ]
                ]
              ]
            },
            properties: {
              entity_type: 'field',
              id: fieldId,
              name: `${newFarmer.full_name}'s Farmland`,
              farmer_id: id,
              farmer_name: newFarmer.full_name,
              calculated_area_hectares: newFarmer.total_hectares || 8.0,
              calculated_area_acres: newFarmer.total_acres || 19.7,
              verification_status: 'verified',
              survey_number: newFarmer.khata_number || 'New Survey',
            }
          },
          // Default initial borewell
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [77.0118, 10.6578] },
            properties: {
              entity_type: 'resource',
              id: `res-bw-${Date.now()}`,
              name: 'Primary Solar Borewell #1',
              resource_class: 'WATER',
              resource_type: 'borewell_pump',
              status: 'ACTIVE_RUNNING',
              pump_capacity_hp: '10.0 HP Solar Hybrid',
              depth_feet: 450,
              flow_rate_lpm: 150,
              yesterday_runtime_hours: 4.5,
              yesterday_water_pumped_liters: 40500,
              power_source: 'Solar + 3-Phase Grid',
              verification_status: 'verified',
            }
          },
          // Default initial CCTV
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [77.0121, 10.6580] },
            properties: {
              entity_type: 'device',
              id: `cctv-${Date.now()}`,
              device_name: 'CCTV 01 — Pump Station & Security',
              device_type: 'cctv_camera',
              status: 'ONLINE',
              camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
              resolution: '3840 x 2160 (4K UHD)',
              live_feed_simulated: true,
              verification_status: 'verified',
            }
          }
        ]
      }
      farmStorage.saveFieldGeoJSON(fieldId, starterGeoJSON)
    }

    return newFarmer
  },

  // 4. Update farmer
  updateFarmer: (id, updateData) => {
    const farmers = farmStorage.getFarmers()
    const index = farmers.findIndex(f => f.id === id)
    if (index === -1) return null
    farmers[index] = { ...farmers[index], ...updateData, updated_at: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEYS.FARMERS, JSON.stringify(farmers))
    return farmers[index]
  },

  // 5. Delete farmer
  deleteFarmer: (id) => {
    const farmers = farmStorage.getFarmers()
    const target = farmers.find(f => f.id === id)
    const updated = farmers.filter(f => f.id !== id)
    localStorage.setItem(STORAGE_KEYS.FARMERS, JSON.stringify(updated))
    if (target?.field_id) {
      localStorage.removeItem(STORAGE_KEYS.GEOJSON_PREFIX + target.field_id)
    }
    return true
  },

  // ── Field GeoJSON CRUD ──────────────────────────────────────────────────
  getFieldGeoJSON: (fieldId) => {
    const safeFieldId = fieldId || 'field-1'
    const fallback = DEFAULT_FIELD_MAP[safeFieldId] || FIELD_1_GEOJSON
    const key = STORAGE_KEYS.GEOJSON_PREFIX + safeFieldId
    const stored = getStoredOrInit(key, fallback)
    const sanitized = sanitizeGeoJSON(stored, fallback)
    return sanitized
  },

  saveFieldGeoJSON: (fieldId, geojsonData) => {
    const safeFieldId = fieldId || 'field-1'
    const key = STORAGE_KEYS.GEOJSON_PREFIX + safeFieldId
    try {
      localStorage.setItem(key, JSON.stringify(geojsonData))
    } catch (e) {
      console.warn('[farmStorage] Failed to save GeoJSON:', e)
    }
    return geojsonData
  },

  // ── Device & Resource Manipulation ──────────────────────────────────────
  addFeatureToField: (fieldId, newFeature) => {
    const gj = farmStorage.getFieldGeoJSON(fieldId)
    const updated = {
      ...gj,
      features: [...gj.features, newFeature]
    }
    farmStorage.saveFieldGeoJSON(fieldId, updated)
    return updated
  },

  updateFeatureInField: (fieldId, featureId, updatedProps, updatedCoords = null) => {
    const gj = farmStorage.getFieldGeoJSON(fieldId)
    const updatedFeatures = gj.features.map(f => {
      if (f.properties?.id === featureId) {
        return {
          ...f,
          geometry: updatedCoords ? { ...f.geometry, coordinates: updatedCoords } : f.geometry,
          properties: {
            ...f.properties,
            ...updatedProps,
          }
        }
      }
      return f
    })
    const updated = { ...gj, features: updatedFeatures }
    farmStorage.saveFieldGeoJSON(fieldId, updated)
    return updated
  },

  deleteFeatureFromField: (fieldId, featureId) => {
    const gj = farmStorage.getFieldGeoJSON(fieldId)
    const updatedFeatures = gj.features.filter(f => f.properties?.id !== featureId)
    const updated = { ...gj, features: updatedFeatures }
    farmStorage.saveFieldGeoJSON(fieldId, updated)
    return updated
  },

  // Toggle pump running state
  togglePumpState: (fieldId, featureId) => {
    const gj = farmStorage.getFieldGeoJSON(fieldId)
    const feature = gj.features.find(f => f.properties?.id === featureId)
    if (!feature) return null

    const currentStatus = feature.properties?.status
    const newStatus = currentStatus === 'ACTIVE_RUNNING' ? 'STANDBY' : 'ACTIVE_RUNNING'
    const newOpStatus = newStatus === 'ACTIVE_RUNNING' ? 'ONLINE · PUMPING ACTIVE' : 'STANDBY · READY'

    return farmStorage.updateFeatureInField(fieldId, featureId, {
      status: newStatus,
      operational_status: newOpStatus,
    })
  },

  // Update boundary polygon coordinates with guaranteed 4-level MultiPolygon structure
  updateBoundary: (fieldId, newCoordinates, newAreaHa = null) => {
    const gj = farmStorage.getFieldGeoJSON(fieldId)
    const multiCoords = ensureMultiPolygonCoordinates(newCoordinates)
    const updatedFeatures = gj.features.map(f => {
      if (f.properties?.entity_type === 'field') {
        return {
          ...f,
          geometry: {
            type: 'MultiPolygon',
            coordinates: multiCoords
          },
          properties: {
            ...f.properties,
            calculated_area_hectares: newAreaHa || f.properties.calculated_area_hectares,
            calculated_area_acres: newAreaHa ? +(newAreaHa * 2.47105).toFixed(2) : f.properties.calculated_area_acres,
          }
        }
      }
      return f
    })
    const updated = { ...gj, features: updatedFeatures }
    farmStorage.saveFieldGeoJSON(fieldId, updated)
    return updated
  },

  // Reset to factory mock data
  resetAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.FARMERS)
      localStorage.removeItem(STORAGE_KEYS.PROJECTS)
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(STORAGE_KEYS.GEOJSON_PREFIX)) {
          localStorage.removeItem(k)
        }
      })
      localStorage.setItem(STORAGE_KEYS.FARMERS, JSON.stringify(INITIAL_FARMERS))
      localStorage.setItem(STORAGE_KEYS.GEOJSON_PREFIX + 'field-1', JSON.stringify(FIELD_1_GEOJSON))
      localStorage.setItem(STORAGE_KEYS.GEOJSON_PREFIX + 'field-2', JSON.stringify(FIELD_2_GEOJSON))
      localStorage.setItem(STORAGE_KEYS.GEOJSON_PREFIX + 'field-3', JSON.stringify(FIELD_3_GEOJSON))
      localStorage.setItem(STORAGE_KEYS.GEOJSON_PREFIX + 'field-4', JSON.stringify(FIELD_4_GEOJSON))
    } catch {
      /* ignore */
    }
    return true
  }
}

export default farmStorage
