/**
 * SurveyEntryPanel — mobile-responsive side panel for surveyors.
 * Tabs: Resource | Reference Point | Observation | Photo
 */
import React, { useState, useRef } from 'react'
import api from '../../lib/api'
import toast from '../ui/Toast'

const TABS = ['Resource', 'Zone', 'Ref Point', 'Observation', 'Photo']

export default function SurveyEntryPanel({ fieldId, field, onClose, onSaved }) {
  const [tab, setTab] = useState(0)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Survey Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === i ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 0 && <ResourceForm fieldId={fieldId} field={field} onSaved={onSaved} />}
          {tab === 1 && <ZoneForm fieldId={fieldId} onSaved={onSaved} />}
          {tab === 2 && <RefPointForm fieldId={fieldId} field={field} onSaved={onSaved} />}
          {tab === 3 && <ObservationForm fieldId={fieldId} field={field} onSaved={onSaved} />}
          {tab === 4 && <PhotoUploadForm fieldId={fieldId} onSaved={onSaved} />}
        </div>
      </div>
    </>
  )
}

// ── Zone form ──────────────────────────────────────────────────────────────
function ZoneForm({ fieldId, onSaved }) {
  const [form, setForm] = useState({ name: '', zone_type: 'soil_type', description: '', boundary: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let boundary
      try {
        boundary = JSON.parse(form.boundary)
      } catch {
        throw new Error('Boundary must be valid GeoJSON.')
      }
      if (boundary.type !== 'Polygon') {
        throw new Error('Zone boundary type must be "Polygon".')
      }
      await api.post('/zones/', {
        field_id: fieldId,
        name: form.name,
        zone_type: form.zone_type,
        description: form.description || undefined,
        boundary,
      })
      toast.success('Zone saved!')
      onSaved()
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.message ?? 'Save failed'
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setLoading(false)
    }
  }

  const example = JSON.stringify({
    type: 'Polygon',
    coordinates: [[[80.2709, 13.0829], [80.2715, 13.0829], [80.2715, 13.0835], [80.2709, 13.0835], [80.2709, 13.0829]]],
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div>
        <label className="label">Zone name *</label>
        <input required className="input-field" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Zone type *</label>
        <input required className="input-field" placeholder="soil_type, irrigation, crop_area…" value={form.zone_type}
          onChange={e => setForm(f => ({ ...f, zone_type: e.target.value }))} />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input-field" value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div>
        <label className="label">Boundary GeoJSON (Polygon) *</label>
        <textarea required rows={5} className="input-field resize-none font-mono text-xs" placeholder={example}
          value={form.boundary} onChange={e => setForm(f => ({ ...f, boundary: e.target.value }))} />
        <p className="mt-1 text-xs text-gray-400">The zone must sit entirely within the field boundary.</p>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving…' : 'Save Zone'}
      </button>
    </form>
  )
}

// ── Shared point input helper ────────────────────────────────────────────────
function PointInputs({ lat, lng, setLat, setLng }) {
  const tryGPS = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)) },
      () => toast.warning('Geolocation not available')
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Latitude</label>
        <input type="number" step="any" className="input-field" value={lat}
          onChange={e => setLat(e.target.value)} placeholder="13.0827" />
      </div>
      <div>
        <label className="label">Longitude</label>
        <div className="flex gap-1">
          <input type="number" step="any" className="input-field" value={lng}
            onChange={e => setLng(e.target.value)} placeholder="80.2707" />
          <button type="button" onClick={tryGPS} title="Use GPS"
            className="px-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200">
            📍
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resource form ────────────────────────────────────────────────────────────
function ResourceForm({ fieldId, field, onSaved }) {
  const [form, setForm] = useState({
    name: '', resource_class: 'WATER', resource_type: 'borehole', status: 'NEEDS_VERIFICATION',
  })
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!lat || !lng) { toast.error('Location required'); return }
    setLoading(true)
    try {
      await api.post('/resources/', {
        ...form,
        attributes: {},
        project_id: field?.project_id,
        field_id: fieldId,
        geom: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      })
      toast.success('Resource saved!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input required className="input-field" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Class *</label>
        <select className="input-field" value={form.resource_class}
          onChange={e => setForm(f => ({ ...f, resource_class: e.target.value }))}>
          {['WATER','POWER','IRRIGATION','STRUCTURE','OTHER'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Type *</label>
        <input required className="input-field" placeholder="borehole, solar_panel, drip_line…"
          value={form.resource_type}
          onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))} />
      </div>
      <PointInputs lat={lat} lng={lng} setLat={setLat} setLng={setLng} />
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving…' : 'Save Resource'}
      </button>
    </form>
  )
}

