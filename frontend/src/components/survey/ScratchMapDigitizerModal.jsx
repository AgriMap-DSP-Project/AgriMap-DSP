import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import farmStorage from '../../lib/farmStorage'
import toast from '../ui/Toast'
import {
  calculatePolygonArea,
  calculatePerimeter,
  getDistanceMeters,
  isValidLatLng,
  BASEMAP_OPTIONS,
} from '../../lib/geoUtils'

// Pre-configured Indian agricultural regional presets for 1-click jump
const REGIONAL_PRESETS = [
  { name: 'Pollachi, Tamil Nadu', lat: 10.6585, lng: 77.0125, crop: 'Coconut & Cocoa', zoom: 16 },
  { name: 'Anand, Gujarat', lat: 22.5645, lng: 72.9289, crop: 'Mango & Dairy', zoom: 16 },
  { name: 'Karad, Maharashtra', lat: 17.2892, lng: 74.1812, crop: 'Sugarcane & Cotton', zoom: 16 },
  { name: 'Nashik, Maharashtra', lat: 19.9975, lng: 73.7898, crop: 'Vineyards & Onions', zoom: 16 },
  { name: 'Salem, Tamil Nadu', lat: 11.6643, lng: 78.1460, crop: 'Tapioca & Mango', zoom: 16 },
  { name: 'Thanjavur, Tamil Nadu', lat: 10.7870, lng: 79.1378, crop: 'Basmati Paddy', zoom: 16 },
  { name: 'Ludhiana, Punjab', lat: 30.9010, lng: 75.8573, crop: 'Wheat & Rice', zoom: 16 },
  { name: 'Shimoga, Karnataka', lat: 13.9299, lng: 75.5681, crop: 'Arecanut & Spices', zoom: 16 },
]

// Preset Crop Options with thematic V2V Tech & Agronomic brand palette
export const CROP_PRESETS = [
  { id: 'mango', name: 'Alphonso Mango Orchard', icon: '🥭', color: '#F59E0B', defaultSeason: 'Annual Perennial', waterReq: 'Medium Drip' },
  { id: 'cotton', name: 'Bt Cotton (Bollgard II)', icon: '🌾', color: '#10B981', defaultSeason: 'Kharif', waterReq: 'Controlled Furrow' },
  { id: 'sugarcane', name: 'Co-86032 Drip Sugarcane', icon: '🎋', color: '#8A57C0', defaultSeason: 'Eksali 12-Month', waterReq: 'High Drip' },
  { id: 'paddy', name: 'CR-1009 Basmati Paddy', icon: '🌾', color: '#3B82F6', defaultSeason: 'Samba / Rabi', waterReq: 'Puddled Submersion' },
  { id: 'banana', name: 'Grand Naine Tissue Banana', icon: '🍌', color: '#84CC16', defaultSeason: 'Year-Round', waterReq: 'Micro-Jet Sprinkler' },
  { id: 'groundnut', name: 'Groundnut & Pulses', icon: '🥜', color: '#EA580C', defaultSeason: 'Summer / Kharif', waterReq: 'Low Sprinkler' },
  { id: 'vegetables', name: 'Organic Vegetables & Tomato', icon: '🍅', color: '#EF4444', defaultSeason: 'Short 90-day', waterReq: 'Precision Drip' },
  { id: 'coconut', name: 'Pollachi Tall Coconut Palms', icon: '🥥', color: '#059669', defaultSeason: 'Perennial', waterReq: 'Sub-surface Drip' },
  { id: 'corn', name: 'Sweet Corn & Maize', icon: '🌽', color: '#EAB308', defaultSeason: 'Rabi / Kharif', waterReq: 'Medium Sprinkler' },
]

// Map Controller for click events and panning
function MapEventsHandler({ activeMode, onMapClick }) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    if (activeMode === 'collect_boundary' || activeMode === 'collect_subfield') {
      container.style.cursor = 'crosshair'
    } else {
      container.style.cursor = ''
    }
  }, [activeMode, map])

  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng])
      }
    },
  })

  return null
}

// Controller to smoothly pan/zoom map when region changes
function MapViewUpdater({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom || 16, { duration: 1.2, easeLinearity: 0.25 })
    }
  }, [center, zoom, map])
  return null
}

