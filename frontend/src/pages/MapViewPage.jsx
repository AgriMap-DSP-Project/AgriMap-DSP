/**
 * MapViewPage — Interactive satellite map for a single field.
 *
 * Loads: GET /export/field/{id}/geojson → full FeatureCollection
 * Renders: Field (MultiPolygon), Zones (Polygon), Resources/RefPoints/Obs/Photos (Point)
 * Layer toggles per asset type.
 * Verifier: opens VerificationDrawer on click.
 * Surveyor: survey entry forms for resources, reference points, observations, photos.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapContainer, TileLayer, GeoJSON, Marker, Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import VerificationDrawer from '../components/verification/VerificationDrawer'
import SurveyEntryPanel from '../components/survey/SurveyEntryPanel'
import AIInsightsPanel from '../components/ai/AIInsightsPanel'
import toast from '../components/ui/Toast'

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
})

// Custom coloured icons
const makeIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

const ICONS = {
  WATER:     makeIcon('blue'),
  POWER:     makeIcon('yellow'),
  IRRIGATION:makeIcon('green'),
  STRUCTURE: makeIcon('orange'),
  OTHER:     makeIcon('grey'),
  reference_point: makeIcon('red'),
  observation:     makeIcon('violet'),
  photo:           makeIcon('gold'),
  device:          makeIcon('black'),
}

const LAYER_DEFAULTS = {
  field: true, zones: true, resources: true,
  reference_points: true, observations: true,
  photos: true, devices: true,
}

// Helper: prefer backend's `entity_type`, fall back to legacy `feature_type`
const getEntityType = (feature) => (
  feature?.properties?.entity_type ?? feature?.properties?.feature_type ?? null
)

const RESOURCE_COLOR = {
  water: '#2563eb', power: '#facc15', irrigation: '#10b981', structure: '#f97316', other: '#6b7280'
}

function FitBounds({ geojson }) {
  const map = useMap()
  useEffect(() => {
    if (!geojson) return
    try {
      const layer = L.geoJSON(geojson)
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
    } catch { /* ignore */ }
  }, [geojson, map])
  return null
}

