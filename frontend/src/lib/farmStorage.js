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
      localStorage.removeItem('farmxt_pending_farmers_v1')
      localStorage.removeItem('farmxt_user_credentials_v1')
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
  },

  // ── FARM-XT Pending Farmer Registrations & Admin Approval ─────────────────
  getPendingFarmerRegistrations: () => {
    const raw = getStoredOrInit('farmxt_pending_farmers_v1', [])
    // Filter out fake demo registrations (Ramesh Patel, Venkatesh Rao, etc.)
    const realOnly = (Array.isArray(raw) ? raw : []).filter(item => 
      item.id !== 'pending-farmer-101' && 
      item.id !== 'pending-farmer-102' &&
      item.full_name !== 'Ramesh Patel' &&
      item.full_name !== 'Venkatesh Rao'
    )
    if (realOnly.length !== (Array.isArray(raw) ? raw.length : 0)) {
      try {
        localStorage.setItem('farmxt_pending_farmers_v1', JSON.stringify(realOnly))
      } catch { /* ignore */ }
    }
    return realOnly
  },

  createPendingFarmerRegistration: (data) => {
    const pendingList = farmStorage.getPendingFarmerRegistrations()
    const newReg = {
      id: `pending-farmer-${Date.now()}`,
      full_name: data.full_name || 'New Farmer',
      age: data.age || 35,
      area_region: data.area_region || 'Gujarat',
      contact_number: data.contact_number || '',
      land_address: data.land_address || '',
      area_sq_acres: data.area_sq_acres || '10 Acres',
      crops_yield: Array.isArray(data.crops_yield) ? data.crops_yield : [data.crops_yield].filter(Boolean),
      role: 'farmer',
      status: 'pending_admin_approval',
      submitted_at: new Date().toISOString(),
    }
    const updated = [newReg, ...pendingList]
    localStorage.setItem('farmxt_pending_farmers_v1', JSON.stringify(updated))
    return newReg
  },

  approveFarmerRegistration: (pendingId, assignedEmail, assignedPassword) => {
    const pendingList = farmStorage.getPendingFarmerRegistrations()
    const target = pendingList.find(p => p.id === pendingId)
    if (!target) return null

    // 1. Create official Farmer entity in database
    const acresNum = parseFloat(target.area_sq_acres) || 10.0
    const newFarmer = farmStorage.createFarmer({
      full_name: target.full_name,
      contact_number: target.contact_number,
      email: assignedEmail,
      village: target.area_region,
      district: target.area_region,
      state: 'Gujarat',
      address: target.land_address,
      total_acres: acresNum,
      total_hectares: +(acresNum / 2.47105).toFixed(2),
      khata_number: `Khata-${Math.floor(100 + Math.random() * 900)}`,
      crops_summary: (target.crops_yield || []).join(', '),
      status: 'VERIFIED',
    })

    // 2. Save credentials so farmer can log in
    const creds = farmStorage.getUserCredentials()
    const newCred = {
      email: (assignedEmail || `farmer.${newFarmer.id}@farmxt.com`).toLowerCase().trim(),
      password: assignedPassword || 'farmer123',
      role: 'farmer',
      full_name: target.full_name,
      farmer_id: newFarmer.id,
      field_id: newFarmer.field_id,
      approved_at: new Date().toISOString(),
    }
    const updatedCreds = [newCred, ...creds]
    localStorage.setItem('farmxt_user_credentials_v1', JSON.stringify(updatedCreds))

    // 3. Remove from pending list
    const remainingPending = pendingList.filter(p => p.id !== pendingId)
    localStorage.setItem('farmxt_pending_farmers_v1', JSON.stringify(remainingPending))

    return { farmer: newFarmer, credential: newCred }
  },

  rejectFarmerRegistration: (pendingId) => {
    const pendingList = farmStorage.getPendingFarmerRegistrations()
    const remaining = pendingList.filter(p => p.id !== pendingId)
    localStorage.setItem('farmxt_pending_farmers_v1', JSON.stringify(remaining))
    return true
  },

  // ── FARM-XT Credentials Manager ───────────────────────────────────────────
  getUserCredentials: () => {
    const initialCreds = [
      {
        email: 'admin@v2vtech.com',
        password: 'admin123',
        role: 'admin',
        full_name: 'V2V System Administrator',
      },
      {
        email: 'admin@farmxt.com',
        password: 'admin123',
        role: 'admin',
        full_name: 'FARM-XT Master Admin',
      },
      {
        email: 'farmer@v2vtech.com',
        password: 'farmer123',
        role: 'farmer',
        full_name: 'Ganesh V. (Farmer)',
        farmer_id: 'farmer-1',
        field_id: 'field-1',
      },
      {
        email: 'farmer.ganesh@v2vtech.com',
        password: 'farmer123',
        role: 'farmer',
        full_name: 'Ganesh V. (Farmer)',
        farmer_id: 'farmer-1',
        field_id: 'field-1',
      },
      {
        email: 'consumer@farmxt.com',
        password: 'consumer123',
        role: 'consumer',
        full_name: 'Ananya Sharma (Consumer)',
        area_place: 'Anand & Vadodara, Gujarat',
        contact_number: '+91 98452 11029',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        last_login_at: new Date(Date.now() - 1800000).toISOString(),
        is_online: true,
      },
      {
        email: 'dealer@farmxt.com',
        password: 'dealer123',
        role: 'dealer',
        full_name: 'AgriTech Seed & Fertilizer Dealers',
        area_place: 'Guntur Highway, AP',
        contact_number: '+91 97112 88431',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        last_login_at: new Date(Date.now() - 600000).toISOString(),
        is_online: true,
      }
    ]
    return getStoredOrInit('farmxt_user_credentials_v1', initialCreds)
  },

  saveUserCredential: (credData) => {
    const creds = farmStorage.getUserCredentials()
    const cleanEmail = (credData.email || '').toLowerCase().trim()
    const existingIndex = creds.findIndex(c => c.email === cleanEmail && c.role === credData.role)
    const nowISO = new Date().toISOString()
    const enriched = {
      ...credData,
      created_at: credData.created_at || nowISO,
      last_login_at: credData.last_login_at || nowISO,
      is_online: credData.is_online !== undefined ? credData.is_online : true,
    }
    
    if (existingIndex >= 0) {
      creds[existingIndex] = { ...creds[existingIndex], ...enriched }
    } else {
      creds.push(enriched)
    }
    localStorage.setItem('farmxt_user_credentials_v1', JSON.stringify(creds))
    return enriched
  },

  recordUserLogin: (userOrCred) => {
    if (!userOrCred || !userOrCred.email) return
    const creds = farmStorage.getUserCredentials()
    const cleanEmail = userOrCred.email.toLowerCase().trim()
    const index = creds.findIndex(c => c.email.toLowerCase() === cleanEmail)
    const nowISO = new Date().toISOString()
    if (index >= 0) {
      creds[index] = {
        ...creds[index],
        last_login_at: nowISO,
        is_online: true,
        area_place: userOrCred.area_place || creds[index].area_place || 'Not Specified',
        contact_number: userOrCred.contact_number || creds[index].contact_number || 'N/A',
      }
    } else {
      creds.push({
        email: cleanEmail,
        role: userOrCred.role || 'consumer',
        full_name: userOrCred.full_name || cleanEmail,
        area_place: userOrCred.area_place || 'Not Specified',
        contact_number: userOrCred.contact_number || 'N/A',
        created_at: nowISO,
        last_login_at: nowISO,
        is_online: true,
      })
    }
    localStorage.setItem('farmxt_user_credentials_v1', JSON.stringify(creds))
  },

  getConsumerAndDealerUsers: () => {
    const creds = farmStorage.getUserCredentials()
    return creds.filter(c => c.role === 'consumer' || c.role === 'dealer')
  },

  authenticateUser: (email, password, role) => {
    const creds = farmStorage.getUserCredentials()
    const cleanEmail = (email || '').toLowerCase().trim()
    const cleanPass = (password || '').trim()

    const match = creds.find(c => 
      c.email.toLowerCase() === cleanEmail &&
      c.password === cleanPass &&
      (role ? c.role === role : true)
    )

    if (match) {
      farmStorage.recordUserLogin(match)
    }

    return match || null
  }
}

export default farmStorage