// Custom Vertex Pin Icon
const createVertexPinIcon = (number, color = '#2A0C58') => {
  return L.divIcon({
    className: 'vertex-map-pin',
    html: `
      <div style="
        background: ${color};
        color: white;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 10px rgba(42, 12, 88, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
        transform: translate(-11px, -11px);
        transition: transform 0.15s ease;
      ">
        ${number}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function ScratchMapDigitizerModal({ isOpen = true, onClose, onCreatedFarmer, onSaved }) {
  if (!isOpen) return null

  // Map view center
  const [mapCenter, setMapCenter] = useState([10.6585, 77.0125]) // Default Pollachi
  const [mapZoom, setMapZoom] = useState(16)
  const [activeBasemapId, setActiveBasemapId] = useState('satellite')
  const currentBasemap = BASEMAP_OPTIONS.find(b => b.id === activeBasemapId) || BASEMAP_OPTIONS[0]

  // Search & jump
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Modes: 'collect_boundary' (Click to collect outer points) | 'subfields' (Create & design crop sub-plots)
  const [activeMode, setActiveMode] = useState('collect_boundary')

  // Boundary Points: array of [lat, lng]
  const [boundaryPoints, setBoundaryPoints] = useState([])

  // Sub-Fields / Crop Plots inside this farm
  // Each subfield: { id, name, crop, icon, color, area_acres, area_hectares, points: [[lat,lng],...] }
  const [subfields, setSubfields] = useState([])
  const [activeSubfieldDrawing, setActiveSubfieldDrawing] = useState(null)
  const [subfieldDraftPoints, setSubfieldDraftPoints] = useState([])
  const [selectedCropPreset, setSelectedCropPreset] = useState(CROP_PRESETS[0])
  const [customPlotName, setCustomPlotName] = useState('')

  // Farmer Meta Details Form
  const [farmerDetails, setFarmerDetails] = useState({
    full_name: '',
    contact_number: '',
    email: '',
    village: 'Pollachi Rural',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    khata_number: `TN-V2V-${Math.floor(1000 + Math.random() * 9000)}`,
  })

  // Geodesic Calculations for Boundary
  const boundaryMetrics = useMemo(() => {
    const area = calculatePolygonArea(boundaryPoints)
    const perim = calculatePerimeter(boundaryPoints)
    return {
      acres: area.acres,
      hectares: area.hectares,
      sqMeters: area.sqMeters,
      perimeterMeters: perim.meters,
      perimeterFeet: perim.feet,
      pointCount: boundaryPoints.length,
    }
  }, [boundaryPoints])

  // Geodesic Calculations for Current Draft Sub-field
  const draftSubfieldMetrics = useMemo(() => {
    if (subfieldDraftPoints.length < 3) return { acres: 0, hectares: 0 }
    return calculatePolygonArea(subfieldDraftPoints)
  }, [subfieldDraftPoints])

  // Total Allocated Crop Acres from Subfields
  const totalSubfieldAcres = useMemo(() => {
    return subfields.reduce((sum, sf) => sum + (sf.area_acres || 0), 0)
  }, [subfields])

  // Handle map clicks based on active mode
  const handleMapClick = (latlng) => {
    if (activeMode === 'collect_boundary') {
      setBoundaryPoints(prev => [...prev, latlng])
    } else if (activeMode === 'collect_subfield') {
      setSubfieldDraftPoints(prev => [...prev, latlng])
    }
  }

  // Undo last collected boundary point
  const handleUndoPoint = () => {
    if (activeMode === 'collect_boundary') {
      setBoundaryPoints(prev => prev.slice(0, -1))
    } else if (activeMode === 'collect_subfield') {
      setSubfieldDraftPoints(prev => prev.slice(0, -1))
    }
  }

  // Clear all points
  const handleClearPoints = () => {
    if (activeMode === 'collect_boundary') {
      setBoundaryPoints([])
      setSubfields([])
    } else if (activeMode === 'collect_subfield') {
      setSubfieldDraftPoints([])
    }
  }

  // Auto-generate starter rectangular boundary around current map center if user wants quick start
  const handleGenerateStarterBoundary = () => {
    const [lat, lng] = mapCenter
    const dLat = 0.002
    const dLng = 0.0025
    const starter = [
      [lat - dLat, lng - dLng],
      [lat - dLat, lng + dLng],
      [lat + dLat, lng + dLng],
      [lat + dLat, lng - dLng],
    ]
    setBoundaryPoints(starter)
    toast.success('Generated initial starter boundary! You can click anywhere to collect custom points or edit corners.')
  }

  // Regional Preset Selection
  const handleSelectRegion = (preset) => {
    setMapCenter([preset.lat, preset.lng])
    setMapZoom(preset.zoom || 16)
    setFarmerDetails(prev => ({
      ...prev,
      village: preset.name.split(',')[0],
      district: preset.name.split(',')[0],
      state: preset.name.split(',')[1]?.trim() || 'India',
    }))
    toast.info(`Centered map on ${preset.name}`)
  }

  // Location Search via Nominatim Free OpenStreetMap Geocoder
  const handleSearchLocation = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      )
      const data = await resp.json()
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        setMapCenter([lat, lng])
        setMapZoom(16)
        setFarmerDetails(prev => ({
          ...prev,
          village: data[0].display_name.split(',')[0],
        }))
        toast.success(`Found: ${data[0].display_name.slice(0, 45)}...`)
      } else {
        toast.error('Location not found. Please try a district or village name.')
      }
    } catch (err) {
      console.warn('Geocoding error:', err)
      toast.error('Search request timed out. You can click any regional preset or pan manually.')
    } finally {
      setIsSearching(false)
    }
  }

  // Start Drawing a Sub-field / Crop Zone
  const handleStartSubfieldDrawing = () => {
    if (boundaryPoints.length < 3) {
      toast.warning('Please mark at least 3 boundary points for the farm before creating internal sub-fields!')
      return
    }
    setActiveMode('collect_subfield')
    setSubfieldDraftPoints([])
    setCustomPlotName(`Plot ${String.fromCharCode(65 + subfields.length)} — ${selectedCropPreset.name}`)
  }

  // Save current Sub-field
  const handleSaveSubfield = () => {
    if (subfieldDraftPoints.length < 3) {
      toast.warning('Please collect at least 3 corner points to outline this sub-field plot!')
      return
    }
    const metrics = calculatePolygonArea(subfieldDraftPoints)
    const newSubfield = {
      id: `zone-${Date.now()}`,
      name: customPlotName || `Plot ${String.fromCharCode(65 + subfields.length)}`,
      crop: selectedCropPreset.name,
      crop_id: selectedCropPreset.id,
      icon: selectedCropPreset.icon,
      color: selectedCropPreset.color,
      water_requirement: selectedCropPreset.waterReq,
      area_acres: metrics.acres,
      area_hectares: metrics.hectares,
      points: subfieldDraftPoints,
    }
    setSubfields(prev => [...prev, newSubfield])
    setSubfieldDraftPoints([])
    setActiveMode('subfields')
    toast.success(`Sub-field "${newSubfield.name}" (${metrics.acres} Acres) created!`)
  }

  // Quick auto-partition internal quadrants
  const handleAutoPartitionPlot = () => {
    if (boundaryPoints.length < 3) {
      toast.warning('Mark outer boundary points first!')
      return
    }
    // Divide farm into proportional sub-plot based on bounding box
    const lats = boundaryPoints.map(p => p[0])
    const lngs = boundaryPoints.map(p => p[1])
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const midLat = (minLat + maxLat) / 2
    const midLng = (minLng + maxLng) / 2

    // Create 2 starter zones: North & South
    const plotA = [
      [minLat, minLng],
      [midLat, minLng],
      [midLat, maxLng],
      [minLat, maxLng],
    ]
    const plotB = [
      [midLat, minLng],
      [maxLat, minLng],
      [maxLat, maxLng],
      [midLat, maxLng],
    ]

    const areaA = calculatePolygonArea(plotA)
    const areaB = calculatePolygonArea(plotB)

    const sfA = {
      id: `zone-A-${Date.now()}`,
      name: `Plot A — ${CROP_PRESETS[0].name}`,
      crop: CROP_PRESETS[0].name,
      icon: CROP_PRESETS[0].icon,
      color: CROP_PRESETS[0].color,
      area_acres: areaA.acres,
      area_hectares: areaA.hectares,
      points: plotA,
    }
    const sfB = {
      id: `zone-B-${Date.now()}`,
      name: `Plot B — ${CROP_PRESETS[1].name}`,
      crop: CROP_PRESETS[1].name,
      icon: CROP_PRESETS[1].icon,
      color: CROP_PRESETS[1].color,
      area_acres: areaB.acres,
      area_hectares: areaB.hectares,
      points: plotB,
    }

    setSubfields([sfA, sfB])
    setActiveMode('subfields')
    toast.success('Auto-partitioned 2 internal crop plots!')
  }

  // Delete a sub-field
  const handleDeleteSubfield = (id) => {
    setSubfields(prev => prev.filter(s => s.id !== id))
    toast.info('Sub-field removed.')
  }

  // Finalize & Save New Farmer
  const handleFinalizeFarmland = () => {
    if (!farmerDetails.full_name.trim()) {
      toast.error('Please enter the Farmer Full Name!')
      return
    }
    if (boundaryPoints.length < 3) {
      toast.error('Please mark at least 3 points on the map to define the farmland boundary!')
      return
    }

    // Build crop summary text
    let cropSummaryStr = ''
    if (subfields.length > 0) {
      cropSummaryStr = subfields.map(sf => `${sf.crop} (${sf.area_acres} Ac)`).join(', ')
    } else {
      cropSummaryStr = `${selectedCropPreset.name} (${boundaryMetrics.acres} Ac)`
    }

    // Prepare farmer record
    const farmerId = `farmer-${Date.now()}`
    const fieldId = `field-${Date.now()}`

    const farmerPayload = {
      id: farmerId,
      full_name: farmerDetails.full_name,
      contact_number: farmerDetails.contact_number || '+91 98400 00000',
      email: farmerDetails.email || `${farmerDetails.full_name.toLowerCase().replace(/\s+/g, '.')}@v2vfarm.in`,
      village: farmerDetails.village,
      district: farmerDetails.district,
      state: farmerDetails.state,
      khata_number: farmerDetails.khata_number,
      total_acres: boundaryMetrics.acres,
      total_hectares: boundaryMetrics.hectares,
      crops_summary: cropSummaryStr,
      field_id: fieldId,
      borewells_count: 1,
      cctv_count: 1,
      sensors_count: subfields.length > 0 ? subfields.length + 1 : 2,
      readiness_score: 9.2,
      power_status: '3-Phase Active + Solar Hybrid',
      created_at: new Date().toISOString(),
    }

    // Build GeoJSON FeatureCollection
    // 1. Boundary feature (MultiPolygon in [lng, lat])
    // GeoJSON polygon requires closed ring [lng, lat]
    const closedBoundary = [...boundaryPoints]
    if (
      closedBoundary[0][0] !== closedBoundary[closedBoundary.length - 1][0] ||
      closedBoundary[0][1] !== closedBoundary[closedBoundary.length - 1][1]
    ) {
      closedBoundary.push(closedBoundary[0])
    }
    const boundaryGeoCoords = closedBoundary.map(([lat, lng]) => [lng, lat])

    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[boundaryGeoCoords]],
        },
        properties: {
          entity_type: 'field',
          id: fieldId,
          name: `${farmerPayload.full_name}'s Farmland`,
          farmer_id: farmerId,
          farmer_name: farmerPayload.full_name,
          calculated_area_hectares: boundaryMetrics.hectares,
          calculated_area_acres: boundaryMetrics.acres,
          perimeter_meters: boundaryMetrics.perimeterMeters,
          survey_number: farmerPayload.khata_number,
          verification_status: 'verified',
        },
      },
    ]

    // 2. Add Sub-field Crop Zones
    subfields.forEach(sf => {
      const closedSf = [...sf.points]
      if (
        closedSf[0][0] !== closedSf[closedSf.length - 1][0] ||
        closedSf[0][1] !== closedSf[closedSf.length - 1][1]
      ) {
        closedSf.push(closedSf[0])
      }
      const sfGeoCoords = closedSf.map(([lat, lng]) => [lng, lat])

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [sfGeoCoords],
        },
        properties: {
          entity_type: 'zone',
          id: sf.id,
          name: sf.name,
          crop: sf.crop,
          shade_color: sf.color,
          crop_category: 'Precision Smart Crop Plot',
          area_acres: sf.area_acres,
          area_hectares: sf.area_hectares,
          soil_moisture: '68% (Optimal)',
          health_index: '96% (Vibrant)',
          irrigation_type: sf.water_requirement || 'Drip System',
          verification_status: 'verified',
        },
      })
    })

    // 3. Add default primary solar borewell inside boundary
    const centerLat = boundaryPoints.reduce((s, p) => s + p[0], 0) / boundaryPoints.length
    const centerLng = boundaryPoints.reduce((s, p) => s + p[1], 0) / boundaryPoints.length
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [centerLng, centerLat] },
      properties: {
        entity_type: 'resource',
        id: `res-bw-${Date.now()}`,
        name: 'Primary Solar Borewell Pump #1',
        resource_class: 'WATER',
        resource_type: 'borewell_pump',
        status: 'ACTIVE_RUNNING',
        flow_rate_lpm: 160,
        pump_capacity_hp: '10.0 HP Solar Hybrid',
        verification_status: 'verified',
      },
    })

    // 4. Add 4K Solar PTZ Sentinel CCTV
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [centerLng + 0.0003, centerLat + 0.0002] },
      properties: {
        entity_type: 'device',
        id: `cctv-${Date.now()}`,
        device_name: 'V2V Sentinel 4K CCTV #1',
        device_type: 'cctv_camera',
        status: 'ONLINE',
        camera_model: 'V2V Solar-PTZ 4K UltraHD AI Sentinel',
        verification_status: 'verified',
      },
    })

    const fullGeoJSON = {
      type: 'FeatureCollection',
      features,
    }

    // Save GeoJSON and Farmer
    farmStorage.saveFieldGeoJSON(fieldId, fullGeoJSON)
    const created = farmStorage.createFarmer(farmerPayload)

    toast.success(`Farmland digitized successfully for ${created.full_name}!`)
    if (onCreatedFarmer) {
      onCreatedFarmer(created)
    }
    if (onSaved) {
      onSaved(created)
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] max-h-[900px] overflow-hidden shadow-2xl border border-v2v-border flex flex-col animate-slide-up">
        {/* ── Top Header ── */}
        <div className="bg-v2v-primary px-5 py-3.5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/20">
              🗺️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-200 bg-white/10 px-2 py-0.5 rounded-full border border-purple-200/20">
                  Precision Spatial Studio
                </span>
                <span className="text-xs text-emerald-300 font-medium">● 60 FPS Geodesic Engine</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Start Farmland Map From Scratch & Design Crop Sub-Fields
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Main Work Area ── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ── Left Map Canvas (70% on desktop) ── */}
          <div className="relative flex-1 h-[45vh] lg:h-auto bg-gray-900 overflow-hidden">
            {/* Top Toolbar Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {/* Search & Location Jump */}
              <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-v2v-border/80">
                <form onSubmit={handleSearchLocation} className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Search village, city, pin..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-2.5 py-1 text-xs text-gray-800 bg-transparent focus:outline-none w-36 sm:w-52"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3 py-1 bg-v2v-deep text-white rounded-xl text-xs font-bold hover:bg-v2v-violet active:scale-95 transition-all"
                  >
                    {isSearching ? '⏳' : 'Search'}
                  </button>
                </form>
              </div>

              {/* Mode Toggle Pills */}
              <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-v2v-border/80">
                <button
                  onClick={() => setActiveMode('collect_boundary')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeMode === 'collect_boundary'
                      ? 'bg-v2v-deep text-white shadow-sm'
                      : 'text-gray-600 hover:bg-v2v-softwhite'
                  }`}
                >
                  <span>📍</span>
                  <span>1. Collect Boundary ({boundaryPoints.length})</span>
                </button>
                <button
                  onClick={() => setActiveMode('subfields')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeMode === 'subfields' || activeMode === 'collect_subfield'
                      ? 'bg-v2v-purple text-white shadow-sm'
                      : 'text-gray-600 hover:bg-v2v-softwhite'
                  }`}
                >
                  <span>🌱</span>
                  <span>2. Sub-Field Crops ({subfields.length})</span>
                </button>
              </div>

              {/* Basemap Toggle */}
              <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-v2v-border/80">
                {BASEMAP_OPTIONS.slice(0, 3).map(bm => (
                  <button
                    key={bm.id}
                    onClick={() => setActiveBasemapId(bm.id)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      activeBasemapId === bm.id
                        ? 'bg-v2v-electric text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={bm.description}
                  >
                    {bm.icon} {bm.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Status & Precision Processor Readout Overlay */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {/* Geodesic processor badge */}
              <div className="pointer-events-auto bg-v2v-charcoal/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-white shadow-xl flex items-center gap-4 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-300">Total Farmland Area</div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {boundaryMetrics.acres} <span className="text-xs font-normal text-purple-200">Acres</span>
                    <span className="text-[11px] text-gray-400 font-normal ml-1">
                      ({boundaryMetrics.hectares} Ha)
                    </span>
                  </div>
                </div>
                <div className="h-7 w-[1px] bg-white/20" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-300">Perimeter</div>
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    {boundaryMetrics.perimeterMeters} m
                  </div>
                </div>
                <div className="h-7 w-[1px] bg-white/20" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-300">Sub-Field Plots</div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-400">
                    {subfields.length} Crops ({totalSubfieldAcres.toFixed(1)} Ac)
                  </div>
                </div>
              </div>

              {/* Point Action Buttons */}
              <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-v2v-border">
                <button
                  onClick={handleUndoPoint}
                  disabled={
                    (activeMode === 'collect_boundary' && boundaryPoints.length === 0) ||
                    (activeMode === 'collect_subfield' && subfieldDraftPoints.length === 0)
                  }
                  className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-colors"
                  title="Undo last point"
                >
                  ↩ Undo Point
                </button>
                <button
                  onClick={handleClearPoints}
                  disabled={boundaryPoints.length === 0}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 transition-colors"
                  title="Clear all points"
                >
                  🗑️ Clear
                </button>
                {boundaryPoints.length === 0 && (
                  <button
                    onClick={handleGenerateStarterBoundary}
                    className="px-3 py-1 bg-v2v-electric text-white text-xs font-bold rounded-lg hover:bg-v2v-violet active:scale-95 transition-all"
                  >
                    ✨ Quick Boundary
                  </button>
                )}
              </div>
            </div>

            {/* Instruction Banner when collecting points */}
            {activeMode === 'collect_boundary' && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-v2v-deep/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border border-purple-300/30 flex items-center gap-2 pointer-events-none animate-pulse-subtle">
                <span>📍</span>
                <span>
                  {boundaryPoints.length === 0
                    ? 'Click anywhere on the map to start placing boundary corner points (Collect, Collect!)'
                    : `Placed point #${boundaryPoints.length}. Click next corner or switch to Sub-Fields when done.`}
                </span>
              </div>
            )}

            {activeMode === 'collect_subfield' && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-emerald-700/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border border-emerald-300/30 flex items-center gap-2 pointer-events-none animate-pulse-subtle">
                <span>🌱</span>
                <span>
                  Tracing Sub-Field: Click points inside the boundary to shape this plot ({subfieldDraftPoints.length} points).
                </span>
              </div>
            )}

            {/* Leaflet Map Canvas */}
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url={currentBasemap.url} maxZoom={currentBasemap.maxZoom} />
              <MapEventsHandler activeMode={activeMode} onMapClick={handleMapClick} />
              <MapViewUpdater center={mapCenter} zoom={mapZoom} />

              {/* Outer Farmland Boundary Polygon */}
              {boundaryPoints.length >= 3 && (
                <Polygon
                  positions={boundaryPoints}
                  pathOptions={{
                    color: '#2A0C58',
                    fillColor: '#8A57C0',
                    fillOpacity: 0.18,
                    weight: 3.5,
                    dashArray: '6, 6',
                  }}
                >
                  <Tooltip permanent direction="center" className="font-bold text-xs">
                    {farmerDetails.full_name || 'Farmer Land'} — {boundaryMetrics.acres} Ac
                  </Tooltip>
                </Polygon>
              )}

              {/* Line between points if less than 3 points */}
              {boundaryPoints.filter(isValidLatLng).length === 2 && (
                <Polyline
                  positions={boundaryPoints.filter(isValidLatLng)}
                  pathOptions={{ color: '#8A57C0', weight: 3, dashArray: '4, 4' }}
                />
              )}

              {/* Outer Boundary Vertex Marker Pins */}
              {boundaryPoints.filter(isValidLatLng).map((pt, idx) => (
                <Marker
                  key={`pt-${idx}`}
                  position={pt}
                  icon={createVertexPinIcon(idx + 1, '#2A0C58')}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>Boundary Corner #{idx + 1}</strong>
                      <br />
                      Lat: {pt[0].toFixed(5)}, Lng: {pt[1].toFixed(5)}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Saved Sub-Field Crop Polygons */}
              {subfields.map((sf, idx) => {
                const validPts = Array.isArray(sf.points) ? sf.points.filter(isValidLatLng) : []
                if (validPts.length < 3) return null
                return (
                  <Polygon
                    key={sf.id || idx}
                    positions={validPts}
                    pathOptions={{
                      color: sf.color || '#10B981',
                      fillColor: sf.color || '#10B981',
                      fillOpacity: 0.35,
                      weight: 2.5,
                    }}
                  >
                    <Tooltip permanent direction="center" className="text-[11px] font-bold">
                      {sf.icon} {sf.crop} ({sf.area_acres} Ac)
                    </Tooltip>
                  </Polygon>
                )
              })}

              {/* Current Active Subfield Draft Polygon being drawn */}
              {subfieldDraftPoints.filter(isValidLatLng).length >= 3 && (
                <Polygon
                  positions={subfieldDraftPoints.filter(isValidLatLng)}
                  pathOptions={{
                    color: selectedCropPreset.color,
                    fillColor: selectedCropPreset.color,
                    fillOpacity: 0.45,
                    weight: 3,
                    dashArray: '3, 3',
                  }}
                />
              )}

              {subfieldDraftPoints.filter(isValidLatLng).map((pt, idx) => (
                <Marker
                  key={`sf-pt-${idx}`}
                  position={pt}
                  icon={createVertexPinIcon(idx + 1, selectedCropPreset.color)}
                />
              ))}
            </MapContainer>
          </div>

          {/* ── Right Panel: Controls, Sub-Field Crop Designer, Farmer Meta (30% on desktop) ── */}
          <div className="w-full lg:w-96 bg-v2v-softwhite border-t lg:border-t-0 lg:border-l border-v2v-border flex flex-col h-[50vh] lg:h-auto overflow-y-auto">
            {/* Step Selector Tab Header */}
            <div className="bg-white p-3 border-b border-v2v-border flex items-center justify-between sticky top-0 z-20">
              <span className="text-xs font-black uppercase text-v2v-deep tracking-wider">
                Farmland Configuration
              </span>
              <span className="text-[11px] font-bold text-v2v-purple bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                Khata: {farmerDetails.khata_number}
              </span>
            </div>

            <div className="p-4 space-y-5 flex-1">
              {/* ── Section 1: Regional Hubs Quick Jump ── */}
              <div>
                <label className="label flex items-center justify-between">
                  <span>📍 Quick Regional Jumps</span>
                  <span className="text-[10px] text-gray-500 font-normal">Click to position</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {REGIONAL_PRESETS.slice(0, 6).map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectRegion(preset)}
                      className="text-left px-2.5 py-1.5 bg-white hover:bg-v2v-softwhite border border-v2v-border hover:border-v2v-purple rounded-xl text-xs transition-all flex flex-col"
                    >
                      <span className="font-bold text-gray-800 truncate">{preset.name.split(',')[0]}</span>
                      <span className="text-[10px] text-gray-500 truncate">{preset.crop}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Section 2: Farmer & Land Details ── */}
              <div className="bg-white p-3.5 rounded-2xl border border-v2v-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-v2v-deep tracking-wider">
                    Farmer & Land Ownership
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    GPS Verified
                  </span>
                </div>
                <div>
                  <label className="label">Farmer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={farmerDetails.full_name}
                    onChange={e => setFarmerDetails({ ...farmerDetails, full_name: e.target.value })}
                    className="input-field py-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98400..."
                      value={farmerDetails.contact_number}
                      onChange={e => setFarmerDetails({ ...farmerDetails, contact_number: e.target.value })}
                      className="input-field py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Khata / Survey #</label>
                    <input
                      type="text"
                      value={farmerDetails.khata_number}
                      onChange={e => setFarmerDetails({ ...farmerDetails, khata_number: e.target.value })}
                      className="input-field py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Village / Taluk</label>
                    <input
                      type="text"
                      value={farmerDetails.village}
                      onChange={e => setFarmerDetails({ ...farmerDetails, village: e.target.value })}
                      className="input-field py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input
                      type="text"
                      value={farmerDetails.state}
                      onChange={e => setFarmerDetails({ ...farmerDetails, state: e.target.value })}
                      className="input-field py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Sub-Field / Crop Partitioning ("selecting fielding inside boundary like farmers land, a small, small field, different crops") ── */}
              <div className="bg-white p-3.5 rounded-2xl border border-v2v-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-v2v-deep tracking-wider flex items-center gap-1.5">
                      <span>🌱 Sub-Field Crop Plots</span>
                    </h4>
                    <p className="text-[10px] text-gray-500">Divide land into distinct crop zones</p>
                  </div>
                  <span className="text-xs font-extrabold text-v2v-purple">
                    {subfields.length} Plotted
                  </span>
                </div>

                {/* Subfield Drawing Active Banner */}
                {activeMode === 'collect_subfield' ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                      <span>Drawing: {customPlotName}</span>
                      <span>{draftSubfieldMetrics.acres} Acres</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Click corners on the map inside the boundary. ({subfieldDraftPoints.length} points placed)
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveSubfield}
                        disabled={subfieldDraftPoints.length < 3}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        ✓ Save Plot ({draftSubfieldMetrics.acres} Ac)
                      </button>
                      <button
                        onClick={() => {
                          setActiveMode('subfields')
                          setSubfieldDraftPoints([])
                        }}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Crop Preset Selector */}
                    <div>
                      <label className="label">Select Crop Type</label>
                      <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {CROP_PRESETS.map(crop => (
                          <button
                            key={crop.id}
                            type="button"
                            onClick={() => setSelectedCropPreset(crop)}
                            className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col items-start gap-0.5 ${
                              selectedCropPreset.id === crop.id
                                ? 'border-v2v-purple bg-purple-50 shadow-sm'
                                : 'border-v2v-border bg-white hover:bg-v2v-softwhite'
                            }`}
                          >
                            <span className="text-base">{crop.icon}</span>
                            <span className="font-bold text-[11px] text-gray-900 leading-tight">
                              {crop.name.split(' ')[0]}
                            </span>
                            <span
                              className="w-full h-1 rounded-full mt-1"
                              style={{ backgroundColor: crop.color }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons to draw or partition */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleStartSubfieldDrawing}
                        disabled={boundaryPoints.length < 3}
                        className="w-full py-2 bg-v2v-purple text-white text-xs font-bold rounded-xl hover:bg-v2v-violet active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>✏️</span>
                        <span>Click to Outline {selectedCropPreset.name.split(' ')[0]} Plot</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoPartitionPlot}
                        disabled={boundaryPoints.length < 3}
                        className="w-full py-2 bg-white border border-v2v-border text-v2v-deep text-xs font-bold rounded-xl hover:bg-v2v-softwhite active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>⚡</span>
                        <span>Auto-Partition Farm Into 2 Quadrants</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Subfields List */}
                {subfields.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-v2v-border">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Configured Plots:</div>
                    {subfields.map((sf, idx) => (
                      <div
                        key={sf.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-v2v-softwhite border border-v2v-border text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: sf.color }}
                          />
                          <span className="font-bold text-gray-900 truncate">
                            {sf.icon} {sf.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-v2v-deep whitespace-nowrap">
                            {sf.area_acres} Ac
                          </span>
                          <button
                            onClick={() => handleDeleteSubfield(sf.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs px-1"
                            title="Delete plot"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer Action Button ── */}
            <div className="p-4 bg-white border-t border-v2v-border sticky bottom-0 z-20 space-y-2">
              <button
                onClick={handleFinalizeFarmland}
                disabled={boundaryPoints.length < 3 || !farmerDetails.full_name.trim()}
                className="w-full btn-v2v-gradient py-3 text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <span>🚀</span>
                <span>Finalize & Create Farmland Digital Twin</span>
              </button>
              <div className="text-center">
                <span className="text-[10px] text-gray-500">
                  Calculated: {boundaryMetrics.acres} Acres &bull; {subfields.length} Sub-Plots &bull; 1 Borewell &bull; 1 4K CCTV
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