export default function MapViewPage() {
  const { fieldId } = useParams()
  const { user } = useAuth()

  const [geojson, setGeojson]       = useState(null)
  const [field, setField]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [layers, setLayers]         = useState(LAYER_DEFAULTS)
  const [verifyTarget, setVerifyTarget] = useState(null)
  const [showSurvey, setShowSurvey] = useState(false)
  const [showAI, setShowAI]         = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [gj, fd] = await Promise.all([
        api.get(`/export/field/${fieldId}/geojson`),
        api.get(`/fields/${fieldId}`),
      ])
      setGeojson(gj.data)
      setField(fd.data)
      setFetchError(null)
    } catch (e) {
      console.warn('Backend offline, loading farm GeoJSON from local storage:', e.message)
      const { farmStorage } = await import('../lib/farmStorage')
      const localGj = farmStorage.getFieldGeoJSON(fieldId)
      setGeojson(localGj)
      const fieldFeat = localGj.features?.find(f => f.properties?.entity_type === 'field')?.properties
      setField(fieldFeat || { id: fieldId, name: 'Smart Farmland' })
      setFetchError(null)
    } finally {
      setLoading(false)
    }
  }, [fieldId])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleLayer = (key) =>
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))

  // Separate features by type
  const fieldFeatures      = geojson?.features?.filter(f => getEntityType(f) === 'field') ?? []
  const zoneFeatures       = geojson?.features?.filter(f => getEntityType(f) === 'zone') ?? []
  const resourceFeatures   = geojson?.features?.filter(f => getEntityType(f) === 'resource') ?? []
  const refPointFeatures   = geojson?.features?.filter(f => getEntityType(f) === 'reference_point') ?? []
  const obsFeatures        = geojson?.features?.filter(f => getEntityType(f) === 'observation') ?? []
  const photoFeatures      = geojson?.features?.filter(f => getEntityType(f) === 'photo') ?? []
  const deviceFeatures     = geojson?.features?.filter(f => getEntityType(f) === 'device') ?? []

  const handleFeatureClick = (feature) => {
    if (!feature?.properties) return
    const entityType = getEntityType(feature)
    const props = { ...(feature.properties || {}) }
    if ((user?.role === 'verifier' || user?.role === 'admin') && props.verification_status === 'pending') {
      const typeMap = {
        field: 'fields', zone: 'zones', resource: 'resources',
        reference_point: 'reference_points', observation: 'observations',
      }
      const rType = typeMap[entityType]
      if (rType) {
        setVerifyTarget({ type: rType, item: { id: props.id, name: props.name ?? props.category, ...props } })
      }
    }
  }

  const styleForStatus = (status) => {
    if (status === 'verified') return { color: '#16a34a', weight: 2 }
    if (status === 'rejected') return { color: '#dc2626', weight: 2 }
    return { color: '#d97706', weight: 2, dashArray: '4' }
  }

  const pointToMarker = (features, iconKey) =>
    features
      .filter(f => f.geometry?.type === 'Point' && Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length >= 2 && !isNaN(f.geometry.coordinates[0]) && !isNaN(f.geometry.coordinates[1]))
      .map(f => {
        const [lng, lat] = f.geometry.coordinates
        const p = f.properties ?? {}
        const icon = ICONS[iconKey] ?? ICONS.OTHER
        return { lat, lng, p, icon, feature: f }
      })

  // Split resource features by geometry
  const resourcePointFeatures = resourceFeatures.filter(f => f.geometry?.type === 'Point')
  const resourceLineFeatures = resourceFeatures.filter(f => f.geometry?.type === 'LineString')
  const resourcePolygonFeatures = resourceFeatures.filter(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')

  const resourceMarkers = resourcePointFeatures
    .filter(f => Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length >= 2 && !isNaN(f.geometry.coordinates[0]) && !isNaN(f.geometry.coordinates[1]))
    .map(f => {
      const [lng, lat] = f.geometry.coordinates
      const p = f.properties ?? {}
      return { lat, lng, p, icon: ICONS[p.resource_class] ?? ICONS.OTHER, feature: f }
    })

  return (
    <div className="flex flex-col h-dvh">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0 overflow-x-auto">
        <Link to={field?.project_id ? `/projects/${field.project_id}` : '/dashboard'}
          className="text-sm text-gray-500 hover:text-brand-600 flex-shrink-0">
          ← Back
        </Link>
        <span className="text-sm font-medium text-gray-900 flex-shrink-0 truncate max-w-xs">
          {field?.name ?? 'Loading…'}
        </span>
        <div className="flex-1" />

        {/* Layer toggles */}
        {(() => {
          const counts = {
            field: fieldFeatures.length,
            zones: zoneFeatures.length,
            resources: resourceFeatures.length,
            reference_points: refPointFeatures.length,
            observations: obsFeatures.length,
            photos: photoFeatures.length,
            devices: deviceFeatures.length,
          }
          return Object.entries(layers).map(([key, on]) => {
            const empty = counts[key] === 0
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium flex-shrink-0 transition-colors
                  ${on ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {key}{empty ? ' (no data)' : ''}
              </button>
            )
          })
        })()}

        <div className="flex gap-2 flex-shrink-0">
          {(user?.role === 'admin' || user?.role === 'verifier') && (
            <button onClick={() => setShowSurvey(true)} className="btn-primary text-xs py-1.5 px-3">
              + Survey
            </button>
          )}
          <button onClick={() => setShowAI(true)} className="btn-secondary text-xs py-1.5 px-3">
            🤖 AI
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {fetchError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
            <div className="text-center">
              <div className="text-red-600 mb-3">Failed to load map data.</div>
              <button className="btn-secondary" onClick={fetchData}>Retry</button>
            </div>
          </div>
        )}
        <MapContainer
          center={[20, 78]}
          zoom={5}
          className="w-full h-full"
        >
          {/* Satellite base layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            maxZoom={19}
          />
          {/* Labels overlay */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            opacity={0.4}
          />

          {geojson && <FitBounds geojson={geojson} />}

          {/* Field boundary */}
          {layers.field && fieldFeatures.map((f, i) => (
            <GeoJSON
              key={`field-${i}`}
              data={f}
              style={{ ...styleForStatus(f.properties?.verification_status), fillColor: '#16a34a', fillOpacity: 0.08 }}
              onEachFeature={(feat, layer) => {
                const p = feat.properties ?? {}
                layer.bindPopup(`
                  <b>${p.name ?? 'Field'}</b><br/>
                  Area: ${p.calculated_area_hectares ?? '?'} ha<br/>
                  Status: ${p.verification_status}
                `)
                layer.on('click', () => handleFeatureClick(feat))
              }}
            />
          ))}

          {/* Zones */}
          {layers.zones && zoneFeatures.map((f, i) => (
            <GeoJSON
              key={`zone-${i}`}
              data={f}
              style={{ ...styleForStatus(f.properties?.verification_status), fillColor: '#2563eb', fillOpacity: 0.12, weight: 1.5 }}
              onEachFeature={(feat, layer) => {
                const p = feat.properties ?? {}
                layer.bindPopup(`<b>${p.name}</b><br/>Type: ${p.zone_type}<br/>Status: ${p.verification_status}`)
                layer.on('click', () => handleFeatureClick(feat))
              }}
            />
          ))}

          {/* Resources */}
          {layers.resources && resourceMarkers.map(({ lat, lng, p, icon }, i) => (
            <Marker key={`res-${i}`} position={[lat, lng]} icon={icon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{p.name ?? 'Resource'}</p>
                  <p>{p.resource_class ?? 'Unknown class'} / {p.resource_type ?? 'Not specified'}</p>
                  <p>Status: {p.verification_status ?? 'unknown'}</p>
                  {(user?.role === 'verifier' || user?.role === 'admin') && p.verification_status === 'pending' && (
                    <button
                      className="mt-2 text-xs text-brand-600 hover:underline"
                      onClick={() => setVerifyTarget({ type: 'resources', item: { id: p.id, name: p.name, verification_status: p.verification_status } })}
                    >
                      Verify this resource →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Resource LineStrings (render as polylines) */}
          {layers.resources && resourceLineFeatures.map((f, i) => {
            const p = f.properties ?? {}
            const color = RESOURCE_COLOR[(p.resource_class || 'other')] ?? RESOURCE_COLOR.other
            return (
              <GeoJSON
                key={`res-line-${i}`}
                data={f}
                style={{ color, weight: 3 }}
                onEachFeature={(feat, layer) => {
                  const props = feat.properties ?? {}
                  layer.bindPopup(`<b>${props.name ?? 'Resource'}</b><br/>${props.resource_class ?? 'Unknown'} / ${props.resource_type ?? 'Not specified'}<br/>Status: ${props.verification_status ?? 'unknown'}`)
                  layer.on('click', () => handleFeatureClick(feat))
                }}
              />
            )
          })}

          {/* Resource Polygons (render as filled polygons) */}
          {layers.resources && resourcePolygonFeatures.map((f, i) => {
            const p = f.properties ?? {}
            const color = RESOURCE_COLOR[(p.resource_class || 'other')] ?? RESOURCE_COLOR.other
            return (
              <GeoJSON
                key={`res-poly-${i}`}
                data={f}
                style={{ color, fillColor: color, fillOpacity: 0.18, weight: 1.5 }}
                onEachFeature={(feat, layer) => {
                  const props = feat.properties ?? {}
                  layer.bindPopup(`<b>${props.name ?? 'Resource'}</b><br/>${props.resource_class ?? 'Unknown'} / ${props.resource_type ?? 'Not specified'}<br/>Status: ${props.verification_status ?? 'unknown'}`)
                  layer.on('click', () => handleFeatureClick(feat))
                }}
              />
            )
          })}

          {/* Reference Points */}
          {layers.reference_points && pointToMarker(refPointFeatures, 'reference_point').map(({ lat, lng, p }, i) => (
            <Marker key={`ref-${i}`} position={[lat, lng]} icon={ICONS.reference_point}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{p.name}</p>
                  <p>Marker: {p.marker_type}</p>
                  {p.elevation_meters && <p>Elev: {p.elevation_meters}m</p>}
                  <p>Status: {p.verification_status}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Observations */}
          {layers.observations && pointToMarker(obsFeatures, 'observation').map(({ lat, lng, p }, i) => (
            <Marker key={`obs-${i}`} position={[lat, lng]} icon={ICONS.observation}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold capitalize">{p.category?.replace(/_/g, ' ') ?? 'Observation'}</p>
                  <p>{p.notes ?? ''}</p>
                  <p className="text-gray-400">{p.observed_at ? new Date(p.observed_at).toLocaleDateString() : 'Date not recorded'}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Photos */}
          {layers.photos && pointToMarker(photoFeatures, 'photo').map(({ lat, lng, p }, i) => (
            <Marker key={`photo-${i}`} position={[lat, lng]} icon={ICONS.photo}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">Photo</p>
                  {p.description && <p>{p.description}</p>}
                  {p.id ? <PhotoDownloadButton photoId={p.id} /> : <p className="text-xs text-gray-400">No download available</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Devices */}
          {layers.devices && pointToMarker(deviceFeatures, 'device').map(({ lat, lng, p }, i) => (
            <Marker key={`dev-${i}`} position={[lat, lng]} icon={ICONS.device}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{p.device_name}</p>
                  <p>{p.device_type}</p>
                  <Link to={`/iot/${p.field_id ?? fieldId}`} className="text-brand-600 hover:underline text-xs">
                    View IoT data →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Panels */}
      {verifyTarget && (
        <VerificationDrawer
          resourceType={verifyTarget.type}
          item={verifyTarget.item}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => { setVerifyTarget(null); fetchData() }}
        />
      )}
      {showSurvey && (
        <SurveyEntryPanel
          fieldId={fieldId}
          field={field}
          onClose={() => setShowSurvey(false)}
          onSaved={() => { setShowSurvey(false); fetchData() }}
        />
      )}
      {showAI && (
        <AIInsightsPanel
          fieldId={fieldId}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  )
}

function PhotoDownloadButton({ photoId }) {
  const [downloading, setDownloading] = useState(false)
  if (!photoId) return null

  const download = async () => {
    setDownloading(true)
    try {
      const response = await api.get(`/photos/${photoId}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `photo-${photoId}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Photo download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button type="button" onClick={download} disabled={downloading}
      className="mt-2 text-xs text-brand-600 hover:underline disabled:opacity-50">
      {downloading ? 'Downloading…' : 'Download →'}
    </button>
  )
}
