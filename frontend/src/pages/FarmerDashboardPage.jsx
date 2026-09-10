import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MapContainer, TileLayer, GeoJSON, Marker, Popup, Tooltip, useMap, useMapEvents, Polyline, Polygon
} from 'react-leaflet'
import L from 'leaflet'
import farmStorage from '../lib/farmStorage'
import { useAuth } from '../contexts/AuthContext'
import toast from '../components/ui/Toast'
import ScratchMapDigitizerModal from '../components/survey/ScratchMapDigitizerModal'
import {
  getDistanceMeters,
  calculatePathLength,
  calculatePolygonArea,
  calculatePerimeter,
  BASEMAP_OPTIONS,
  createVertexIcon,
  isValidLatLng,
  extractBoundaryLatLngs,
} from '../lib/geoUtils'

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom DivIcons for Assets
const createCustomIcon = (emoji, bgColor = '#2E0D5E', borderColor = '#8A57C0') => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background: ${bgColor};
        border: 2px solid ${borderColor};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        box-shadow: 0 4px 14px rgba(46, 13, 94, 0.4);
        color: white;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

const ICONS = {
  borewell: createCustomIcon('💧', '#2E0D5E', '#8A57C0'),
  borewell_running: createCustomIcon('💧', '#059669', '#34D399'),
  cctv: createCustomIcon('📹', '#3C1775', '#A78BFA'),
  sensor: createCustomIcon('📡', '#5E4678', '#C084FC'),
  power: createCustomIcon('⚡', '#D97706', '#FBBF24'),
  vertex: L.divIcon({
    className: 'vertex-pin',
    html: `<div style="background:#8A57C0; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  }),
}

// Auto-Fit Bounds to GeoJSON
function FitBounds({ geojson }) {
  const map = useMap()
  useEffect(() => {
    if (!geojson) return
    try {
      const layer = L.geoJSON(geojson)
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 })
      }
    } catch {
      /* ignore */
    }
  }, [geojson, map])
  return null
}

// Map Click & Drawing Controller
function MapDrawingController({ activeTool, onMapClick, onMapDoubleClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng)
    },
    dblclick(e) {
      if (onMapDoubleClick) onMapDoubleClick(e.latlng)
    },
  })
  return null
}



const LINE_COLORS = [
  { name: 'Royal Purple', hex: '#2E0D5E' },
  { name: 'Electric Violet', hex: '#7C3AED' },
  { name: 'Bright Lavender', hex: '#A855F7' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Sky Cyan', hex: '#06B6D4' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Crisp White', hex: '#FFFFFF' },
]

const THICKNESS_PRESETS = [
  { label: 'Thin (2px)', val: 2 },
  { label: 'Normal (4px)', val: 4 },
  { label: 'Bold (6px)', val: 6 },
  { label: 'Heavy (8px)', val: 8 },
  { label: 'Ultra (12px)', val: 12 },
]

export default function FarmerDashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [farmers, setFarmers] = useState([])

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const queryFarmerId = searchParams.get('farmerId') || location.state?.farmerId

  const [selectedFarmerId, setSelectedFarmerId] = useState(queryFarmerId || 'farmer-1')
  const [showScratchModal, setShowScratchModal] = useState(false)
  const [hudExpanded, setHudExpanded] = useState(true)
  const [geojson, setGeojson] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // { type, data }
  
  // Interactive Drawing & Shading State
  const [activeTool, setActiveTool] = useState('inspect') // 'inspect' | 'outline' | 'shade_zone' | 'draw_path' | 'drop_pin'
  const [draftPoints, setDraftPoints] = useState([]) // [[lat, lng], ...]
  
  // Line Drawing & Customization Studio State
  const [lineCategory, setLineCategory] = useState('pipeline') // 'pipeline' | 'road' | 'divider' | 'fence' | 'power' | 'custom'
  const [lineName, setLineName] = useState('')
  const [lineColor, setLineColor] = useState('#7C3AED') // Electric Violet default
  const [lineThickness, setLineThickness] = useState(6) // 6px bold default
  const [lineStyle, setLineStyle] = useState('solid') // 'solid' | 'dashed' | 'dotted'
  const [highlightedFeatureId, setHighlightedFeatureId] = useState(null)
  const [editingLine, setEditingLine] = useState(null)

  // Line Inspector Form State
  const [inspectorName, setInspectorName] = useState('')
  const [inspectorColor, setInspectorColor] = useState('#7C3AED')
  const [inspectorThickness, setInspectorThickness] = useState(6)
  const [inspectorStyle, setInspectorStyle] = useState('solid')

  // Sync inspector form when activeModal changes
  useEffect(() => {
    if (activeModal?.type === 'line_inspector' || activeModal?.type === 'pipeline') {
      const d = activeModal.data || {}
      setInspectorName(d.name || 'Farmland Line')
      setInspectorColor(d.color || (d.resource_type === 'internal_path' ? '#F59E0B' : '#0284C7'))
      setInspectorThickness(d.weight || 5)
      setInspectorStyle(d.line_style || (d.dashArray ? 'dashed' : 'solid'))
    }
  }, [activeModal])

  // Crop Zone Shading State
  const [shadeColor, setShadeColor] = useState('#10B981') // Default Emerald
  const [shadeOpacity, setShadeOpacity] = useState(0.25)
  const [zoneName, setZoneName] = useState('New Crop Zone')
  
  // Device Pin State
  const [pinType, setPinType] = useState('borewell') // 'borewell' | 'cctv' | 'sensor'

  // Basemap Selector state
  const [activeBasemapId, setActiveBasemapId] = useState('satellite')
  const currentBasemap = BASEMAP_OPTIONS.find(b => b.id === activeBasemapId) || BASEMAP_OPTIONS[0]

  // Layer Visibility
  const [activeLayers, setActiveLayers] = useState({
    boundary: true,
    zones: true,
    borewells: true,
    cctv: true,
    pipelines: true,
    sensors: true,
    power: true,
  })

  // Sync selectedFarmerId if query params change, locking farmer to their own farm
  useEffect(() => {
    if (user?.role === 'farmer') {
      const myId = user.farmer_id || 'farmer-1'
      setSelectedFarmerId(myId)
    } else if (queryFarmerId && queryFarmerId !== selectedFarmerId) {
      setSelectedFarmerId(queryFarmerId)
    }
  }, [user, queryFarmerId])

  // Load farmers and selected farm GeoJSON
  useEffect(() => {
    const all = farmStorage.getFarmers()
    setFarmers(all)
    const current = all.find(f => f.id === selectedFarmerId) || all[0]
    if (current) {
      const data = farmStorage.getFieldGeoJSON(current.field_id)
      setGeojson(data)
    }
  }, [selectedFarmerId])

  const currentFarmer = useMemo(() => {
    return farmers.find(f => f.id === selectedFarmerId) || farmers[0]
  }, [farmers, selectedFarmerId])

  // Filter features
  const features = geojson?.features || []
  const fieldFeature = features.find(f => f.properties?.entity_type === 'field')
  const zoneFeatures = features.filter(f => f.properties?.entity_type === 'zone')
  const borewellFeatures = features.filter(f => f.properties?.resource_type === 'borewell_pump')
  const cctvFeatures = features.filter(f => f.properties?.device_type === 'cctv_camera')
  const sensorFeatures = features.filter(f => f.properties?.device_type === 'soil_sensor' || f.properties?.device_type === 'weather_station')
  const pipelineFeatures = features.filter(f => f.geometry?.type === 'LineString' || f.properties?.entity_type === 'line' || f.properties?.resource_class === 'IRRIGATION' || f.properties?.resource_type === 'internal_path')
  const powerFeatures = features.filter(f => f.properties?.resource_class === 'POWER')

  // Crop metrics and utilization percentage for V2V brand Donut visualization
  const croppedAcres = useMemo(() => {
    return zoneFeatures.reduce((sum, z) => {
      const p = z.properties || {}
      return sum + (p.area_acres ? parseFloat(p.area_acres) : p.area_hectares ? parseFloat(p.area_hectares) * 2.471 : 0)
    }, 0)
  }, [zoneFeatures])

  const totalFarmAcres = currentFarmer?.total_acres || 20.0
  const cropUtilizationPercent = Math.min(100, Math.round((croppedAcres / (totalFarmAcres || 1)) * 100)) || 75

  const mapCenter = useMemo(() => {
    if (fieldFeature) {
      const pts = extractBoundaryLatLngs(fieldFeature.geometry)
      if (pts.length > 0 && isValidLatLng(pts[0])) return pts[0]
    }
    if (currentFarmer?.id === 'farmer-2') return [17.2892, 74.1812]
    if (currentFarmer?.id === 'farmer-3') return [10.7870, 79.1378]
    if (currentFarmer?.id === 'farmer-4') return [22.5645, 72.9289]
    return [10.6585, 77.0125]
  }, [fieldFeature, currentFarmer])

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Handle Map Click based on Active Tool
  const handleMapClick = (latlng) => {
    const { lat, lng } = latlng

    if (activeTool === 'inspect') {
      return
    }

    if (activeTool === 'drop_pin') {
      // Place Pin immediately
      let newFeature = null
      const id = `pin-${Date.now()}`

      if (pinType === 'borewell') {
        newFeature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            entity_type: 'resource',
            id,
            name: `Solar Borewell #${borewellFeatures.length + 1}`,
            resource_class: 'WATER',
            resource_type: 'borewell_pump',
            status: 'ACTIVE_RUNNING',
            verification_status: 'verified',
            pump_capacity_hp: '10.0 HP Solar Hybrid VFD',
            depth_feet: 450,
            flow_rate_lpm: 150,
            yesterday_runtime_hours: 4.2,
            yesterday_water_pumped_liters: 37800,
            power_source: 'Solar + 3-Phase Grid',
            notes: 'High-efficiency submersible pump placed with sub-meter GPS precision.',
          }
        }
      } else if (pinType === 'cctv') {
        newFeature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            entity_type: 'device',
            id,
            device_name: `CCTV 0${cctvFeatures.length + 1} — Perimeter Sentinel`,
            device_type: 'cctv_camera',
            status: 'ONLINE',
            verification_status: 'verified',
            camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
            resolution: '3840 x 2160 (4K UHD) @ 30 FPS',
            battery_level: '98%',
            last_motion_event: 'Perimeter active',
            live_feed_simulated: true,
          }
        }
      } else if (pinType === 'sensor') {
        newFeature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            entity_type: 'device',
            id,
            device_name: `V2V SoilSense Probe 0${sensorFeatures.length + 1}`,
            device_type: 'soil_sensor',
            status: 'ONLINE',
            verification_status: 'verified',
            soil_moisture_15cm: '69%',
            soil_moisture_45cm: '73%',
            soil_temperature: '25.6°C',
            battery_level: '96%',
            last_sync: 'Just now',
          }
        }
      }

      if (newFeature && currentFarmer?.field_id) {
        const updated = farmStorage.addFeatureToField(currentFarmer.field_id, newFeature)
        setGeojson(updated)
        toast.success(`Dropped ${newFeature.properties?.name || newFeature.properties?.device_name} on farmland!`)
        setActiveTool('inspect')
      }
      return
    }

    // Otherwise, add point to draft outline / zone / path
    setDraftPoints(prev => [...prev, [lat, lng]])
  }

  // Drag a draft vertex marker to adjust its position
  const handleDraftVertexDrag = (idx, e) => {
    const { lat, lng } = e.target.getLatLng()
    setDraftPoints(prev => {
      const copy = [...prev]
      copy[idx] = [lat, lng]
      return copy
    })
  }

  // Load existing boundary into editor to adjust corners
  const handleLoadCurrentBoundary = () => {
    const latlngs = extractBoundaryLatLngs(fieldFeature?.geometry)
    if (!latlngs.length) {
      toast.error('No existing boundary found.')
      return
    }
    setDraftPoints(latlngs)
    toast.success(`Loaded ${latlngs.length} boundary corners into editor! You can now drag any corner to adjust.`)
  }

  // Finish Drawing Outline Boundary
  const handleFinishOutline = () => {
    if (draftPoints.length < 3) {
      toast.error('At least 3 points are required to outline the farmland boundary.')
      return
    }

    // Convert [lat, lng] to GeoJSON [lng, lat]
    const closed = draftPoints.map(([lat, lng]) => [lng, lat])
    closed.push(closed[0])

    const areaStats = calculatePolygonArea(draftPoints)
    const approxHa = areaStats.hectares > 0 ? areaStats.hectares : +(Math.abs(draftPoints.length * 2.2) + 5.5).toFixed(2)
    const approxAcres = areaStats.acres > 0 ? areaStats.acres : +(approxHa * 2.471).toFixed(1)

    if (currentFarmer?.field_id) {
      const updated = farmStorage.updateBoundary(currentFarmer.field_id, closed, approxHa)
      setGeojson(updated)
      // Also update farmer acreage
      farmStorage.updateFarmer(currentFarmer.id, {
        total_hectares: approxHa,
        total_acres: approxAcres,
      })
      setFarmers(farmStorage.getFarmers())
      toast.success(`🎉 Farmland boundary updated! Calculated area: ${approxAcres} Acres (${approxHa} Ha)`)
    }
    setDraftPoints([])
    setActiveTool('inspect')
  }

  // Finish Shading Crop Zone
  const handleFinishShadeZone = () => {
    if (draftPoints.length < 3) {
      toast.error('At least 3 points are required to create a shaded crop zone.')
      return
    }

    const closed = draftPoints.map(([lat, lng]) => [lng, lat])
    closed.push(closed[0])

    const areaStats = calculatePolygonArea(draftPoints)
    const ha = areaStats.hectares > 0 ? areaStats.hectares : +(draftPoints.length * 0.85).toFixed(2)
    const acres = +(ha * 2.471).toFixed(1)

    const id = `zone-${Date.now()}`
    const finalZoneName = zoneName.trim() || 'Precision Crop Zone'
    const newZone = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [closed] },
      properties: {
        entity_type: 'zone',
        id,
        name: finalZoneName,
        zone_type: 'custom_crop',
        shade_color: shadeColor,
        crop: finalZoneName,
        crop_category: 'Cultivated Crop Zone',
        area_hectares: ha,
        area_acres: acres,
        planting_date: 'Current Season 2026',
        soil_moisture: '70% (Optimal)',
        health_index: '96% (Healthy)',
        verification_status: 'verified',
      }
    }

    if (currentFarmer?.field_id) {
      const updated = farmStorage.addFeatureToField(currentFarmer.field_id, newZone)
      setGeojson(updated)
      toast.success(`Shaded Crop Zone "${finalZoneName}" (${ha} Ha) saved!`)
    }
    setDraftPoints([])
    setZoneName('New Crop Zone')
    setActiveTool('inspect')
  }

  // Finish Drawing Line / Path / Pipeline
  const handleFinishPath = () => {
    if (draftPoints.length < 2) {
      toast.error('At least 2 points are required to draw a line or pipeline.')
      return
    }

    const coords = draftPoints.map(([lat, lng]) => [lng, lat])
    const id = `line-${Date.now()}`
    const pathStats = calculatePathLength(draftPoints)

    const defaultNames = {
      pipeline: 'Drip Irrigation Mainline (90mm)',
      road: 'Internal Tractor Access Road',
      divider: 'Land Parcel Divider / Border Line',
      fence: 'Perimeter Security Fence',
      power: '3-Phase Power Feed Route',
      custom: 'Custom Field Path',
    }

    const finalName = lineName.trim() || defaultNames[lineCategory] || 'Farmland Custom Line'

    const newPath = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {
        entity_type: 'line',
        id,
        name: finalName,
        line_category: lineCategory,
        resource_class: lineCategory === 'pipeline' ? 'IRRIGATION' : lineCategory === 'power' ? 'POWER' : 'STRUCTURE',
        resource_type: lineCategory === 'pipeline' ? 'main_pipeline' : lineCategory === 'road' ? 'internal_path' : 'divider_line',
        color: lineColor,
        weight: lineThickness,
        line_style: lineStyle,
        dashArray: lineStyle === 'dashed' ? '8, 8' : lineStyle === 'dotted' ? '3, 6' : undefined,
        status: 'ACTIVE',
        verification_status: 'verified',
        length_meters: pathStats.meters,
        length_feet: pathStats.feet,
      }
    }

    if (currentFarmer?.field_id) {
      const updated = farmStorage.addFeatureToField(currentFarmer.field_id, newPath)
      setGeojson(updated)
      toast.success(`"${finalName}" (${pathStats.meters} m / ${pathStats.feet} ft) saved to farmland!`)
    }
    setDraftPoints([])
    setLineName('')
    setActiveTool('inspect')
  }

  // Handle updating an existing line from inspector modal
  const handleUpdateLine = (lineId, updates) => {
    if (!currentFarmer?.field_id) return
    const updated = farmStorage.updateFeatureInField(currentFarmer.field_id, lineId, updates)
    if (updated) {
      setGeojson(updated)
      toast.success('Line styling & attributes updated successfully!')
      setActiveModal(null)
      setEditingLine(null)
    }
  }

  // Handle deleting a line
  const handleDeleteLine = (lineId) => {
    if (!currentFarmer?.field_id) return
    const updated = farmStorage.deleteFeatureFromField(currentFarmer.field_id, lineId)
    if (updated) {
      setGeojson(updated)
      toast.success('Line removed from farmland.')
      setActiveModal(null)
      setEditingLine(null)
      setHighlightedFeatureId(null)
    }
  }

  // Toggle pump running state
  const handleTogglePump = (featureId) => {
    if (!currentFarmer?.field_id) return
    const updated = farmStorage.togglePumpState(currentFarmer.field_id, featureId)
    if (updated) {
      setGeojson(updated)
      toast.success('Borewell pump motor command transmitted successfully!')
      const updatedFeature = updated.features.find(f => f.properties?.id === featureId)
      if (updatedFeature) {
        setActiveModal({ type: 'borewell', data: updatedFeature.properties })
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-v2v-softwhite overflow-hidden relative">
      {/* ── Top Header / Farm Selector & Quick Bar ── */}
      <div className="bg-white border-b border-v2v-lavendergray px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-v2v-gradient text-white flex items-center justify-center text-lg shadow-md shadow-v2v-lavender/30">
            🌾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-v2v-deep">
                {currentFarmer?.full_name}'s Farmland
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-v2v-deep border border-v2v-lavender/30 font-mono">
                {currentFarmer?.khata_number || 'Khata #'}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span>📍 {currentFarmer?.address || 'Pollachi, Tamil Nadu'}</span>
              <span>•</span>
              <strong className="text-v2v-deep">{currentFarmer?.total_acres} Acres</strong> ({currentFarmer?.total_hectares} Ha)
            </p>
          </div>
        </div>

        {/* Farm Switcher & Quick Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {user?.role === 'farmer' ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50/80 border border-v2v-lavender/40 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-base">🧑‍🌾</span>
              <div>
                <div className="text-[9px] text-v2v-deep font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <span>Your Farmland Parcel</span>
                  <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[8px] font-bold">VERIFIED</span>
                </div>
                <div className="text-xs font-extrabold text-v2v-deep">
                  {currentFarmer?.full_name} · {currentFarmer?.total_acres} Acres
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-v2v-softwhite border border-v2v-lavendergray px-3 py-1.5 rounded-lg shadow-inner">
              <span className="text-gray-400 font-medium">Select Farmer:</span>
              <select
                value={selectedFarmerId}
                onChange={(e) => {
                  setSelectedFarmerId(e.target.value)
                  setDraftPoints([])
                  setActiveTool('inspect')
                  navigate(`/farmer?farmerId=${e.target.value}`, { replace: true })
                }}
                className="bg-transparent font-bold text-v2v-deep focus:outline-none cursor-pointer"
              >
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.full_name} ({f.total_acres} Ac · {f.district || f.village})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>3-Phase Grid Active</span>
          </div>

          <button
            onClick={() => setShowScratchModal(true)}
            className="btn-v2v-gradient text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            title="Start Map From Scratch & Digitize Farmland & Crop Plots"
          >
            <span>🗺️</span>
            <span>Digitize From Scratch</span>
          </button>

          <button
            onClick={() => setActiveModal({ type: 'farmer_info', data: currentFarmer })}
            className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
          >
            <span>👤 Profile & Stats</span>
          </button>
        </div>
      </div>

      {/* ── Interactive Drawing & Precision Shading Toolbar (Overlay on Map) ── */}
      <div className="bg-white/95 backdrop-blur-md border-b border-v2v-lavendergray px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 flex-shrink-0 shadow-sm">
        {/* Tool Mode Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-v2v-deep text-[11px] uppercase tracking-wider mr-1">Tools:</span>
          
          <button
            onClick={() => { setActiveTool('inspect'); setDraftPoints([]); }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'inspect'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>👆</span>
            <span>Inspect Elements</span>
          </button>

          <button
            onClick={() => { setActiveTool('outline'); setDraftPoints([]); }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'outline'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>✏️</span>
            <span>Outline Land Boundary</span>
          </button>

          <button
            onClick={() => { setActiveTool('shade_zone'); setDraftPoints([]); }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'shade_zone'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>🎨</span>
            <span>Shade Crop Zone</span>
          </button>

          <button
            onClick={() => { setActiveTool('draw_path'); setDraftPoints([]); }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'draw_path'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>🛤️</span>
            <span>Draw Path / Pipe</span>
          </button>

          <button
            onClick={() => { setActiveTool('drop_pin'); setDraftPoints([]); }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'drop_pin'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>📍</span>
            <span>Drop Device Pin</span>
          </button>
        </div>

        {/* Layer Visibility Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-gray-400 font-medium">Layers:</span>
          <button
            onClick={() => toggleLayer('boundary')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeLayers.boundary ? 'bg-purple-100 border-v2v-lavender text-v2v-deep font-semibold' : 'bg-gray-100 text-gray-400'
            }`}
          >
            Boundary
          </button>
          <button
            onClick={() => toggleLayer('zones')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeLayers.zones ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold' : 'bg-gray-100 text-gray-400'
            }`}
          >
            Zones ({zoneFeatures.length})
          </button>
          <button
            onClick={() => toggleLayer('borewells')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeLayers.borewells ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold' : 'bg-gray-100 text-gray-400'
            }`}
          >
            Borewells ({borewellFeatures.length})
          </button>
          <button
            onClick={() => toggleLayer('cctv')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeLayers.cctv ? 'bg-purple-100 border-purple-400 text-purple-900 font-semibold' : 'bg-gray-100 text-gray-400'
            }`}
          >
            CCTV ({cctvFeatures.length})
          </button>
          <button
            onClick={() => toggleLayer('pipelines')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activeLayers.pipelines ? 'bg-sky-100 border-sky-400 text-sky-900 font-semibold' : 'bg-gray-100 text-gray-400'
            }`}
          >
            Paths/Pipes
          </button>
        </div>
      </div>

      {/* ── Active Tool Configuration Floating Sub-Bar ── */}
      {activeTool !== 'inspect' && (
        <div className="bg-v2v-deep text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 z-20 shadow-md">
          <div className="flex items-center gap-3 flex-wrap">
            {activeTool === 'outline' && (
              <div className="flex items-center gap-3 flex-wrap py-0.5">
                <span className="font-semibold text-v2v-lavendergray flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Click on map to place corners ({draftPoints.length} placed). Drag pins to adjust!
                </span>
                {draftPoints.length >= 3 && (
                  <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                    🌾 {calculatePolygonArea(draftPoints).acres} Acres ({calculatePolygonArea(draftPoints).hectares} Ha) · Perimeter: {calculatePerimeter(draftPoints).meters} m
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLoadCurrentBoundary}
                  className="px-2.5 py-1 rounded-lg bg-purple-800/80 hover:bg-purple-700 text-[11px] font-bold text-white border border-purple-400/40 flex items-center gap-1 shadow-sm hover-pop"
                >
                  <span>📍</span>
                  <span>Load Current Boundary to Adjust</span>
                </button>
              </div>
            )}

            {activeTool === 'shade_zone' && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold">Shade Crop Zone:</span>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Crop Name (e.g. Mango Plot)"
                  className="bg-white/10 text-white border border-white/30 rounded px-2 py-1 text-xs focus:outline-none"
                />
                <div className="flex items-center gap-1.5">
                  <span>Shade Color:</span>
                  {['#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F43F5E', '#84CC16'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setShadeColor(col)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        shadeColor === col ? 'border-white scale-125' : 'border-transparent opacity-70'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <span className="text-gray-300 text-[11px]">({draftPoints.length} vertices plotted)</span>
              </div>
            )}

            {activeTool === 'draw_path' && (
              <div className="flex items-center gap-3 flex-wrap py-1">
                {/* Category Selector */}
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[11px] text-purple-200">Category:</span>
                  <select
                    value={lineCategory}
                    onChange={(e) => setLineCategory(e.target.value)}
                    className="bg-purple-950/80 text-white border border-purple-400/40 rounded-lg px-2 py-1 text-xs focus:outline-none font-medium"
                  >
                    <option value="pipeline" className="text-gray-900">💧 Drip Irrigation Pipeline</option>
                    <option value="road" className="text-gray-900">🚜 Tractor Access Road / Track</option>
                    <option value="divider" className="text-gray-900">🚧 Parcel Divider / Border Line</option>
                    <option value="fence" className="text-gray-900">🛡️ Perimeter Fence Route</option>
                    <option value="power" className="text-gray-900">⚡ 3-Phase Power Feed Route</option>
                    <option value="custom" className="text-gray-900">〰️ Custom Precision Line</option>
                  </select>
                </div>

                {/* Line Name Input */}
                <input
                  type="text"
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  placeholder="Line Label (optional)"
                  className="bg-white/10 text-white placeholder-purple-200/50 border border-white/30 rounded-lg px-2.5 py-1 text-xs focus:outline-none w-36"
                />

                {/* Color Swatches */}
                <div className="flex items-center gap-1.5 bg-black/25 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-[10px] text-purple-200 font-bold uppercase">Color:</span>
                  <div className="flex items-center gap-1">
                    {LINE_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.name}
                        onClick={() => setLineColor(c.hex)}
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                          lineColor === c.hex ? 'border-white scale-125 shadow-md shadow-white/50' : 'border-black/20 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Line Thickness / Boldness Control */}
                <div className="flex items-center gap-1.5 bg-black/25 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-[10px] text-purple-200 font-bold uppercase">Boldness:</span>
                  <div className="flex items-center gap-1">
                    {THICKNESS_PRESETS.map(t => (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => setLineThickness(t.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          lineThickness === t.val
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {t.val}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Style (Solid, Dashed, Dotted) */}
                <div className="flex items-center gap-1 bg-black/25 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-[10px] text-purple-200 font-bold uppercase mr-0.5">Style:</span>
                  <button
                    type="button"
                    onClick={() => setLineStyle('solid')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      lineStyle === 'solid' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    ━━ Solid
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineStyle('dashed')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      lineStyle === 'dashed' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    ┅ Dashed
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineStyle('dotted')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      lineStyle === 'dotted' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    ··· Dotted
                  </button>
                </div>

                {/* Live Distance Output */}
                <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                  {draftPoints.length} pts · 📏 {calculatePathLength(draftPoints).meters} m ({calculatePathLength(draftPoints).feet} ft)
                </div>
              </div>
            )}

            {activeTool === 'drop_pin' && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold">Select Device to Drop:</span>
                <select
                  value={pinType}
                  onChange={(e) => setPinType(e.target.value)}
                  className="bg-white/10 text-white border border-white/30 rounded px-2 py-1 text-xs focus:outline-none font-bold"
                >
                  <option value="borewell" className="text-gray-900">💧 Solar Borewell & Water Pump</option>
                  <option value="cctv" className="text-gray-900">📹 4K Solar PTZ CCTV Camera</option>
                  <option value="sensor" className="text-gray-900">📡 IoT Soil Moisture & Temperature Probe</option>
                </select>
                <span className="text-v2v-lavendergray">👉 Now click anywhere on the farmland to place it!</span>
              </div>
            )}
          </div>

          {/* Action Buttons for Drawing */}
          <div className="flex items-center gap-2">
            {draftPoints.length > 0 && (
              <button
                onClick={() => setDraftPoints(prev => prev.slice(0, -1))}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                ↩️ Undo Point
              </button>
            )}

            {activeTool === 'outline' && draftPoints.length >= 3 && (
              <button
                onClick={handleFinishOutline}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow"
              >
                ✅ Complete Boundary Polygon
              </button>
            )}

            {activeTool === 'shade_zone' && draftPoints.length >= 3 && (
              <button
                onClick={handleFinishShadeZone}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow"
              >
                ✅ Save Shaded Zone
              </button>
            )}

            {activeTool === 'draw_path' && draftPoints.length >= 2 && (
              <button
                onClick={handleFinishPath}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow"
              >
                ✅ Finish Path / Pipeline
              </button>
            )}

            <button
              onClick={() => { setActiveTool('inspect'); setDraftPoints([]); }}
              className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-700 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Map View (Full Screen, High Zoom) ── */}
      <div className="flex-1 w-full relative z-0 min-h-0">
        {/* Floating Basemap Switcher */}
        <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-v2v-lavendergray p-1.5 flex items-center gap-1 text-xs pointer-events-auto">
          <span className="text-[10px] uppercase font-bold text-gray-400 px-1">Map:</span>
          {BASEMAP_OPTIONS.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBasemapId(b.id)}
              title={b.description}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                activeBasemapId === b.id
                  ? 'bg-v2v-deep text-white shadow-sm'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span>{b.icon}</span>
              <span className="hidden sm:inline text-[11px]">{b.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <MapContainer
          key={selectedFarmerId}
          center={mapCenter}
          zoom={16}
          maxZoom={19}
          className="w-full h-full"
          zoomControl={true}
        >
          {/* Active Base Map Layer */}
          <TileLayer
            key={currentBasemap.id}
            url={currentBasemap.url}
            attribution={currentBasemap.attribution}
            maxZoom={currentBasemap.maxZoom}
            maxNativeZoom={currentBasemap.maxNativeZoom}
          />

          {/* CartoDB High-Contrast Labels Layer for Satellite */}
          {currentBasemap.hasLabels && (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              opacity={0.65}
              maxZoom={19}
            />
          )}

          {geojson && <FitBounds geojson={geojson} />}

          {/* Map Drawing Click Handler */}
          <MapDrawingController
            activeTool={activeTool}
            onMapClick={handleMapClick}
            onMapDoubleClick={() => {
              if (activeTool === 'outline' && draftPoints.length >= 3) handleFinishOutline()
              if (activeTool === 'shade_zone' && draftPoints.length >= 3) handleFinishShadeZone()
              if (activeTool === 'draw_path' && draftPoints.length >= 2) handleFinishPath()
            }}
          />

          {/* 1. Farmland Boundary Polygon */}
          {activeLayers.boundary && fieldFeature && (
            <GeoJSON
              key={`field-boundary-${selectedFarmerId}-${activeTool}`}
              data={fieldFeature}
              interactive={activeTool === 'inspect'}
              style={{
                color: '#8A57C0',
                weight: 3.5,
                dashArray: '6, 4',
                fillColor: '#2E0D5E',
                fillOpacity: activeTool === 'outline' ? 0.05 : 0.14,
              }}
              onEachFeature={(feat, layer) => {
                layer.bindTooltip(
                  `<div style="font-weight:800; font-size:11px; color:#2A0C58;">🌾 ${currentFarmer?.full_name || 'Farmland'} Boundary</div><div style="font-size:10px; color:#5E4678; font-weight:600;">Click to view Land Options & Dossier →</div>`,
                  { permanent: false, direction: 'center', opacity: 0.95 }
                )
                if (activeTool === 'inspect') {
                  layer.on('click', () => {
                    setActiveModal({ type: 'field', data: feat.properties })
                  })
                }
              }}
            />
          )}

          {/* 2. Shaded Crop Zones */}
          {activeLayers.zones && zoneFeatures.map((zone, idx) => {
            const p = zone.properties || {}
            const color = p.shade_color || '#10B981'
            return (
              <GeoJSON
                key={`zone-${p.id || idx}-${activeTool}`}
                data={zone}
                interactive={activeTool === 'inspect'}
                style={{
                  color: color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: activeTool === 'shade_zone' ? 0.08 : 0.28,
                }}
                onEachFeature={(feat, layer) => {
                  const p = feat.properties || {}
                  const cropTitle = p.crop || p.name || 'Crop Zone'
                  const areaStr = p.area_acres ? `${p.area_acres} Acres` : p.area_hectares ? `${p.area_hectares} Ha` : ''
                  layer.bindTooltip(
                    `<div style="font-weight:800; font-size:11px; color:#2A0C58;">🌱 ${cropTitle}</div><div style="font-size:10px; color:#5E4678; font-weight:600;">${areaStr}</div>`,
                    { permanent: false, direction: 'center', opacity: 0.95 }
                  )
                  if (activeTool === 'inspect') {
                    layer.on('click', () => {
                      setActiveModal({ type: 'zone', data: feat.properties })
                    })
                  }
                }}
              />
            )
          })}

          {/* 3. Internal Paths & Irrigation Pipelines */}
          {activeLayers.pipelines && pipelineFeatures.map((pipe, idx) => {
            const p = pipe.properties || {}
            const coords = pipe.geometry?.coordinates || []
            if (coords.length < 2) return null
            const latLngs = coords.map(([lng, lat]) => [lat, lng])
            const isHighlighted = highlightedFeatureId === p.id
            const strokeColor = p.color || (p.resource_type === 'internal_path' ? '#F59E0B' : '#0284C7')
            const strokeWidth = p.weight || (p.resource_type === 'internal_path' ? 5 : 4)
            const dash = p.dashArray || (p.line_style === 'dashed' ? '8, 8' : p.line_style === 'dotted' ? '3, 6' : undefined)

            return (
              <React.Fragment key={`pipe-frag-${p.id || idx}`}>
                {/* Glowing Aura if Highlighted */}
                {isHighlighted && (
                  <Polyline
                    positions={latLngs}
                    pathOptions={{
                      color: '#A855F7',
                      weight: strokeWidth + 8,
                      opacity: 0.7,
                      lineCap: 'round',
                    }}
                  />
                )}
                <Polyline
                  positions={latLngs}
                  pathOptions={{
                    color: strokeColor,
                    weight: strokeWidth,
                    opacity: 0.95,
                    dashArray: dash,
                    lineCap: 'round',
                  }}
                  eventHandlers={{
                    click: (e) => {
                      if (activeTool === 'inspect') {
                        L.DomEvent.stopPropagation(e)
                        setHighlightedFeatureId(p.id)
                        setEditingLine({ ...p, fieldId: currentFarmer.field_id, coordinates: coords })
                        setActiveModal({ type: 'line_inspector', data: p })
                      }
                    },
                    mouseover: (e) => {
                      e.target.setStyle({ weight: strokeWidth + 2, opacity: 1 })
                    },
                    mouseout: (e) => {
                      e.target.setStyle({ weight: strokeWidth, opacity: 0.95 })
                    },
                  }}
                />
              </React.Fragment>
            )
          })}

          {/* 4. Borewells & Water Pumps */}
          {activeLayers.borewells && borewellFeatures.map((bw, idx) => {
            const p = bw.properties || {}
            const coords = bw.geometry?.coordinates
            if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' || isNaN(coords[0]) || isNaN(coords[1])) {
              return null
            }
            const [lng, lat] = coords
            const isRunning = p.status === 'ACTIVE_RUNNING'
            const icon = isRunning ? ICONS.borewell_running : ICONS.borewell

            return (
              <Marker
                key={`bw-${p.id || idx}`}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (activeTool === 'inspect') {
                      setActiveModal({ type: 'borewell', data: p })
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-v2v-deep block">{p.name}</strong>
                    <span className={isRunning ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {isRunning ? '● RUNNING' : '○ STANDBY'}
                    </span>
                    <div className="text-[11px] text-gray-600 mt-1">Yesterday: <strong>{p.yesterday_runtime_hours} hrs</strong> ({p.yesterday_water_pumped_liters?.toLocaleString()} L)</div>
                    <button
                      onClick={() => setActiveModal({ type: 'borewell', data: p })}
                      className="mt-1.5 text-v2v-lavender font-bold underline block"
                    >
                      View telemetry & pump switch →
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* 5. 4K Solar CCTV Cameras */}
          {activeLayers.cctv && cctvFeatures.map((cam, idx) => {
            const p = cam.properties || {}
            const coords = cam.geometry?.coordinates
            if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' || isNaN(coords[0]) || isNaN(coords[1])) {
              return null
            }
            const [lng, lat] = coords

            return (
              <Marker
                key={`cctv-${p.id || idx}`}
                position={[lat, lng]}
                icon={ICONS.cctv}
                eventHandlers={{
                  click: () => {
                    if (activeTool === 'inspect') {
                      setActiveModal({ type: 'cctv', data: p })
                    }
                  },
                }}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-v2v-deep block">{p.device_name}</strong>
                    <span className="text-emerald-600 font-bold">● LIVE 4K RECORDING</span>
                    <button
                      onClick={() => setActiveModal({ type: 'cctv', data: p })}
                      className="mt-1.5 text-v2v-lavender font-bold underline block"
                    >
                      Open Live Camera Feed →
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* 6. IoT Sensors */}
          {activeLayers.sensors && sensorFeatures.map((sensor, idx) => {
            const p = sensor.properties || {}
            const coords = sensor.geometry?.coordinates
            if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' || isNaN(coords[0]) || isNaN(coords[1])) {
              return null
            }
            const [lng, lat] = coords

            return (
              <Marker
                key={`sensor-${p.id || idx}`}
                position={[lat, lng]}
                icon={ICONS.sensor}
                eventHandlers={{
                  click: () => {
                    if (activeTool === 'inspect') {
                      setActiveModal({ type: 'sensor', data: p })
                    }
                  },
                }}
              />
            )
          })}

          {/* 7. Power Feeder */}
          {activeLayers.power && powerFeatures.map((pwr, idx) => {
            const p = pwr.properties || {}
            const coords = pwr.geometry?.coordinates
            if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' || isNaN(coords[0]) || isNaN(coords[1])) {
              return null
            }
            const [lng, lat] = coords
            return (
              <Marker
                key={`power-${p.id || idx}`}
                position={[lat, lng]}
                icon={ICONS.power}
                eventHandlers={{
                  click: () => {
                    if (activeTool === 'inspect') {
                      setActiveModal({ type: 'power', data: p })
                    }
                  },
                }}
              />
            )
          })}

          {/* Live In-Progress Drawing Previews */}
          {draftPoints.length > 0 && (
            <>
              {/* Draft Markers on vertices with numbers, tooltips, and dragging */}
              {draftPoints.map((pt, i) => {
                if (!isValidLatLng(pt)) return null
                return (
                  <Marker
                    key={`draft-pt-${i}`}
                    position={pt}
                    icon={createVertexIcon(i + 1, i === 0)}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => handleDraftVertexDrag(i, e),
                    }}
                  >
                  <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                    <div className="text-xs font-semibold">
                      Corner #{i + 1} {i === 0 ? '(Starting Corner)' : ''}
                      <div className="text-[10px] text-gray-500 font-mono">
                        {pt[0].toFixed(5)}° N, {pt[1].toFixed(5)}° E
                      </div>
                      <div className="text-[9px] text-purple-600">Drag pin to adjust position</div>
                    </div>
                  </Tooltip>
                </Marker>
              )
            })}

              {/* Line between points */}
              {draftPoints.length >= 2 && activeTool === 'draw_path' && (
                <Polyline
                  positions={draftPoints}
                  pathOptions={{
                    color: lineColor,
                    weight: lineThickness,
                    dashArray: lineStyle === 'dashed' ? '8, 8' : lineStyle === 'dotted' ? '3, 6' : undefined,
                    opacity: 0.95,
                  }}
                />
              )}

              {/* Shaded polygon preview */}
              {draftPoints.length >= 3 && (activeTool === 'outline' || activeTool === 'shade_zone') && (
                <Polygon
                  positions={draftPoints}
                  pathOptions={{
                    color: activeTool === 'outline' ? '#8A57C0' : shadeColor,
                    fillColor: activeTool === 'outline' ? '#2E0D5E' : shadeColor,
                    fillOpacity: activeTool === 'outline' ? 0.25 : 0.35,
                    weight: 3,
                    dashArray: '4, 4',
                  }}
                />
              )}
            </>
          )}
        </MapContainer>

        {/* Floating Farmland Legend / Status Badge (Positioned below Basemap Switcher) */}
        <div className="absolute top-14 right-3 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-v2v-lavendergray shadow-lg text-[11px] space-y-1.5 hidden md:block">
          <div className="font-bold text-v2v-deep pb-1 border-b border-gray-100 flex items-center justify-between gap-2">
            <span>Farmland Legend</span>
            <span className="text-[10px] text-emerald-600 font-bold">● Live Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <span>Borewell (Running)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-v2v-deep" />
            <span>Borewell (Standby)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-v2v-electric" />
            <span>4K CCTV Camera</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500" />
            <span>Irrigation Pipeline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Internal Tractor Road</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600" />
            <span>IoT Soil Sensor Node</span>
          </div>
        </div>

        {/* ── Floating V2V Tech Crop & Land Analytics HUD (Brand Donut & Sub-Field Metrics) ── */}
        <div className="absolute bottom-4 left-4 z-[400] max-w-sm w-[calc(100%-2rem)] sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-v2v-border shadow-2xl overflow-hidden transition-all duration-300">
          {/* HUD Header */}
          <div className="bg-v2v-primary px-3.5 py-2.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌾</span>
              <span className="text-xs font-black tracking-tight">Crop & Plot Distribution</span>
            </div>
            <button
              onClick={() => setHudExpanded(!hudExpanded)}
              className="text-xs text-purple-200 hover:text-white px-2 py-0.5 rounded-lg bg-white/10"
            >
              {hudExpanded ? 'Hide ▲' : 'Show ▼'}
            </button>
          </div>

          {hudExpanded && (
            <div className="p-3.5 space-y-3 text-xs">
              {/* Donut Chart & High-Level Metrics */}
              <div className="flex items-center gap-3">
                {/* Brand Donut SVG */}
                <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#E4DFEB"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="#2A0C58"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={(2 * Math.PI * 32) * (1 - cropUtilizationPercent / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[13px] font-black text-v2v-deep leading-none">
                      {cropUtilizationPercent}%
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Used</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-v2v-deep">
                    {croppedAcres.toFixed(1)} / {totalFarmAcres} Acres
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">
                    {zoneFeatures.length} Internal Crop Sub-Fields Plotted
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 font-bold text-v2v-deep">
                      <span className="w-2 h-2 rounded-full bg-v2v-deep" /> Cropped
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-gray-500">
                      <span className="w-2 h-2 rounded-full bg-v2v-border" /> Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Field Crop Plots List */}
              {zoneFeatures.length > 0 ? (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {zoneFeatures.map((zone, idx) => {
                    const p = zone.properties || {}
                    const color = p.shade_color || '#10B981'
                    return (
                      <div
                        key={`hud-z-${p.id || idx}`}
                        onClick={() => setActiveModal({ type: 'zone', data: p })}
                        className="flex items-center justify-between p-1.5 rounded-xl bg-v2v-softwhite hover:bg-purple-50 border border-v2v-border/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-[11px] text-gray-900 truncate">
                            {p.name || p.crop}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-v2v-deep ml-2 whitespace-nowrap">
                          {p.area_acres ? `${p.area_acres} Ac` : p.area_hectares ? `${p.area_hectares} Ha` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-2 text-gray-400 text-[11px]">
                  No sub-plots plotted yet. Use "Shade Crop Zone" or "Digitize From Scratch".
                </div>
              )}

              {/* Quick Jump to Scratch Digitizer */}
              <button
                onClick={() => setShowScratchModal(true)}
                className="w-full py-1.5 bg-v2v-softwhite hover:bg-purple-100 border border-v2v-border text-v2v-deep text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🗺️</span>
                <span>Open Precision Land Digitizer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Interactive Detail Modals for Clicked Elements ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-v2v-lavendergray animate-slide-up">
            {/* Modal Header */}
            <div className="bg-v2v-gradient px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {activeModal.type === 'borewell' && '💧'}
                  {activeModal.type === 'cctv' && '📹'}
                  {activeModal.type === 'zone' && '🌾'}
                  {activeModal.type === 'sensor' && '📡'}
                  {activeModal.type === 'pipeline' && '🌐'}
                  {activeModal.type === 'power' && '⚡'}
                  {activeModal.type === 'field' && '🗺️'}
                  {activeModal.type === 'farmer_info' && '🧑‍🌾'}
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    {activeModal.type === 'field'
                      ? `${currentFarmer?.full_name}'s Farmland Parcel`
                      : (activeModal.data?.name || activeModal.data?.device_name || activeModal.data?.full_name || 'Asset Details')}
                  </h3>
                  <p className="text-[11px] text-v2v-lavendergray capitalize">
                    {activeModal.type === 'field'
                      ? 'Cadastral Land Twin & Interactive Options'
                      : `${activeModal.type.replace('_', ' ')} Diagnostics`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* ── BOREWELL MODAL ── */}
              {activeModal.type === 'borewell' && (
                <div className="space-y-4">
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    activeModal.data?.status === 'ACTIVE_RUNNING'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div>
                      <div className="font-bold text-sm">
                        {activeModal.data?.status === 'ACTIVE_RUNNING' ? 'Pump Is Running Active' : 'Pump Is Standby'}
                      </div>
                      <div className="text-xs opacity-80">
                        {activeModal.data?.operational_status || 'Telemetry Normal'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePump(activeModal.data?.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold text-white shadow transition-all ${
                        activeModal.data?.status === 'ACTIVE_RUNNING'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {activeModal.data?.status === 'ACTIVE_RUNNING' ? 'STOP PUMP' : 'START PUMP'}
                    </button>
                  </div>

                  {/* Operational Record */}
                  <div className="bg-purple-50 border border-v2v-lavender/40 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold text-v2v-deep uppercase tracking-wider flex items-center justify-between">
                      <span>Yesterday's Operational Record</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-v2v-lavender/30">Verified Log</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <div className="text-gray-500">Working Duration:</div>
                        <div className="text-base font-extrabold text-v2v-deep">{activeModal.data?.yesterday_runtime_hours} Hours</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Water Discharged:</div>
                        <div className="text-base font-extrabold text-v2v-deep">{activeModal.data?.yesterday_water_pumped_liters?.toLocaleString()} Liters</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 border-t border-v2v-lavender/20 pt-2 mt-1">
                      {activeModal.data?.notes || 'Continuous cycle without electrical overload.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">Motor Capacity:</span>
                      <strong className="text-gray-900">{activeModal.data?.pump_capacity_hp || '10 HP Solar Hybrid'}</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">Flow Rate:</span>
                      <strong className="text-gray-900">{activeModal.data?.flow_rate_lpm || 150} L / min</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">Borewell Depth:</span>
                      <strong className="text-gray-900">{activeModal.data?.depth_feet || 450} Feet</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">Power Supply:</span>
                      <strong className="text-gray-900">{activeModal.data?.power_source || 'Solar + Grid'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CCTV MODAL ── */}
              {activeModal.type === 'cctv' && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-gray-700 shadow-inner flex flex-col justify-between p-3">
                    <div className="flex justify-between items-center text-[10px] text-white">
                      <span className="flex items-center gap-1.5 bg-red-600/90 font-bold px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE 4K
                      </span>
                      <span className="font-mono opacity-80">{new Date().toLocaleString()}</span>
                    </div>

                    <div className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
                      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80')" }}
                    />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
                      <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center text-white mb-2">
                        +
                      </div>
                      <div className="text-xs text-white font-mono drop-shadow">
                        {activeModal.data?.device_name}
                      </div>
                      <div className="text-[10px] text-gray-300">
                        {activeModal.data?.resolution || '3840x2160 UHD @ 30 FPS'}
                      </div>
                    </div>

                    <div className="relative z-10 flex justify-between items-center text-[10px] text-white bg-black/50 backdrop-blur-sm p-1.5 rounded-lg">
                      <span>120° FOV · AI Starlight Night Vision</span>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success('Camera snapshot saved!')} className="hover:text-v2v-lavender underline">📸 Snapshot</button>
                        <button onClick={() => toast.success('Night vision toggled')} className="hover:text-v2v-lavender underline">🌙 Night Mode</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">Model:</span>
                      <strong className="text-gray-900">{activeModal.data?.camera_model || 'V2V Solar PTZ'}</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">Battery:</span>
                      <strong className="text-emerald-600">{activeModal.data?.battery_level || '98%'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CROP ZONE MODAL ── */}
              {activeModal.type === 'zone' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="font-bold text-sm text-emerald-900">{activeModal.data?.crop || activeModal.data?.name}</div>
                    <div className="text-emerald-700 text-xs mt-0.5">{activeModal.data?.crop_category} · {activeModal.data?.area_hectares} Ha</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-gray-50 rounded-lg border">
                      <span className="text-gray-400 block text-[10px]">Planted Date:</span>
                      <strong className="text-gray-900">{activeModal.data?.planting_date || '2025'}</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border">
                      <span className="text-gray-400 block text-[10px]">Stage:</span>
                      <strong className="text-gray-900">{activeModal.data?.growth_stage || 'Active Growth'}</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border">
                      <span className="text-gray-400 block text-[10px]">Soil Moisture:</span>
                      <strong className="text-emerald-600">{activeModal.data?.soil_moisture || '71%'}</strong>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg border">
                      <span className="text-gray-400 block text-[10px]">Health Index:</span>
                      <strong className="text-v2v-deep">{activeModal.data?.health_index || '96%'}</strong>
                    </div>
                  </div>

                  {activeModal.data?.tree_count && (
                    <div className="p-3 bg-purple-50 border border-v2v-lavender/30 rounded-lg">
                      <span className="text-gray-500 block text-[10px]">Plant Population:</span>
                      <div className="text-base font-bold text-v2v-deep">{activeModal.data?.tree_count} Plants/Trees</div>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-bold text-blue-900 text-xs">AI Agronomist Recommendation:</div>
                    <p className="text-blue-800 text-[11px] mt-1">
                      Soil moisture index is at optimal levels. Maintain regular fertigation cycle through mainline drip laterals.
                    </p>
                  </div>
                </div>
              )}

              {/* ── IOT SENSOR MODAL ── */}
              {activeModal.type === 'sensor' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-purple-50 border border-v2v-lavender/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-v2v-deep">{activeModal.data?.device_name}</div>
                      <div className="text-[11px] text-gray-500">Telemetry Online · {activeModal.data?.last_sync || 'Just now'}</div>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      🔋 {activeModal.data?.battery_level || '95%'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl text-center">
                      <div className="text-gray-400 text-[10px] uppercase">Moisture (15 cm)</div>
                      <div className="text-xl font-extrabold text-emerald-600 mt-1">{activeModal.data?.soil_moisture_15cm || '71%'}</div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl text-center">
                      <div className="text-gray-400 text-[10px] uppercase">Moisture (45 cm)</div>
                      <div className="text-xl font-extrabold text-emerald-600 mt-1">{activeModal.data?.soil_moisture_45cm || '74%'}</div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl text-center">
                      <div className="text-gray-400 text-[10px] uppercase">Soil Temperature</div>
                      <div className="text-xl font-extrabold text-v2v-deep mt-1">{activeModal.data?.soil_temperature || '25.4°C'}</div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-xl text-center">
                      <div className="text-gray-400 text-[10px] uppercase">Conductivity (EC)</div>
                      <div className="text-xl font-extrabold text-v2v-secondary mt-1">{activeModal.data?.electrical_conductivity || '1.12 mS'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── INTERACTIVE LINE INSPECTOR & CUSTOMIZER MODAL ── */}
              {(activeModal.type === 'pipeline' || activeModal.type === 'line_inspector') && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                        {activeModal.data?.line_category === 'pipeline' ? '💧 Irrigation Pipeline' :
                         activeModal.data?.line_category === 'road' ? '🚜 Tractor Access Road' :
                         activeModal.data?.line_category === 'divider' ? '🚧 Boundary Divider' :
                         activeModal.data?.line_category === 'fence' ? '🛡️ Perimeter Fence' :
                         activeModal.data?.line_category === 'power' ? '⚡ 3-Phase Power Route' : '〰️ Farmland Line'}
                      </div>
                      <div className="font-extrabold text-sm text-v2v-deep mt-0.5">
                        {inspectorName || activeModal.data?.name || 'Farmland Line'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px]">
                        📏 {activeModal.data?.length_meters || 120} m
                      </span>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {activeModal.data?.length_feet || 394} ft
                      </div>
                    </div>
                  </div>

                  {/* Line Name Edit */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Line Title / Label
                    </label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none"
                      placeholder="e.g. Sector 2 Drip Laterals"
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Line Color ({inspectorColor})
                    </label>
                    <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                      {LINE_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          onClick={() => setInspectorColor(c.hex)}
                          className={`w-7 h-7 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                            inspectorColor === c.hex ? 'border-purple-900 scale-110 shadow-md ring-2 ring-purple-400' : 'border-gray-300 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {inspectorColor === c.hex && (
                            <span className={c.hex === '#FFFFFF' ? 'text-black text-xs font-bold' : 'text-white text-xs font-bold'}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thickness / Boldness Control */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Line Thickness / Boldness: <strong className="text-purple-700">{inspectorThickness}px</strong>
                      </label>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      {THICKNESS_PRESETS.map(t => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setInspectorThickness(t.val)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                            inspectorThickness === t.val
                              ? 'bg-purple-700 text-white shadow-md shadow-purple-900/20'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={inspectorThickness}
                      onChange={(e) => setInspectorThickness(parseInt(e.target.value))}
                      className="w-full accent-purple-700 cursor-pointer"
                    />
                  </div>

                  {/* Line Style (Solid, Dashed, Dotted) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Stroke Pattern
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectorStyle('solid')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          inspectorStyle === 'solid'
                            ? 'bg-purple-50 border-purple-600 text-purple-900 ring-2 ring-purple-200'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        ━━ Solid Line
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorStyle('dashed')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          inspectorStyle === 'dashed'
                            ? 'bg-purple-50 border-purple-600 text-purple-900 ring-2 ring-purple-200'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        ┅ Dashed Line
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorStyle('dotted')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          inspectorStyle === 'dotted'
                            ? 'bg-purple-50 border-purple-600 text-purple-900 ring-2 ring-purple-200'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        ··· Dotted Line
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteLine(activeModal.data?.id)}
                      className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-colors"
                    >
                      🗑️ Delete Line
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateLine(activeModal.data?.id, {
                        name: inspectorName,
                        color: inspectorColor,
                        weight: inspectorThickness,
                        line_style: inspectorStyle,
                        dashArray: inspectorStyle === 'dashed' ? '8, 8' : inspectorStyle === 'dotted' ? '3, 6' : undefined,
                      })}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-v2v-deep to-purple-700 hover:from-purple-900 hover:to-purple-800 text-white font-bold text-xs shadow-md shadow-purple-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Apply & Save Changes →
                    </button>
                  </div>
                </div>
              )}

              {/* ── FARMER INFO MODAL ── */}
              {activeModal.type === 'farmer_info' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-v2v-softwhite rounded-xl border border-v2v-lavendergray">
                    <div className="font-bold text-base text-v2v-deep">{activeModal.data?.full_name}</div>
                    <div className="text-xs text-gray-600 mt-1">📞 {activeModal.data?.contact_number}</div>
                    <div className="text-xs text-gray-600">{activeModal.data?.email}</div>
                    <div className="text-xs text-gray-500 mt-2">{activeModal.data?.address}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <span className="text-gray-400 block text-[10px]">Survey Khata No:</span>
                      <strong className="text-v2v-deep">{activeModal.data?.khata_number}</strong>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <span className="text-gray-400 block text-[10px]">Total Farmland:</span>
                      <strong className="text-v2v-deep">{activeModal.data?.total_acres} Acres ({activeModal.data?.total_hectares} Ha)</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border border-v2v-lavender/30">
                    <span className="text-gray-500 block text-[10px]">Crops Cultivated:</span>
                    <strong className="text-v2v-deep block mt-0.5">{activeModal.data?.crops_summary}</strong>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-emerald-700 block text-[10px]">AI Readiness Score:</span>
                    <strong className="text-emerald-900 text-base">{activeModal.data?.readiness_score || 9.4} / 10</strong>
                  </div>
                </div>
              )}

              {/* ── FARMLAND & LAND OPTIONS MODAL ── */}
              {activeModal.type === 'field' && (
                <div className="space-y-4 text-xs">
                  {/* Top Card: Land Identity matching V2V Tech Style Guide */}
                  <div className="p-4 bg-gradient-to-br from-[#2A0C58] via-[#3C1775] to-[#131313] text-white rounded-2xl border border-purple-400/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-15 text-5xl pointer-events-none">🌾</div>
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Verified Cadastral Boundary</span>
                        </div>
                        <h4 className="text-base font-extrabold text-white">
                          {currentFarmer?.full_name}'s Farmland Twin
                        </h4>
                        <p className="text-purple-200 text-xs mt-0.5">
                          Khata: <strong className="text-white font-mono">{currentFarmer?.khata_number}</strong> · {currentFarmer?.address || 'Pollachi, Tamil Nadu'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white leading-none">
                          {currentFarmer?.total_acres}
                        </div>
                        <div className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mt-0.5">
                          Acres Total ({currentFarmer?.total_hectares} Ha)
                        </div>
                      </div>
                    </div>

                    {/* Geodesic Stats */}
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                        <div className="text-[9px] text-purple-200 uppercase font-bold">Perimeter</div>
                        <div className="text-xs font-black text-white mt-0.5">
                          {fieldFeature ? calculatePerimeter(extractBoundaryLatLngs(fieldFeature.geometry)).meters : 1240} m
                        </div>
                      </div>
                      <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                        <div className="text-[9px] text-purple-200 uppercase font-bold">Sub-Plots</div>
                        <div className="text-xs font-black text-emerald-400 mt-0.5">
                          {zoneFeatures.length} Crop Zones
                        </div>
                      </div>
                      <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                        <div className="text-[9px] text-purple-200 uppercase font-bold">Utilization</div>
                        <div className="text-xs font-black text-v2v-lavender mt-0.5">
                          {cropUtilizationPercent}% Cropped
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Interactive Land Options & Actions ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-v2v-deep uppercase tracking-wider px-1">
                      <span>⚡ Interactive Land Actions:</span>
                      <span className="text-[10px] text-purple-600 font-semibold">Click to activate mode</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Action 1: Shade Crop Zone */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null)
                          setActiveTool('shade_zone')
                          toast.info('Click points on the map to shade a new crop zone.')
                        }}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base group-hover:scale-110 transition-transform">🌱</span>
                          <span className="font-extrabold text-v2v-deep text-xs">Shade Crop Zone</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          Partition sub-plots & assign crops (Mango, Cocoa, Cane)
                        </p>
                      </button>

                      {/* Action 2: Draw Pipeline / Road */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null)
                          setActiveTool('draw_path')
                          toast.info('Click on map to trace irrigation pipes or tractor paths.')
                        }}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base group-hover:scale-110 transition-transform">〰️</span>
                          <span className="font-extrabold text-v2v-deep text-xs">Add Path or Pipe</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          Trace drip irrigation laterals, fences, or roads
                        </p>
                      </button>

                      {/* Action 3: Drop Hardware Pin */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null)
                          setActiveTool('drop_pin')
                          toast.info('Click anywhere inside boundary to place a device pin.')
                        }}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base group-hover:scale-110 transition-transform">📍</span>
                          <span className="font-extrabold text-v2v-deep text-xs">Drop Device Pin</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          Place smart borewells, 4K CCTV cameras, or sensors
                        </p>
                      </button>

                      {/* Action 4: Redraw / Adjust Boundary */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null)
                          handleLoadCurrentBoundary()
                          toast.info('Boundary vertices loaded. Drag pins to adjust shape.')
                        }}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base group-hover:scale-110 transition-transform">📐</span>
                          <span className="font-extrabold text-v2v-deep text-xs">Adjust Boundary</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          Fine-tune GPS boundary corners & recalculate acreage
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* ── Farmland Profile Details & Telemetry ── */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-2.5">
                    <div className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                      <span>🌾 Land Agro-Profile & Assets:</span>
                      <span className="text-[10px] text-emerald-600 font-bold">Active Sensors</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                        <span className="text-gray-400 block text-[9px] font-bold uppercase">Borewells</span>
                        <strong className="text-v2v-deep text-sm">{borewellFeatures.length} Units</strong>
                        <span className="text-[9px] text-emerald-600 block">Solar Hybrid</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                        <span className="text-gray-400 block text-[9px] font-bold uppercase">CCTV Cameras</span>
                        <strong className="text-v2v-deep text-sm">{cctvFeatures.length} Units</strong>
                        <span className="text-[9px] text-emerald-600 block">4K Live Solar</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                        <span className="text-gray-400 block text-[9px] font-bold uppercase">Soil Probes</span>
                        <strong className="text-v2v-deep text-sm">{sensorFeatures.length} Nodes</strong>
                        <span className="text-[9px] text-emerald-600 block">Multi-Depth</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                        <span className="text-gray-400 block text-[9px] font-bold uppercase">Water Table</span>
                        <strong className="text-v2v-deep text-sm">450 Ft</strong>
                        <span className="text-[9px] text-emerald-600 block">Optimal</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-700">
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span>Soil Classification:</span>
                        <span className="text-v2v-deep font-bold">Deep Clayey Alluvial Loam</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span>Irrigation Method:</span>
                        <span className="text-v2v-deep font-bold">Automated Sub-Surface Drip (VFD)</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold">
                        <span>Power Feeder:</span>
                        <span className="text-emerald-700 font-bold">Dedicated 3-Phase Agricultural Grid</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Internal Crop Sub-Plots in this Land ── */}
                  {zoneFeatures.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 space-y-2">
                      <div className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                        <span>🌱 Cultivated Crop Sub-Fields ({zoneFeatures.length}):</span>
                        <span className="text-[10px] text-purple-600 font-semibold">Click to view crop details</span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {zoneFeatures.map((zone, idx) => {
                          const zp = zone.properties || {}
                          const zCol = zp.shade_color || '#10B981'
                          return (
                            <div
                              key={`modal-z-${zp.id || idx}`}
                              onClick={() => setActiveModal({ type: 'zone', data: zp })}
                              className="flex items-center justify-between p-2 rounded-xl bg-purple-50/40 hover:bg-purple-100/70 border border-purple-100 cursor-pointer transition-all hover:scale-[1.01]"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: zCol }}
                                />
                                <div>
                                  <div className="font-bold text-xs text-v2v-deep">
                                    {zp.crop || zp.name}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    {zp.crop_category || 'Commercial Horticulture'} · Health: {zp.health_index || '96%'}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg bg-white border border-purple-200 text-v2v-deep font-extrabold text-[11px]">
                                {zp.area_acres ? `${zp.area_acres} Ac` : `${zp.area_hectares} Ha`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Download GeoJSON / Passbook Button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${currentFarmer?.full_name?.replace(/\s+/g, '_')}_Farmland_Twin.geojson`
                        a.click()
                        URL.revokeObjectURL(url)
                        toast.success('Farmland GeoJSON digital passbook exported!')
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-v2v-deep border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>📑</span>
                      <span>Export Digital Passbook (GeoJSON)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: 'farmer_info', data: currentFarmer })}
                      className="px-4 py-2 rounded-xl bg-v2v-deep hover:bg-v2v-secondary text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                    >
                      <span>👤</span>
                      <span>Farmer Profile</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scratch Map Digitizer & Sub-Field Studio Modal ── */}
      <ScratchMapDigitizerModal
        isOpen={showScratchModal}
        onClose={() => setShowScratchModal(false)}
        onCreatedFarmer={(newFarmer) => {
          const all = farmStorage.getFarmers()
          setFarmers(all)
          setSelectedFarmerId(newFarmer.id)
          const data = farmStorage.getFieldGeoJSON(newFarmer.field_id)
          setGeojson(data)
          navigate(`/farmer?farmerId=${newFarmer.id}`, { replace: true })
        }}
      />
    </div>
  )
}
