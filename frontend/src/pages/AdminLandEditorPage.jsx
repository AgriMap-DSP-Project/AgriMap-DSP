import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import farmStorage from '../lib/farmStorage'
import toast from '../components/ui/Toast'
import ScratchMapDigitizerModal from '../components/survey/ScratchMapDigitizerModal'
import {
  getDistanceMeters,
  calculatePathLength,
  calculatePolygonArea,
  calculatePerimeter,
  BASEMAP_OPTIONS,
  createVertexIcon,
  createPinIcon,
  isValidLatLng,
  extractBoundaryLatLngs,
} from '../lib/geoUtils'

// ── Auto-Fit Bounds Component ─────────────────────────────────────────────
function FitBounds({ geojson, focusCoords }) {
  const map = useMap()
  useEffect(() => {
    if (focusCoords && focusCoords.length >= 3 && focusCoords.every(isValidLatLng)) {
      try {
        const bounds = L.latLngBounds(focusCoords)
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 })
        }
      } catch { /* ignore */ }
      return
    }

    if (!geojson) return
    try {
      const layer = L.geoJSON(geojson)
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 })
    } catch { /* ignore */ }
  }, [geojson, focusCoords, map])
  return null
}

// ── Map Click & Drawing Controller ─────────────────────────────────────────
function MapEventsController({
  isDrawingBoundary,
  isPickingDeviceLocation,
  onMapClick,
  cursorStyle,
}) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    if (isDrawingBoundary || isPickingDeviceLocation) {
      container.style.cursor = 'crosshair'
    } else {
      container.style.cursor = ''
    }
  }, [isDrawingBoundary, isPickingDeviceLocation, map])

  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng)
    },
  })

  return null
}