// ── Reference Point form ─────────────────────────────────────────────────────
function RefPointForm({ fieldId, field, onSaved }) {
  const [form, setForm] = useState({
    name: '', marker_type: 'concrete_monument',
    elevation_meters: '', horizontal_accuracy_meters: '', description: '',
  })
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!lat || !lng) { toast.error('Location required'); return }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        marker_type: form.marker_type,
        description: form.description || undefined,
        elevation_meters: form.elevation_meters ? parseFloat(form.elevation_meters) : undefined,
        horizontal_accuracy_meters: form.horizontal_accuracy_meters
          ? parseFloat(form.horizontal_accuracy_meters) : undefined,
        project_id: field?.project_id,
        field_id: fieldId,
        geom: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      }
      await api.post('/reference-points/', payload)
      toast.success('Reference point saved!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name *</label>
        <input required className="input-field" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="label">Marker type *</label>
        <select className="input-field" value={form.marker_type}
          onChange={e => setForm(f => ({ ...f, marker_type: e.target.value }))}>
          {['concrete_monument','rebar','brass_cap','temporary'].map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Elevation (m)</label>
          <input type="number" step="0.01" className="input-field" value={form.elevation_meters}
            onChange={e => setForm(f => ({ ...f, elevation_meters: e.target.value }))} />
        </div>
        <div>
          <label className="label">H-accuracy (m)</label>
          <input type="number" step="0.001" className="input-field" value={form.horizontal_accuracy_meters}
            onChange={e => setForm(f => ({ ...f, horizontal_accuracy_meters: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input-field" value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <PointInputs lat={lat} lng={lng} setLat={setLat} setLng={setLng} />
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving…' : 'Save Reference Point'}
      </button>
    </form>
  )
}

// ── Observation form ─────────────────────────────────────────────────────────
function ObservationForm({ fieldId, field, onSaved }) {
  const [form, setForm] = useState({ category: 'general', notes: '' })
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        category: form.category,
        notes: form.notes,
        project_id: field?.project_id,
        field_id: fieldId,
        geom: lat && lng
          ? { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }
          : undefined,
      }
      await api.post('/observations/', payload)
      toast.success('Observation saved!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Category *</label>
        <select className="input-field" value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {['soil_health','crop_growth','pest_weed_infestation','damage','general'].map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Notes *</label>
        <textarea required rows={4} className="input-field resize-none" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <PointInputs lat={lat} lng={lng} setLat={setLat} setLng={setLng} />
      <p className="text-xs text-gray-400">Location is optional for observations.</p>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving…' : 'Save Observation'}
      </button>
    </form>
  )
}

// ── Photo upload form ─────────────────────────────────────────────────────────
function PhotoUploadForm({ fieldId, onSaved }) {
  const [file, setFile]           = useState(null)
  const [description, setDesc]    = useState('')
  const [loading, setLoading]     = useState(false)
  const [preview, setPreview]     = useState(null)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg','image/png'].includes(f.type)) {
      toast.error('Only JPEG/PNG allowed'); return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit'); return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Select a photo first'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (fieldId) fd.append('field_id', fieldId)
      if (description) fd.append('description', description)
      await api.post('/photos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Photo uploaded!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {preview && (
        <img src={preview} alt="preview" className="w-full rounded-lg object-cover max-h-48" />
      )}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-3xl mb-2">📷</div>
        <p className="text-sm text-gray-500">
          {file ? file.name : 'Click to select JPEG/PNG (max 10MB)'}
        </p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input-field" value={description}
          onChange={e => setDesc(e.target.value)} placeholder="What does this photo show?" />
      </div>
      <button type="submit" disabled={loading || !file} className="btn-primary w-full">
        {loading ? 'Uploading…' : 'Upload Photo'}
      </button>
    </form>
  )
}