export default function AdminLandEditorPage() {
  const { fieldId = 'field-1' } = useParams()
  const navigate = useNavigate()

  const [geojson, setGeojson] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState(fieldId)
  const [activeTab, setActiveTab] = useState('boundary') // 'boundary' | 'devices'
  const [showScratchModal, setShowScratchModal] = useState(false)

  // Basemap Selector state
  const [activeBasemapId, setActiveBasemapId] = useState('satellite')
  const currentBasemap = BASEMAP_OPTIONS.find(b => b.id === activeBasemapId) || BASEMAP_OPTIONS[0]

  // ── Boundary Editor State ──
  // Boundary editing modes: 'edit_corners' (drag & drop existing) | 'click_draw' (click point 1, 2, 3...)
  const [boundaryEditMode, setBoundaryEditMode] = useState('edit_corners')
  const [boundaryPoints, setBoundaryPoints] = useState([]) // Array of [lat, lng]
  const [originalPoints, setOriginalPoints] = useState([]) // To allow undo/reset
  const [hasUnsavedBoundary, setHasUnsavedBoundary] = useState(false)
  const [hoveredVertexIdx, setHoveredVertexIdx] = useState(null)
  const [showJsonModal, setShowJsonModal] = useState(false)

  // ── Device Management State ──
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false)
  const [isPickingDeviceLocation, setIsPickingDeviceLocation] = useState(false)
  const [deviceForm, setDeviceForm] = useState({
    type: 'borewell', // 'borewell' | 'cctv' | 'sensor'
    name: '',
    lat: '10.6585',
    lng: '77.0125',
    pump_hp: '7.5 HP',
    depth: '420',
    flow_rate: '130',
    yesterday_hours: '4.0',
    yesterday_liters: '31200',
    camera_model: 'V2V Solar PTZ 4K UltraHD Sentinel',
  })

  // Load field GeoJSON and Farmers
  useEffect(() => {
    const fList = farmStorage.getFarmers()
    setFarmers(fList)
    const gj = farmStorage.getFieldGeoJSON(selectedFieldId)
    setGeojson(gj)

    // Extract initial polygon coordinates safely
    const fieldFeat = gj?.features?.find(f => f.properties?.entity_type === 'field')
    const latlngs = extractBoundaryLatLngs(fieldFeat?.geometry)
    if (latlngs.length >= 3) {
      setBoundaryPoints(latlngs)
      setOriginalPoints(latlngs)
      setHasUnsavedBoundary(false)
    }
  }, [selectedFieldId])

  const currentFarmer = useMemo(() => {
    return farmers.find(f => f.field_id === selectedFieldId) || farmers[0]
  }, [farmers, selectedFieldId])

  const features = geojson?.features || []
  const fieldFeature = features.find(f => f.properties?.entity_type === 'field')
  const devices = features.filter(f => f.properties?.entity_type !== 'field' && f.geometry?.type === 'Point')
  const lines = features.filter(f => f.geometry?.type === 'LineString')

  // Calculate live boundary statistics
  const boundaryArea = useMemo(() => {
    return calculatePolygonArea(boundaryPoints)
  }, [boundaryPoints])

  const boundaryPerimeter = useMemo(() => {
    return calculatePerimeter(boundaryPoints)
  }, [boundaryPoints])

  // ── Handle Map Click ──
  const handleMapClick = useCallback((latlng) => {
    const { lat, lng } = latlng

    // If picking location for device
    if (isPickingDeviceLocation) {
      setDeviceForm(prev => ({
        ...prev,
        lat: lat.toFixed(5),
        lng: lng.toFixed(5),
      }))
      setIsPickingDeviceLocation(false)
      setShowAddDeviceModal(true)
      toast.success(`📍 Coordinates selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      return
    }

    // If in Click-to-Draw boundary mode
    if (activeTab === 'boundary' && boundaryEditMode === 'click_draw') {
      setBoundaryPoints(prev => {
        const next = [...prev, [lat, lng]]
        const ptNum = next.length
        if (ptNum === 1) {
          toast.info(`Point #1 placed: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E. Click next corner!`)
        } else if (ptNum === 2) {
          const dist = getDistanceMeters(next[0], next[1]).toFixed(0)
          toast.info(`Point #2 placed! Line segment: ${dist} m. Click 3rd corner to form land area!`)
        } else if (ptNum === 3) {
          const area = calculatePolygonArea(next)
          toast.success(`Point #3 placed! Farm Area: ${area.acres} Acres (${area.hectares} Ha)`)
        } else {
          toast.info(`Point #${ptNum} added.`)
        }
        return next
      })
      setHasUnsavedBoundary(true)
    }
  }, [isPickingDeviceLocation, activeTab, boundaryEditMode])

  // ── Dragging an Existing Vertex ──
  const handleVertexDrag = (idx, event) => {
    const { lat, lng } = event.target.getLatLng()
    setBoundaryPoints(prev => {
      const copy = [...prev]
      copy[idx] = [lat, lng]
      return copy
    })
    setHasUnsavedBoundary(true)
  }

  // ── Delete a Specific Vertex ──
  const handleDeleteVertex = (idx) => {
    if (boundaryPoints.length <= 3) {
      toast.error('A farmland boundary requires at least 3 corner points.')
      return
    }
    setBoundaryPoints(prev => prev.filter((_, i) => i !== idx))
    setHasUnsavedBoundary(true)
    toast.success(`Corner #${idx + 1} removed.`)
  }

  // ── Undo Last Point ──
  const handleUndoPoint = () => {
    if (boundaryPoints.length === 0) return
    setBoundaryPoints(prev => prev.slice(0, -1))
    setHasUnsavedBoundary(true)
  }

  // ── Reset to Original Boundary ──
  const handleResetBoundary = () => {
    setBoundaryPoints([...originalPoints])
    setHasUnsavedBoundary(false)
    setBoundaryEditMode('edit_corners')
    toast.info('Boundary restored to saved configuration.')
  }

  // ── Clear All Points ──
  const handleClearBoundary = () => {
    setBoundaryPoints([])
    setHasUnsavedBoundary(true)
    setBoundaryEditMode('click_draw')
    toast.info('Cleared boundary. Click anywhere on the satellite map to place Point #1.')
  }

  // ── Save Boundary to Storage ──
  const handleSaveBoundary = () => {
    if (boundaryPoints.length < 3) {
      toast.error('Cannot save: Must have at least 3 vertices to enclose a boundary.')
      return
    }

    // Convert [lat, lng] to GeoJSON [lng, lat] and ensure closed loop
    const closed = boundaryPoints.map(([lat, lng]) => [lng, lat])
    closed.push(closed[0])

    const areaHa = boundaryArea.hectares

    // Update in farmStorage
    const updatedGj = farmStorage.updateBoundary(selectedFieldId, closed, areaHa)
    setGeojson(updatedGj)
    setOriginalPoints([...boundaryPoints])
    setHasUnsavedBoundary(false)

    // Also update the farmer's total acres/hectares in the farmers table
    if (currentFarmer?.id) {
      farmStorage.updateFarmer(currentFarmer.id, {
        total_hectares: areaHa,
        total_acres: boundaryArea.acres,
      })
      setFarmers(farmStorage.getFarmers())
    }

    toast.success(`🎉 Farmland boundary saved! New area: ${boundaryArea.acres} Acres (${areaHa} Ha)`)
  }

  // ── Add Device Form Submit ──
  const handleAddDevice = (e) => {
    e.preventDefault()
    const lat = parseFloat(deviceForm.lat) || 10.6585
    const lng = parseFloat(deviceForm.lng) || 77.0125
    const id = `asset-${Date.now()}`

    let newFeature = null

    if (deviceForm.type === 'borewell') {
      newFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          entity_type: 'resource',
          id,
          name: deviceForm.name || 'New Tube Well & Pump',
          resource_class: 'WATER',
          resource_type: 'borewell_pump',
          status: 'ACTIVE_RUNNING',
          verification_status: 'verified',
          pump_capacity_hp: deviceForm.pump_hp || '7.5 HP',
          depth_feet: parseInt(deviceForm.depth) || 420,
          flow_rate_lpm: parseInt(deviceForm.flow_rate) || 130,
          yesterday_runtime_hours: parseFloat(deviceForm.yesterday_hours) || 4.0,
          yesterday_water_pumped_liters: parseInt(deviceForm.yesterday_liters) || 31200,
          power_source: 'Solar + 3-Phase Grid',
          notes: 'Added via Admin Land & Device Editor.',
        },
      }
    } else if (deviceForm.type === 'cctv') {
      newFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          entity_type: 'device',
          id,
          device_name: deviceForm.name || 'CCTV Security Camera',
          device_type: 'cctv_camera',
          status: 'ONLINE',
          camera_model: deviceForm.camera_model || 'V2V Solar PTZ 4K UltraHD Sentinel',
          resolution: '3840 x 2160 (4K UHD)',
          live_feed_simulated: true,
          verification_status: 'verified',
        },
      }
    } else if (deviceForm.type === 'sensor') {
      newFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          entity_type: 'device',
          id,
          device_name: deviceForm.name || 'SoilSense Probe Node',
          device_type: 'soil_sensor',
          status: 'ONLINE',
          soil_moisture_15cm: '65%',
          soil_moisture_45cm: '70%',
          battery_level: '95%',
          verification_status: 'verified',
        },
      }
    }

    if (newFeature) {
      const updated = farmStorage.addFeatureToField(selectedFieldId, newFeature)
      setGeojson(updated)
      toast.success(`${deviceForm.name || 'Device'} placed on farmland successfully!`)
      setShowAddDeviceModal(false)
    }
  }

  // Delete Device
  const handleDeleteDevice = (deviceId) => {
    const updated = farmStorage.deleteFeatureFromField(selectedFieldId, deviceId)
    setGeojson(updated)
    toast.success('Device removed from field.')
  }

  // Open Add Device Modal
  const handleOpenAddDevice = () => {
    const defaultLat = boundaryPoints[0] ? boundaryPoints[0][0].toFixed(5) : '10.6585'
    const defaultLng = boundaryPoints[0] ? boundaryPoints[0][1].toFixed(5) : '77.0125'
    setDeviceForm(prev => ({
      ...prev,
      lat: defaultLat,
      lng: defaultLng,
    }))
    setShowAddDeviceModal(true)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen bg-v2v-softwhite overflow-hidden">
      {/* ── Top Header ── */}
      <div className="bg-white border-b border-v2v-lavendergray px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/admin/farmers" className="text-gray-400 hover:text-v2v-deep text-sm font-semibold transition-colors">
            ← Directory
          </Link>
          <span className="text-gray-300">|</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-v2v-deep">
                Land & Boundary Studio
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-v2v-deep font-bold border border-v2v-lavender/30">
                {currentFarmer?.full_name}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Khata: <span className="font-mono font-semibold text-gray-700">{currentFarmer?.khata_number}</span> · {currentFarmer?.address || 'Salem, Tamil Nadu'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Farmer Switcher Dropdown */}
          <div className="flex items-center gap-1.5 text-xs bg-v2v-softwhite border border-v2v-lavendergray px-2.5 py-1.5 rounded-lg">
            <span className="text-gray-400 font-medium">Farm:</span>
            <select
              value={selectedFieldId}
              onChange={(e) => {
                setSelectedFieldId(e.target.value)
                navigate(`/admin/editor/${e.target.value}`)
              }}
              className="bg-transparent font-bold text-v2v-deep focus:outline-none cursor-pointer text-xs"
            >
              {farmers.map((f) => (
                <option key={f.id} value={f.field_id}>
                  {f.full_name} ({f.total_acres} Ac · {f.district || f.village})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowScratchModal(true)}
            className="btn-v2v-gradient text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 hover-pop font-bold shadow-sm"
            title="Start Map From Scratch & Digitize Farmland & Sub-Plots"
          >
            <span>🗺️</span>
            <span>Digitize From Scratch</span>
          </button>

          <button
            onClick={handleOpenAddDevice}
            className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 hover-pop font-semibold"
          >
            <span>➕</span>
            <span>Add Device</span>
          </button>

          <button
            onClick={() => navigate('/farmer')}
            className="btn-outline text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 hover-pop font-bold"
          >
            <span>🚜</span>
            <span>Farmer View →</span>
          </button>
        </div>
      </div>

      {/* ── Sub-Bar: Mode Toggles & Live Metrics ── */}
      <div className="bg-white/95 backdrop-blur-md border-b border-v2v-lavendergray px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 flex-shrink-0">
        {/* Tab Controls: Boundary vs Devices */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('boundary')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'boundary'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>🗺️</span>
            <span>Interactive Boundary Editor</span>
            {hasUnsavedBoundary && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Unsaved Changes" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'devices'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-lavender/30'
                : 'bg-v2v-softwhite text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>📡</span>
            <span>Field Devices & Assets ({devices.length})</span>
          </button>
        </div>

        {/* Live Boundary Measurement Pills */}
        {activeTab === 'boundary' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-purple-50 border border-v2v-lavender/40 px-3 py-1 rounded-lg">
              <span className="text-gray-500">Points:</span>
              <strong className="text-v2v-deep font-mono font-bold text-xs">{boundaryPoints.length}</strong>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">Area:</span>
              <strong className="text-emerald-700 font-mono font-bold text-xs">
                {boundaryArea.acres} Acres
              </strong>
              <span className="text-gray-400 text-[11px]">({boundaryArea.hectares} Ha)</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">Perimeter:</span>
              <strong className="text-purple-900 font-mono text-xs">{boundaryPerimeter.meters} m</strong>
            </div>

            {hasUnsavedBoundary ? (
              <button
                onClick={handleSaveBoundary}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow animate-pulse hover-pop"
              >
                <span>💾</span>
                <span>Save Boundary</span>
              </button>
            ) : (
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span>✓</span> Boundary Synced
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Interactive Map (70% on desktop) */}
        <div className="flex-1 relative min-h-[350px] border-r border-v2v-lavendergray z-0 flex flex-col">
          {/* Floating Map Controls: Basemap Switcher & Quick Tool Instructions */}
          <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-2 pointer-events-auto">
            {/* Basemap Switcher Floating Widget */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-v2v-lavendergray p-1.5 flex items-center gap-1 text-xs">
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

            {/* In-Map Guide Banner */}
            {activeTab === 'boundary' && (
              <div className="bg-black/80 backdrop-blur-md text-white rounded-xl px-3 py-1.5 text-[11px] shadow-lg max-w-xs border border-white/10 flex items-center gap-2">
                {boundaryEditMode === 'click_draw' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>
                      <strong>Click to draw</strong>: Click on satellite map to place Point #{boundaryPoints.length + 1}.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span>
                      <strong>Drag any numbered pin</strong> to adjust corner. Click corner to remove.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Leaflet Map Canvas */}
          <div className="flex-1 w-full h-full relative">
            <MapContainer
              key={selectedFieldId}
              center={isValidLatLng(boundaryPoints[0]) ? boundaryPoints[0] : [10.6585, 77.0125]}
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
                  opacity={0.7}
                  maxZoom={19}
                />
              )}

              {/* Auto-fit bounds */}
              {geojson && <FitBounds geojson={geojson} focusCoords={boundaryPoints} />}

              {/* Map Click Event Handler */}
              <MapEventsController
                isDrawingBoundary={activeTab === 'boundary' && boundaryEditMode === 'click_draw'}
                isPickingDeviceLocation={isPickingDeviceLocation}
                onMapClick={handleMapClick}
              />

              {/* ── 1. Interactive Polygon & Line Preview ── */}
              {boundaryPoints.length >= 3 ? (
                <Polygon
                  positions={boundaryPoints}
                  pathOptions={{
                    color: '#8A57C0',
                    weight: 3.5,
                    dashArray: hasUnsavedBoundary ? '6, 6' : undefined,
                    fillColor: '#2E0D5E',
                    fillOpacity: 0.22,
                  }}
                  interactive={false} // Lets clicks pass straight through to map
                />
              ) : boundaryPoints.length === 2 ? (
                <Polyline
                  positions={boundaryPoints}
                  pathOptions={{
                    color: '#8A57C0',
                    weight: 3.5,
                    dashArray: '6, 6',
                  }}
                  interactive={false}
                />
              ) : null}

              {/* ── 2. Interactive Draggable Vertex Markers (Pins) ── */}
              {activeTab === 'boundary' &&
                boundaryPoints.map((pt, idx) => {
                  if (!isValidLatLng(pt)) return null
                  const isStart = idx === 0
                  const isHovered = hoveredVertexIdx === idx
                  const icon = createVertexIcon(idx + 1, isStart, isHovered)

                  return (
                    <Marker
                      key={`vertex-pt-${idx}`}
                      position={pt}
                      icon={icon}
                      draggable={true}
                      eventHandlers={{
                        drag: (e) => handleVertexDrag(idx, e),
                        dragend: (e) => handleVertexDrag(idx, e),
                        mouseover: () => setHoveredVertexIdx(idx),
                        mouseout: () => setHoveredVertexIdx(null),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                        <div className="text-xs font-semibold">
                          <span>Corner #{idx + 1}</span>
                          {isStart && <span className="ml-1 text-emerald-600 font-bold">(Starting Pin)</span>}
                          <div className="text-[10px] text-gray-500 font-mono">
                            {pt[0].toFixed(5)}° N, {pt[1].toFixed(5)}° E
                          </div>
                          <div className="text-[9px] text-purple-600 mt-0.5">Drag to move · Click for actions</div>
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-1 space-y-1.5 text-xs">
                          <strong className="text-v2v-deep block">Corner Point #{idx + 1}</strong>
                          <div className="font-mono text-[11px] text-gray-600 bg-gray-50 p-1 rounded border">
                            Lat: {pt[0].toFixed(6)}<br />
                            Lng: {pt[1].toFixed(6)}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleDeleteVertex(idx)}
                              className="px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold"
                            >
                              🗑️ Delete this Corner
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

              {/* ── 3. Custom Lines, Pipelines & Roads ── */}
              {lines.map((pipe, idx) => {
                const p = pipe.properties || {}
                const coords = pipe.geometry?.coordinates || []
                if (coords.length < 2) return null
                const latLngs = coords.map(([lng, lat]) => [lat, lng])
                const strokeColor = p.color || (p.resource_type === 'internal_path' ? '#F59E0B' : '#0284C7')
                const strokeWidth = p.weight || 4
                const dash = p.dashArray || (p.line_style === 'dashed' ? '8, 8' : p.line_style === 'dotted' ? '3, 6' : undefined)

                return (
                  <Polyline
                    key={`line-${p.id || idx}`}
                    positions={latLngs}
                    pathOptions={{
                      color: strokeColor,
                      weight: strokeWidth,
                      dashArray: dash,
                      opacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 p-1">
                        <strong className="text-v2v-deep block">{p.name || 'Farmland Line'}</strong>
                        <div className="text-[10px] text-gray-500">📏 {p.length_meters || 120} m</div>
                        <button
                          onClick={() => handleDeleteDevice(p.id)}
                          className="text-rose-600 text-[10px] hover:underline block pt-1"
                        >
                          Delete Line
                        </button>
                      </div>
                    </Popup>
                  </Polyline>
                )
              })}

              {/* ── 4. Devices Markers ── */}
              {devices.map((f, i) => {
                const p = f.properties || {}
                const coords = f.geometry?.coordinates
                if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' || isNaN(coords[0]) || isNaN(coords[1])) {
                  return null
                }
                const [lng, lat] = coords
                let icon = createPinIcon('📍', '#3C1775')
                if (p.resource_type === 'borewell_pump') icon = createPinIcon('💧', '#059669')
                if (p.device_type === 'cctv_camera') icon = createPinIcon('📹', '#3C1775')
                if (p.device_type === 'soil_sensor') icon = createPinIcon('📡', '#5E4678')

                return (
                  <Marker key={`dev-${p.id || i}`} position={[lat, lng]} icon={icon}>
                    <Popup>
                      <div className="text-xs space-y-1 p-1">
                        <strong className="text-v2v-deep block">{p.name || p.device_name}</strong>
                        <div className="text-[10px] text-gray-500">{p.resource_type || p.device_type}</div>
                        <div className="text-emerald-600 font-bold">{p.status}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {lat.toFixed(5)}, {lng.toFixed(5)}
                        </div>
                        <button
                          onClick={() => handleDeleteDevice(p.id)}
                          className="text-rose-600 text-[10px] hover:underline block pt-1 font-bold"
                        >
                          Delete Device
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Interactive Editor & Tools Panel (30% width) */}
        <div className="w-full lg:w-96 bg-white flex flex-col border-t lg:border-t-0 lg:border-l border-v2v-lavendergray overflow-y-auto">
          {activeTab === 'boundary' ? (
            /* ── Boundary Studio Side Panel ── */
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-v2v-deep flex items-center justify-between">
                  <span>Farmland Boundary Studio</span>
                  <span className="text-[11px] font-normal text-gray-500 font-mono">
                    {currentFarmer?.khata_number}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Point-and-click or drag corners on the satellite map to define the exact field polygon.
                </p>
              </div>

              {/* Editing Mode Selector */}
              <div className="bg-v2v-softwhite p-2 rounded-xl border border-v2v-lavendergray space-y-2">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                  Select Editing Mode:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setBoundaryEditMode('edit_corners')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      boundaryEditMode === 'edit_corners'
                        ? 'bg-v2v-deep text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>✋ Drag Corners</span>
                    <span className="text-[10px] font-normal opacity-80">Move points on map</span>
                  </button>

                  <button
                    onClick={() => setBoundaryEditMode('click_draw')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      boundaryEditMode === 'click_draw'
                        ? 'bg-emerald-700 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>✏️ Click to Add</span>
                    <span className="text-[10px] font-normal opacity-80">Click points 1, 2, 3...</span>
                  </button>
                </div>
              </div>

              {/* Calculated Area & Land Overview Card */}
              <div className="bg-gradient-to-br from-purple-900 via-v2v-deep to-purple-950 text-white p-4 rounded-xl shadow-md space-y-2">
                <span className="text-[11px] text-purple-200 uppercase font-bold tracking-wider">
                  Live Calculated Farmland Size
                </span>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {boundaryArea.acres}
                    </span>
                    <span className="text-sm font-semibold text-purple-200 ml-1">Acres</span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm text-emerald-300 font-bold">{boundaryArea.hectares} Ha</div>
                    <div className="text-[10px] text-purple-300">{boundaryArea.sqMeters.toLocaleString()} m²</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-200">
                  <span>Perimeter: <strong>{boundaryPerimeter.meters} m</strong> ({boundaryPerimeter.feet} ft)</span>
                  <span><strong>{boundaryPoints.length}</strong> Corners</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSaveBoundary}
                  disabled={boundaryPoints.length < 3}
                  className="w-full btn-v2v-gradient py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover-pop disabled:opacity-50"
                >
                  <span>💾</span>
                  <span>Save Boundary & Update Farm Size</span>
                </button>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={handleUndoPoint}
                    disabled={boundaryPoints.length === 0}
                    className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold text-xs disabled:opacity-40"
                  >
                    ↩️ Undo
                  </button>
                  <button
                    onClick={handleResetBoundary}
                    disabled={!hasUnsavedBoundary}
                    className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold text-xs disabled:opacity-40"
                  >
                    🔄 Reset
                  </button>
                  <button
                    onClick={handleClearBoundary}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-semibold text-xs"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>

              {/* Vertices List & Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    Corner Points ({boundaryPoints.length})
                  </span>
                  <button
                    onClick={() => setShowJsonModal(!showJsonModal)}
                    className="text-[11px] text-v2v-deep hover:underline"
                  >
                    {showJsonModal ? 'Hide JSON' : 'Advanced JSON'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {boundaryPoints.map((pt, i) => (
                    <div
                      key={`pt-row-${i}`}
                      onMouseEnter={() => setHoveredVertexIdx(i)}
                      onMouseLeave={() => setHoveredVertexIdx(null)}
                      className={`p-2 rounded-lg border flex items-center justify-between transition-colors ${
                        hoveredVertexIdx === i
                          ? 'bg-purple-50 border-v2v-lavender'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-v2v-deep text-white text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div className="font-mono text-[11px] leading-tight text-gray-700">
                          <div>Lat: {pt[0].toFixed(5)}°</div>
                          <div className="text-gray-400">Lng: {pt[1].toFixed(5)}°</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteVertex(i)}
                        className="text-gray-400 hover:text-rose-600 p-1 text-sm font-bold"
                        title="Delete Corner"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {boundaryPoints.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed">
                      No points placed yet.<br />
                      Click on the satellite map to add Point #1.
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible JSON Coordinates Area */}
              {showJsonModal && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 animate-slide-up">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Raw Coordinates Array ([lng, lat])
                  </label>
                  <textarea
                    rows={6}
                    readOnly
                    value={JSON.stringify(boundaryPoints.map(([lat, lng]) => [lng, lat]), null, 2)}
                    className="w-full font-mono text-[10px] bg-white border border-gray-300 rounded p-1.5 leading-tight"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(boundaryPoints.map(([lat, lng]) => [lng, lat]))
                      )
                      toast.success('Copied coordinates to clipboard!')
                    }}
                    className="text-[10px] text-v2v-deep font-bold hover:underline block"
                  >
                    📋 Copy Coordinates JSON
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Devices & Hardware Side Panel ── */
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-v2v-deep flex items-center justify-between">
                  <span>Farm Devices & Infrastructure</span>
                  <span className="text-xs bg-purple-100 text-v2v-deep px-2 py-0.5 rounded-full font-bold">
                    {devices.length} Active
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Solar borewells, CCTV security cameras, and multi-depth soil probes.
                </p>
              </div>

              <button
                onClick={handleOpenAddDevice}
                className="w-full btn-v2v-gradient py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow hover-pop"
              >
                <span>➕</span>
                <span>Add New Device to Field</span>
              </button>

              <div className="space-y-2 text-xs">
                {devices.map((f, i) => {
                  const p = f.properties || {}
                  const isWater = p.resource_type === 'borewell_pump'
                  const isCamera = p.device_type === 'cctv_camera'

                  return (
                    <div
                      key={`dev-card-${p.id || i}`}
                      className="p-3 bg-white border border-v2v-lavendergray rounded-xl shadow-sm space-y-1.5 card-interactive"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-v2v-deep flex items-center gap-1.5">
                          <span>{isWater ? '💧' : isCamera ? '📹' : '📡'}</span>
                          <span>{p.name || p.device_name}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 font-mono">
                        GPS: {f.geometry?.coordinates?.[1]?.toFixed(5)}° N, {f.geometry?.coordinates?.[0]?.toFixed(5)}° E
                      </div>

                      {isWater && (
                        <div className="text-[11px] text-gray-600">
                          Capacity: {p.pump_capacity_hp} · Depth: {p.depth_feet} ft · Flow: {p.flow_rate_lpm} L/min
                        </div>
                      )}

                      {isCamera && (
                        <div className="text-[11px] text-gray-600">
                          {p.camera_model} · {p.resolution}
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-1 border-t border-gray-100">
                        <button
                          onClick={() => handleDeleteDevice(p.id)}
                          className="text-rose-600 text-[11px] hover:underline font-bold"
                        >
                          Remove Asset
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Device Modal ── */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-v2v-lavendergray animate-slide-up">
            <div className="bg-v2v-gradient px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Device / Asset to Land</h3>
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="p-5 space-y-3 text-xs">
              <div>
                <label className="label">Device / Asset Type</label>
                <select
                  value={deviceForm.type}
                  onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                  className="input-field"
                >
                  <option value="borewell">💧 Borewell & Submersible Pump</option>
                  <option value="cctv">📹 4K Solar PTZ CCTV Camera</option>
                  <option value="sensor">📡 IoT Multi-Depth Soil Sensor</option>
                </select>
              </div>

              <div>
                <label className="label">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Plot Solar Borewell #2"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Coordinates Pick Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label m-0">Location Coordinates</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDeviceModal(false)
                      setIsPickingDeviceLocation(true)
                      toast.info('👉 Click anywhere on the satellite map to pinpoint device location!')
                    }}
                    className="text-[11px] text-v2v-deep font-bold hover:underline flex items-center gap-1"
                  >
                    <span>📍</span>
                    <span>Pick on Map</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Latitude"
                    value={deviceForm.lat}
                    onChange={(e) => setDeviceForm({ ...deviceForm, lat: e.target.value })}
                    className="input-field font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Longitude"
                    value={deviceForm.lng}
                    onChange={(e) => setDeviceForm({ ...deviceForm, lng: e.target.value })}
                    className="input-field font-mono"
                  />
                </div>
              </div>

              {deviceForm.type === 'borewell' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Pump Motor Capacity</label>
                    <input
                      type="text"
                      placeholder="7.5 HP"
                      value={deviceForm.pump_hp}
                      onChange={(e) => setDeviceForm({ ...deviceForm, pump_hp: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Depth (Feet)</label>
                    <input
                      type="number"
                      placeholder="420"
                      value={deviceForm.depth}
                      onChange={(e) => setDeviceForm({ ...deviceForm, depth: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {deviceForm.type === 'cctv' && (
                <div>
                  <label className="label">Camera Model</label>
                  <input
                    type="text"
                    placeholder="V2V Solar PTZ 4K UltraHD Sentinel"
                    value={deviceForm.camera_model}
                    onChange={(e) => setDeviceForm({ ...deviceForm, camera_model: e.target.value })}
                    className="input-field"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-v2v-gradient py-2 px-4 rounded-xl font-bold shadow hover-pop"
                >
                  Place Device on Farmland
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Scratch Map Digitizer & Sub-Field Studio Modal ── */}
      <ScratchMapDigitizerModal
        isOpen={showScratchModal}
        onClose={() => setShowScratchModal(false)}
        onSaved={(newFarmer) => {
          const fList = farmStorage.getFarmers()
          setFarmers(fList)
          setSelectedFieldId(newFarmer.field_id)
          const gj = farmStorage.getFieldGeoJSON(newFarmer.field_id)
          setGeojson(gj)
          navigate(`/admin/editor/${newFarmer.field_id}`)
        }}
        onCreatedFarmer={(newFarmer) => {
          const fList = farmStorage.getFarmers()
          setFarmers(fList)
          setSelectedFieldId(newFarmer.field_id)
          const gj = farmStorage.getFieldGeoJSON(newFarmer.field_id)
          setGeojson(gj)
          navigate(`/admin/editor/${newFarmer.field_id}`)
        }}
      />
    </div>
  )
}
